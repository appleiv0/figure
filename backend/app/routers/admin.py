from fastapi import APIRouter, Query, HTTPException, Depends, Header, Request, Body
from fastapi.responses import JSONResponse
from datetime import datetime, timezone, timedelta
from typing import Optional
import re
import os
import string
import random

from app.repositories.session_repository import session_repository
from app.database.mongodb import get_users_collection, get_login_codes_collection
from app.models.admin_models import (
    SessionListResponse,
    SessionDetailResponse,
    SearchRequest,
    StatisticsResponse,
    DeleteResponse,
    CreditResponse,
    GenerateCodeRequest,
    GenerateCodeResponse,
    SetCreditRequest,
    MyCodesResponse,
    CodeItem,
)
from app.controllers import controller_figure
from app.controllers.controller_interpretation import generate_interpretation
import libcommon.config.status_error as status_error
from libcommon.routes import response, default_responses

KST = timezone(timedelta(hours=9))
DEFAULT_CREDITS = 10


ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "change-this-in-production")
if ADMIN_API_KEY == "change-this-in-production":
    print("WARNING: Using default admin API key. Set ADMIN_API_KEY environment variable for production.")


def _generate_counselor_admin_token(email: str) -> str:
    """Generate an HMAC token for counselor admin access."""
    import hmac, hashlib
    import app.config.app_config as CFG
    return hmac.new(
        CFG.SESSION_SECRET.encode(),
        f"admin:{email}".encode(),
        hashlib.sha256
    ).hexdigest()


def _verify_counselor_admin_token(email: str, token: str) -> bool:
    """Verify a counselor admin token."""
    import hmac
    expected = _generate_counselor_admin_token(email)
    return hmac.compare_digest(expected, token)


async def verify_admin_key(
    request: Request,
    x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key"),
    x_counselor_email: Optional[str] = Header(None, alias="X-Counselor-Email"),
    x_counselor_token: Optional[str] = Header(None, alias="X-Counselor-Token"),
):
    """Verify admin access via API key or counselor token."""
    if request.method == "OPTIONS":
        return None

    # Option 1: Static admin API key (for server-to-server)
    if x_admin_key and x_admin_key == ADMIN_API_KEY:
        return x_admin_key

    # Option 2: Counselor token (for frontend)
    if x_counselor_email and x_counselor_token:
        if _verify_counselor_admin_token(x_counselor_email, x_counselor_token):
            # Verify the counselor is a super user
            from app.database.mongodb import get_db
            db = get_db()
            settings = db["app_settings"].find_one({"key": "super_users"})
            super_users = settings.get("emails", []) if settings else []
            if x_counselor_email in super_users:
                return x_counselor_token
        raise HTTPException(status_code=401, detail="Invalid counselor token or not a super user")

    raise HTTPException(status_code=401, detail="Authentication required")


router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    responses=default_responses,
    dependencies=[Depends(verify_admin_key)]
)


def escape_regex(pattern: str) -> str:
    """Remove dangerous regex characters to prevent NoSQL injection"""
    return re.escape(pattern) if pattern else ""


def serialize_session(session: dict) -> dict:
    """Convert MongoDB document to JSON-serializable format"""
    if session is None:
        return None
    session = dict(session)  # shallow copy - 원본 mutation 방지

    # Convert ObjectId to string
    if "_id" in session:
        session["_id"] = str(session["_id"])

    # Convert datetime objects to ISO format strings (UTC → KST)
    for key in ["createdAt", "updatedAt", "_migrated_at"]:
        if key in session and isinstance(session[key], datetime):
            dt = session[key]
            if dt.tzinfo is None:
                # MongoDB returns UTC without tzinfo - convert to KST
                dt = dt.replace(tzinfo=timezone.utc).astimezone(KST)
            session[key] = dt.isoformat()

    # Handle chatHistory timestamps
    if "chatHistory" in session:
        for entry in session["chatHistory"]:
            if "timestamp" in entry and isinstance(entry["timestamp"], datetime):
                dt = entry["timestamp"]
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc).astimezone(KST)
                entry["timestamp"] = dt.isoformat()

    return session


@router.get(
    "/sessions",
    description="Get paginated list of therapy sessions",
    response_class=JSONResponse,
    response_model=SessionListResponse,
)
def get_sessions(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("createdAt", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)")
):
    """Get all sessions with pagination"""
    skip = (page - 1) * limit
    order = -1 if sort_order == "desc" else 1

    sessions = session_repository.find_all(skip=skip, limit=limit, sort_by=sort_by, sort_order=order)
    total = session_repository.count_all()

    # Serialize sessions
    serialized = [serialize_session(s) for s in sessions]

    return SessionListResponse(
        sessions=serialized,
        total=total,
        page=page,
        limit=limit,
        totalPages=(total + limit - 1) // limit
    )


@router.get(
    "/sessions/my",
    description="Get paginated list of sessions filtered by counselor email",
    response_class=JSONResponse,
    response_model=SessionListResponse,
)
def get_my_sessions(
    email: str = Query(..., description="Counselor email to filter by"),
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(20, ge=1, le=100, description="Items per page"),
    sort_by: str = Query("createdAt", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)")
):
    """Get sessions filtered by counselorEmail"""
    from app.database.mongodb import get_sessions_collection
    skip = (page - 1) * limit
    order = -1 if sort_order == "desc" else 1

    collection = get_sessions_collection()
    query = {"counselorEmail": email}

    sessions = list(
        collection.find(query)
        .sort(sort_by, order)
        .skip(skip)
        .limit(limit)
    )
    total = collection.count_documents(query)

    serialized = [serialize_session(s) for s in sessions]

    return SessionListResponse(
        sessions=serialized,
        total=total,
        page=page,
        limit=limit,
        totalPages=(total + limit - 1) // limit
    )


@router.get(
    "/sessions/{receipt_no}",
    description="Get session detail by receipt number",
    response_class=JSONResponse,
    response_model=SessionDetailResponse,
)
def get_session_detail(receipt_no: str):
    """Get a specific session by receipt number"""
    session = session_repository.find_by_receipt_no(receipt_no)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return SessionDetailResponse(session=serialize_session(session))


@router.post(
    "/sessions/search",
    description="Search sessions with filters",
    response_class=JSONResponse,
    response_model=SessionListResponse,
)
def search_sessions(
    req: SearchRequest,
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100)
):
    """Search sessions with various filters"""
    skip = (page - 1) * limit
    query = {}

    # Build query based on filters
    if req.kidName:
        query["kid.name"] = {"$regex": escape_regex(req.kidName), "$options": "i"}

    if req.organization:
        query["counselor.organization"] = {"$regex": escape_regex(req.organization), "$options": "i"}

    if req.status:
        query["status"] = req.status

    if req.startDate or req.endDate:
        date_query = {}
        if req.startDate:
            try:
                date_query["$gte"] = datetime.strptime(req.startDate, "%Y-%m-%d")
            except ValueError:
                pass
        if req.endDate:
            try:
                date_query["$lte"] = datetime.strptime(req.endDate, "%Y-%m-%d")
            except ValueError:
                pass
        if date_query:
            query["createdAt"] = date_query

    sessions = session_repository.search(query, skip=skip, limit=limit)

    # Count total matching documents
    from app.database.mongodb import get_sessions_collection
    total = get_sessions_collection().count_documents(query)

    serialized = [serialize_session(s) for s in sessions]

    return SessionListResponse(
        sessions=serialized,
        total=total,
        page=page,
        limit=limit,
        totalPages=(total + limit - 1) // limit
    )


@router.get(
    "/statistics",
    description="Get aggregate statistics",
    response_class=JSONResponse,
    response_model=StatisticsResponse,
)
def get_statistics(year: int = Query(default=None, description="Year for monthly stats")):
    """Get various statistics about therapy sessions"""
    if year is None:
        year = datetime.now().year

    # Get basic stats
    stats = session_repository.get_statistics()

    # Get counts
    total = session_repository.count_all()
    from app.database.mongodb import get_sessions_collection
    completed = get_sessions_collection().count_documents({"status": "completed"})
    in_progress = total - completed

    # Get score distribution
    score_dist = session_repository.get_score_distribution()

    # Get monthly stats
    monthly = session_repository.get_monthly_stats(year)

    return StatisticsResponse(
        totalSessions=total,
        completedSessions=completed,
        inProgressSessions=in_progress,
        avgScore=stats.get("avgScore"),
        maxScore=stats.get("maxScore"),
        minScore=stats.get("minScore"),
        scoreDistribution=score_dist,
        monthlyStats=monthly
    )


@router.delete(
    "/sessions/{receipt_no}",
    description="Delete a session by receipt number",
    response_class=JSONResponse,
    response_model=DeleteResponse,
)
def delete_session(receipt_no: str):
    """Delete a session"""
    # Check if exists
    session = session_repository.find_by_receipt_no(receipt_no)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Delete
    success = session_repository.delete_session(receipt_no)

    return DeleteResponse(
        success=success,
        message="Session deleted successfully" if success else "Failed to delete session"
    )


@router.post(
    "/sessions/{receipt_no}/regenerate-report",
    description="Regenerate report for a session",
    response_class=JSONResponse,
)
def regenerate_report(receipt_no: str):
    """Regenerate the report for a specific session"""
    session = session_repository.find_by_receipt_no(receipt_no)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    kid_name = session.get("kid", {}).get("name", "아동")
    receipt_no_int = int(receipt_no)

    try:
        status_err, ret = controller_figure.get_Report(kid_name, receipt_no_int)
        # Re-fetch updated session
        updated_session = session_repository.find_by_receipt_no(receipt_no)
        return {
            "success": True,
            "message": "보고서가 재생성되었습니다.",
            "report": updated_session.get("report", ""),
            "score": updated_session.get("score", 0)
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"보고서 재생성 실패: {str(e)}")


@router.put(
    "/sessions/{receipt_no}/evaluation",
    description="Save AI family evaluation text",
    response_class=JSONResponse,
)
def save_evaluation(receipt_no: str, body: dict = Body(...)):
    """Save the AI family evaluation text for a session"""
    session = session_repository.find_by_receipt_no(receipt_no)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    text = body.get("aiEvaluation", "")
    family_type = body.get("familyType", "")
    update_data = {"aiEvaluation": text}
    if family_type is not None:
        update_data["familyType"] = family_type
    # Mark evaluation as completed when admin saves familyType/aiEvaluation
    update_data["evaluationCompleted"] = True
    update_data["evaluationCompletedAt"] = datetime.now(KST)
    success = session_repository.update_session(receipt_no, update_data)
    return {
        "success": success,
        "message": "평가가 저장되었습니다." if success else "저장에 실패했습니다."
    }


@router.put(
    "/sessions/{receipt_no}/canvas",
    description="Save or regenerate canvas image for a session",
    response_class=JSONResponse,
)
def save_canvas_image(receipt_no: str, body: dict = Body(...)):
    """Save a canvas image (base64) for a session"""
    session = session_repository.find_by_receipt_no(receipt_no)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    canvas_image = body.get("canvasImage", "")
    if not canvas_image:
        raise HTTPException(status_code=400, detail="canvasImage is required")
    success = session_repository.update_canvas_image(receipt_no, canvas_image)
    return {"success": success, "message": "이미지가 저장되었습니다." if success else "저장에 실패했습니다."}


@router.post(
    "/sessions/{receipt_no}/interpretation",
    description="Generate AI clinical interpretation for a session",
    response_class=JSONResponse,
)
async def generate_session_interpretation(receipt_no: str, model: str = "claude"):
    """Generate AI interpretation using Claude or GPT API"""
    session = session_repository.find_by_receipt_no(receipt_no)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    interpretation = await generate_interpretation(session, model=model)
    if not interpretation:
        raise HTTPException(status_code=500, detail="AI 해석 생성에 실패했습니다")

    session_repository.update_session(receipt_no, {"aiInterpretation": interpretation})
    return {"interpretation": interpretation, "model": model}


@router.put(
    "/sessions/{receipt_no}/interpretation",
    description="Save therapist interpretation for a session",
    response_class=JSONResponse,
)
async def save_therapist_interpretation(receipt_no: str, body: dict = Body(...)):
    """Save therapist-written interpretation"""
    session = session_repository.find_by_receipt_no(receipt_no)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session_repository.update_session(receipt_no, {
        "therapistInterpretation": body.get("interpretation", "")
    })
    return {"success": True}


@router.get(
    "/sessions/{receipt_no}/interpretation",
    description="Get AI and therapist interpretations for a session",
    response_class=JSONResponse,
)
async def get_interpretation(receipt_no: str):
    """Get both AI and therapist interpretations"""
    session = session_repository.find_by_receipt_no(receipt_no)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return {
        "aiInterpretation": session.get("aiInterpretation"),
        "therapistInterpretation": session.get("therapistInterpretation")
    }


@router.get(
    "/users",
    description="Get user usage statistics (merged from sessions + users collection)",
    response_class=JSONResponse,
)
def get_user_usage():
    """Aggregate sessions by counselor email and merge with users collection"""
    from app.database.mongodb import get_sessions_collection
    sessions_col = get_sessions_collection()
    users_col = get_users_collection()

    # Step 1: aggregate sessions by counselorEmail
    pipeline = [
        {"$match": {"counselorEmail": {"$exists": True, "$ne": None}}},
        {"$group": {
            "_id": "$counselorEmail",
            "count": {"$sum": 1},
            "counselorName": {"$last": "$counselor.name"},
            "organization": {"$last": "$counselor.organization"},
            "lastUsed": {"$max": "$createdAt"},
        }},
    ]
    session_results = list(sessions_col.aggregate(pipeline))

    # Build a dict keyed by email from session aggregation
    session_map = {}
    for r in session_results:
        email = r["_id"]
        last_used = r.get("lastUsed")
        if hasattr(last_used, 'isoformat'):
            last_used = last_used.isoformat()
        session_map[email] = {
            "email": email,
            "name": r.get("counselorName") or "-",
            "organization": r.get("organization") or "-",
            "sessionCount": r["count"],
            "lastUsed": last_used,
            "credits": None,
            "registered": False,
        }

    # Step 2: fetch all users from users collection
    all_users = list(users_col.find({}, {"_id": 0, "email": 1, "name": 1, "organization": 1, "credits": 1}))
    registered_emails = set(u.get("email") for u in all_users if u.get("email"))

    # Step 3: merge - users collection data takes priority for name/organization/credits
    for u in all_users:
        email = u.get("email")
        if not email:
            continue
        if email in session_map:
            # update name/org from users collection if available
            session_map[email]["credits"] = u.get("credits", DEFAULT_CREDITS)
            session_map[email]["registered"] = True
            if u.get("name"):
                session_map[email]["name"] = u["name"]
            if u.get("organization"):
                session_map[email]["organization"] = u["organization"]
        else:
            # users with no sessions
            session_map[email] = {
                "email": email,
                "name": u.get("name") or "-",
                "organization": u.get("organization") or "-",
                "sessionCount": 0,
                "lastUsed": None,
                "credits": u.get("credits", DEFAULT_CREDITS),
                "registered": True,
            }

    # Mark registered status for session-only users
    for email in session_map:
        if "registered" not in session_map[email]:
            session_map[email]["registered"] = email in registered_emails

    # Step 4: sort by lastUsed desc (None goes to bottom)
    users = sorted(
        session_map.values(),
        key=lambda x: (x["lastUsed"] is None, x["lastUsed"] or ""),
        reverse=True,
    )

    return {"users": list(users)}


@router.post(
    "/sessions/recalculate-all",
    description="Recalculate scores for all completed sessions",
    response_class=JSONResponse,
)
def recalculate_all_scores():
    """Recalculate scores and tension for all completed sessions"""
    from app.database.mongodb import get_sessions_collection
    collection = get_sessions_collection()
    sessions = list(collection.find({"status": "completed"}, {"receiptNo": 1, "kid.name": 1}))

    success_count = 0
    fail_count = 0
    errors = []

    for s in sessions:
        receipt_no = s.get("receiptNo")
        kid_name = s.get("kid", {}).get("name", "아동")
        if not receipt_no:
            continue
        try:
            receipt_no_int = int(receipt_no)
            controller_figure.get_Report(kid_name, receipt_no_int)
            success_count += 1
        except Exception as e:
            fail_count += 1
            errors.append({"receiptNo": receipt_no, "error": str(e)})

    return {
        "success": True,
        "message": f"{success_count}건 재계산 완료, {fail_count}건 실패",
        "successCount": success_count,
        "failCount": fail_count,
        "errors": errors[:10]
    }


@router.get("/settings", response_class=JSONResponse)
def get_settings():
    """Get app settings"""
    from app.database.mongodb import get_database
    db = get_database()
    settings = db["app_settings"].find_one({"_id": "global"})
    if not settings:
        # Default settings
        settings = {"_id": "global", "showResultToUser": True}
        db["app_settings"].insert_one(settings)
    return {"showResultToUser": settings.get("showResultToUser", True)}


@router.put("/settings", response_class=JSONResponse)
def update_settings(req: dict = Body(...)):
    """Update app settings"""
    from app.database.mongodb import get_database
    db = get_database()
    update_data = {}
    if "showResultToUser" in req:
        update_data["showResultToUser"] = bool(req["showResultToUser"])
    if update_data:
        db["app_settings"].update_one(
            {"_id": "global"},
            {"$set": update_data},
            upsert=True
        )
    return {"success": True, **update_data}


@router.get("/super-users", response_class=JSONResponse)
def get_super_users():
    """Get list of super users"""
    from app.database.mongodb import get_database
    db = get_database()
    settings = db["app_settings"].find_one({"_id": "global"})
    default_super_users = ["appleiv@gmail.com", "a33351702@gmail.com", "beratung@hansei.ac.kr", "kaft2960@gmail.com"]
    if not settings or "superUsers" not in settings:
        # Initialize with defaults
        db["app_settings"].update_one(
            {"_id": "global"},
            {"$set": {"superUsers": default_super_users}},
            upsert=True
        )
        return {"superUsers": default_super_users}
    return {"superUsers": settings.get("superUsers", default_super_users)}


@router.put("/super-users", response_class=JSONResponse)
def update_super_users(req: dict = Body(...)):
    """Add or remove a super user"""
    from app.database.mongodb import get_database
    db = get_database()
    email = req.get("email", "").strip().lower()
    action = req.get("action", "")  # "add" or "remove"

    if not email or action not in ("add", "remove"):
        raise HTTPException(status_code=400, detail="email and action (add/remove) required")

    settings = db["app_settings"].find_one({"_id": "global"})
    default_super_users = ["appleiv@gmail.com", "a33351702@gmail.com", "beratung@hansei.ac.kr", "kaft2960@gmail.com"]
    current = settings.get("superUsers", default_super_users) if settings else default_super_users

    if action == "add" and email not in current:
        current.append(email)
    elif action == "remove" and email in current:
        current.remove(email)

    db["app_settings"].update_one(
        {"_id": "global"},
        {"$set": {"superUsers": current}},
        upsert=True
    )
    return {"success": True, "superUsers": current}


@router.get(
    "/health",
    description="Health check for admin API",
    response_class=JSONResponse,
)
def health_check():
    """Check if admin API and database are working"""
    try:
        count = session_repository.count_all()
        return {"status": "healthy", "database": "connected", "sessions_count": count}
    except Exception as e:
        return {"status": "unhealthy", "database": "disconnected", "error": str(e)}


# --- Credit & Login Code Management ---

def _ensure_user(email: str, name: str = "", organization: str = "") -> dict:
    """Get or create a user record. Returns the user document."""
    collection = get_users_collection()
    user = collection.find_one({"email": email})
    if user:
        return user

    now = datetime.now(KST)
    new_user = {
        "email": email,
        "name": name,
        "organization": organization,
        "credits": DEFAULT_CREDITS,
        "createdAt": now,
        "updatedAt": now,
    }
    collection.insert_one(new_user)
    return new_user


def _generate_code() -> str:
    """Generate a unique 6-character alphanumeric code"""
    chars = string.ascii_uppercase + string.digits
    collection = get_login_codes_collection()
    for _ in range(100):  # max attempts to avoid collision
        code = ''.join(random.choices(chars, k=6))
        if not collection.find_one({"code": code}):
            return code
    raise HTTPException(status_code=500, detail="코드 생성에 실패했습니다.")


@router.get(
    "/credits",
    description="Get remaining credits for a counselor email",
    response_class=JSONResponse,
    response_model=CreditResponse,
)
def get_credits(email: str = Query(..., description="Counselor email")):
    """Get remaining credits for a user, creating record if needed"""
    user = _ensure_user(email)
    return CreditResponse(email=email, credits=user.get("credits", DEFAULT_CREDITS))


SUPER_USERS = ["appleiv@gmail.com", "a33351702@gmail.com", "beratung@hansei.ac.kr"]


@router.post(
    "/generate-code",
    description="Generate a one-time login code (deducts 1 credit)",
    response_class=JSONResponse,
    response_model=GenerateCodeResponse,
)
def generate_code(req: GenerateCodeRequest):
    """Generate a login code, deducting 1 credit from the counselor"""
    user = _ensure_user(req.email, req.name, req.organization)
    credits = user.get("credits", DEFAULT_CREDITS)
    is_super = req.email in SUPER_USERS

    users_col = get_users_collection()
    now = datetime.now(KST)

    if is_super:
        # 슈퍼유저는 크레딧 차감 없음
        users_col.update_one(
            {"email": req.email},
            {"$set": {"name": req.name, "organization": req.organization, "updatedAt": now}}
        )
        remaining = credits
    else:
        # 일반 유저는 읽기+검사+차감을 단일 원자적 연산으로 처리
        from pymongo import ReturnDocument
        result = users_col.find_one_and_update(
            {"email": req.email, "credits": {"$gt": 0}},
            {
                "$inc": {"credits": -1},
                "$set": {"name": req.name, "organization": req.organization, "updatedAt": now},
            },
            return_document=ReturnDocument.AFTER
        )
        if not result:
            raise HTTPException(status_code=400, detail="크레딧이 부족합니다.")
        remaining = result.get("credits", 0)

    # Generate unique code
    code = _generate_code()

    # Save login code
    codes_col = get_login_codes_collection()
    expires_at = None
    if req.expiryHours is not None and req.expiryHours > 0:
        expires_at = now + timedelta(hours=req.expiryHours)
    codes_col.insert_one({
        "code": code,
        "counselorEmail": req.email,
        "counselorName": req.name,
        "organization": req.organization,
        "used": False,
        "createdAt": now,
        "expiresAt": expires_at,
        "expiryHours": req.expiryHours,
        "usedAt": None,
        "sessionReceiptNo": None,
    })

    return GenerateCodeResponse(code=code, credits=remaining)


@router.put(
    "/credits",
    description="Manually set credits for a counselor (admin only)",
    response_class=JSONResponse,
    response_model=CreditResponse,
)
def set_credits(req: SetCreditRequest):
    """Manually set credit amount for a user"""
    user = _ensure_user(req.email)
    now = datetime.now(KST)

    users_col = get_users_collection()
    users_col.update_one(
        {"email": req.email},
        {"$set": {"credits": req.credits, "updatedAt": now}}
    )

    return CreditResponse(email=req.email, credits=req.credits)


@router.put(
    "/reset-password",
    description="Admin reset user password to default",
    response_class=JSONResponse,
)
def reset_password(body: dict = Body(...)):
    """Reset a user's password to default '1234' and clear passwordChanged flag"""
    email = body.get("email")
    if not email:
        raise HTTPException(status_code=400, detail="email is required")
    users_col = get_users_collection()
    user = users_col.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다.")
    users_col.update_one(
        {"email": email},
        {"$set": {"password": "1234", "passwordChanged": False, "updatedAt": datetime.now(KST)}}
    )
    return {"success": True, "message": "비밀번호가 초기화되었습니다."}


@router.post(
    "/users",
    description="Admin creates a new allowed user",
    response_class=JSONResponse,
)
def admin_create_user(body: dict = Body(...)):
    """Admin creates a new allowed user"""
    email = body.get("email", "").strip().lower()
    name = body.get("name", "").strip()
    organization = body.get("organization", "").strip()

    if not email:
        raise HTTPException(status_code=400, detail="이메일은 필수입니다")

    collection = get_users_collection()
    existing = collection.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="이미 등록된 사용자입니다")

    now = datetime.now(KST)
    new_user = {
        "email": email,
        "name": name,
        "organization": organization,
        "credits": DEFAULT_CREDITS,
        "createdAt": now,
        "updatedAt": now,
    }
    collection.insert_one(new_user)
    return {"success": True, "email": email, "name": name, "organization": organization}


@router.post(
    "/users/delete",
    description="Admin deletes a user",
    response_class=JSONResponse,
)
def admin_delete_user(body: dict = Body(...)):
    """Admin deletes a user (login access only, sessions preserved)"""
    email = body.get("email", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="이메일은 필수입니다")
    collection = get_users_collection()
    result = collection.delete_one({"email": email})
    return {"success": True, "deleted": result.deleted_count}


@router.put(
    "/users/update",
    description="Admin updates user info",
    response_class=JSONResponse,
)
def admin_update_user(body: dict = Body(...)):
    """Admin updates user info"""
    email = body.get("email", "").strip()
    if not email:
        raise HTTPException(status_code=400, detail="이메일은 필수입니다")
    collection = get_users_collection()
    existing = collection.find_one({"email": email})
    if not existing:
        raise HTTPException(status_code=404, detail="사용자를 찾을 수 없습니다")

    update = {}
    if "name" in body:
        update["name"] = body["name"]
    if "organization" in body:
        update["organization"] = body["organization"]
    if "credits" in body:
        update["credits"] = body["credits"]

    if update:
        update["updatedAt"] = datetime.now(KST)
        collection.update_one({"email": email}, {"$set": update})

    return {"success": True}


@router.get(
    "/my-codes",
    description="Get list of login codes created by a counselor email",
    response_class=JSONResponse,
    response_model=MyCodesResponse,
)
def get_my_codes(email: str = Query(..., description="Counselor email")):
    """Return all login codes created by the given email, sorted by most recent first."""
    codes_col = get_login_codes_collection()
    docs = list(
        codes_col.find({"counselorEmail": email})
        .sort("createdAt", -1)
    )

    def _fmt_dt(val) -> Optional[str]:
        if val is None:
            return None
        if hasattr(val, "isoformat"):
            return val.isoformat()
        return str(val)

    items = [
        CodeItem(
            code=doc["code"],
            used=doc.get("used", False),
            createdAt=_fmt_dt(doc.get("createdAt")),
            usedAt=_fmt_dt(doc.get("usedAt")),
            sessionReceiptNo=doc.get("sessionReceiptNo"),
        )
        for doc in docs
    ]

    return MyCodesResponse(codes=items, total=len(items))
