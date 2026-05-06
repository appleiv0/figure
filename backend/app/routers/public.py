import hashlib

from fastapi import APIRouter, Body, HTTPException, Query
from fastapi.responses import JSONResponse
from datetime import datetime, timezone, timedelta

from app.database.mongodb import get_login_codes_collection, get_users_collection, get_sessions_collection
from app.models.admin_models import (
    ValidateCodeRequest,
    ValidateCodeResponse,
    UseCodeRequest,
    UseCodeResponse,
    RegisterUserRequest,
    RegisterUserResponse,
    UserInfoResponse,
    ChangePasswordRequest,
    VerifyPasswordRequest,
    VerifyPasswordResponse,
    RequestEvaluationRequest,
    MarkEvaluationNotifiedRequest,
    CheckEvaluationsResponse,
)
from libcommon.routes import default_responses

KST = timezone(timedelta(hours=9))

router = APIRouter(
    prefix="/public",
    tags=["Public"],
    responses=default_responses,
)


def _infer_step(session: dict) -> int:
    """Infer current step from session data"""
    figures = session.get("figures", {})
    has_canvas = bool(session.get("canvasImage"))
    has_positions = bool(session.get("positions", {}).get("figures"))

    if has_positions or has_canvas:
        return 7  # completed doll placement → ending
    if figures.get("6") and len(figures["6"]) > 0:
        return 6  # stage6 done → doll placement
    if figures.get("5") and len(figures["5"]) > 0:
        return 5  # stage5 done
    if figures.get("3") and len(figures["3"]) > 0:
        return 4  # stage3 done → stage4
    if figures.get("2") and len(figures["2"]) > 0:
        return 3  # stage2 done → stage3
    if figures.get("1") and len(figures["1"]) > 0:
        return 2  # stage1 done → stage2
    return 0


def _hash_password(password: str) -> str:
    """Hash a password using SHA-256."""
    return hashlib.sha256(password.encode()).hexdigest()


def _verify_password(input_password: str, stored_password: str, collection=None, email: str = None) -> bool:
    """Verify password with backward compatibility for plaintext migration.

    If the stored password is plaintext (legacy), verify and auto-migrate to hashed.
    """
    hashed_input = _hash_password(input_password)
    # Check hashed match first
    if stored_password == hashed_input:
        return True
    # Plaintext fallback for legacy users
    if stored_password == input_password:
        # Auto-migrate to hashed password
        if collection is not None and email:
            collection.update_one(
                {"email": email},
                {"$set": {"password": hashed_input}}
            )
        return True
    return False


@router.post(
    "/save-step",
    description="Save current step progress",
    response_class=JSONResponse,
)
def save_step(req: dict = Body(...)):
    """Save the current step to the session for resume capability"""
    receipt_no = req.get("receiptNo")
    step = req.get("currentStep")
    if receipt_no is None or step is None:
        raise HTTPException(status_code=400, detail="receiptNo and currentStep required")

    collection = get_sessions_collection()
    result = collection.update_one(
        {"$or": [{"receiptNo": receipt_no}, {"receiptNo": str(receipt_no)}, {"receiptNo": int(receipt_no) if str(receipt_no).isdigit() else receipt_no}]},
        {"$set": {"currentStep": step}}
    )
    return {"success": result.modified_count > 0}


@router.post(
    "/validate-code",
    description="Validate a login code (no auth required)",
    response_class=JSONResponse,
    response_model=ValidateCodeResponse,
)
def validate_code(req: ValidateCodeRequest):
    """Validate a login code without consuming it"""
    collection = get_login_codes_collection()
    code_doc = collection.find_one({"code": req.code})

    if not code_doc:
        return ValidateCodeResponse(valid=False, message="존재하지 않는 코드입니다.")

    if code_doc.get("used", False):
        # 이미 사용된 코드: 세션 완료 여부 확인
        session_receipt_no = code_doc.get("sessionReceiptNo")
        if session_receipt_no:
            sessions_col = get_sessions_collection()
            session = sessions_col.find_one({"receiptNo": session_receipt_no})
            if session and session.get("status") == "completed":
                # 완료된 세션도 이어하기(인형배치 재시도) 허용
                resume_org_c = code_doc.get("organization", "")
                resume_name_c = code_doc.get("counselorName", "")
                if not resume_org_c or not resume_name_c:
                    users_col_c = get_users_collection()
                    user_c = users_col_c.find_one({"email": code_doc.get("counselorEmail")})
                    if user_c:
                        if not resume_org_c:
                            resume_org_c = user_c.get("organization", "")
                        if not resume_name_c:
                            resume_name_c = user_c.get("name", "")
                return ValidateCodeResponse(
                    valid=True,
                    counselorEmail=code_doc.get("counselorEmail"),
                    counselorName=resume_name_c,
                    organization=resume_org_c,
                    used=True,
                    sessionReceiptNo=session_receipt_no,
                )
            # 미완료 세션 → 이어하기 가능 (organization 보완)
            resume_org = code_doc.get("organization", "")
            resume_name = code_doc.get("counselorName", "")
            if not resume_org or not resume_name:
                users_col = get_users_collection()
                user = users_col.find_one({"email": code_doc.get("counselorEmail")})
                if user:
                    if not resume_org:
                        resume_org = user.get("organization", "")
                    if not resume_name:
                        resume_name = user.get("name", "")
            return ValidateCodeResponse(
                valid=True,
                counselorEmail=code_doc.get("counselorEmail"),
                counselorName=resume_name,
                organization=resume_org,
                used=True,
                sessionReceiptNo=session_receipt_no,
            )
        return ValidateCodeResponse(valid=False, message="이미 사용된 코드입니다.")

    # Check expiry
    now = datetime.now(KST)
    expires_at = code_doc.get("expiresAt")
    if expires_at:
        if expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=KST)
        if now > expires_at:
            expiry_hours = code_doc.get("expiryHours", 24)
            return ValidateCodeResponse(valid=False, message=f"만료된 코드입니다. ({expiry_hours}시간 초과)")
    else:
        # Legacy: expiresAt 없는 기존 코드는 24시간 기본 만료
        created_at = code_doc.get("createdAt")
        if created_at:
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=KST)
            if (now - created_at).total_seconds() > 86400:
                return ValidateCodeResponse(valid=False, message="만료된 코드입니다. (24시간 초과)")

    # organization이 비어있으면 users 컬렉션에서 보완
    org = code_doc.get("organization", "")
    name = code_doc.get("counselorName", "")
    if not org or not name:
        users_col = get_users_collection()
        user = users_col.find_one({"email": code_doc.get("counselorEmail")})
        if user:
            if not org:
                org = user.get("organization", "")
            if not name:
                name = user.get("name", "")

    return ValidateCodeResponse(
        valid=True,
        counselorEmail=code_doc.get("counselorEmail"),
        counselorName=name,
        organization=org,
        used=False,
    )


@router.post(
    "/use-code",
    description="Mark a login code as used (no auth required)",
    response_class=JSONResponse,
    response_model=UseCodeResponse,
)
def use_code(req: UseCodeRequest):
    """Mark a login code as used and link to session (atomic)"""
    collection = get_login_codes_collection()

    # Atomic find-and-update: only succeeds if code exists AND used==false
    result = collection.find_one_and_update(
        {"code": req.code, "used": {"$ne": True}},
        {"$set": {
            "used": True,
            "usedAt": datetime.now(KST),
            "sessionReceiptNo": req.receiptNo,
        }},
        return_document=False  # return original doc before update
    )

    if result is not None:
        # Successfully claimed the code - also save loginCode to session
        if req.receiptNo:
            sessions_col = get_sessions_collection()
            sessions_col.update_one(
                {"receiptNo": str(req.receiptNo)},
                {"$set": {"loginCode": req.code}},
            )
        return UseCodeResponse(success=True, message="코드가 사용 처리되었습니다.")

    # Code wasn't claimed - either doesn't exist, already used, or expired
    code_doc = collection.find_one({"code": req.code})
    if not code_doc:
        raise HTTPException(status_code=404, detail="존재하지 않는 코드입니다.")

    if code_doc.get("used", False):
        # 같은 세션 이어하기: sessionReceiptNo가 req.receiptNo와 일치하면 허용
        session_receipt_no = code_doc.get("sessionReceiptNo")
        if session_receipt_no and req.receiptNo and str(session_receipt_no) == str(req.receiptNo):
            return UseCodeResponse(success=True, message="이어하기 세션입니다.")
        raise HTTPException(status_code=400, detail="이미 사용된 코드입니다.")

    # Check 24-hour expiry
    created_at = code_doc.get("createdAt")
    if created_at:
        now = datetime.now(KST)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=KST)
        elapsed = now - created_at
        if elapsed.total_seconds() > 86400:
            raise HTTPException(status_code=400, detail="만료된 코드입니다. (24시간 초과)")

    raise HTTPException(status_code=400, detail="코드를 사용할 수 없습니다.")


DEFAULT_CREDITS = 10


@router.post(
    "/register-user",
    description="Register or update a user (no auth required)",
    response_class=JSONResponse,
    response_model=RegisterUserResponse,
)
def register_user(req: RegisterUserRequest):
    """Create user if not exists (credits: 10), or update name/organization if already exists."""
    collection = get_users_collection()
    now = datetime.now(KST)

    existing = collection.find_one({"email": req.email})
    if existing:
        collection.update_one(
            {"email": req.email},
            {"$set": {
                "name": req.name,
                "organization": req.organization,
                "updatedAt": now,
            }}
        )
        updated = collection.find_one({"email": req.email})
        return RegisterUserResponse(
            email=req.email,
            name=req.name,
            organization=req.organization,
            credits=updated.get("credits", DEFAULT_CREDITS),
            isNew=False,
        )
    else:
        new_user = {
            "email": req.email,
            "name": req.name,
            "organization": req.organization,
            "credits": DEFAULT_CREDITS,
            "password": _hash_password("1234"),
            "passwordChanged": False,
            "createdAt": now,
            "updatedAt": now,
        }
        collection.insert_one(new_user)
        return RegisterUserResponse(
            email=req.email,
            name=req.name,
            organization=req.organization,
            credits=DEFAULT_CREDITS,
            isNew=True,
        )


@router.get(
    "/user-info",
    description="Get user info by email (no auth required)",
    response_class=JSONResponse,
    response_model=UserInfoResponse,
)
def get_user_info(email: str = Query(..., description="User email to look up")):
    """Look up a user in the users collection by email."""
    collection = get_users_collection()
    user = collection.find_one({"email": email})

    if user:
        return UserInfoResponse(
            exists=True,
            name=user.get("name"),
            organization=user.get("organization"),
            credits=user.get("credits", DEFAULT_CREDITS),
        )
    else:
        return UserInfoResponse(exists=False)


DEFAULT_PASSWORD = "1234"


@router.put(
    "/change-password",
    description="Change user password after verifying old password (no auth required)",
    response_class=JSONResponse,
)
def change_password(req: ChangePasswordRequest):
    """Verify old password then update to new password."""
    collection = get_users_collection()
    user = collection.find_one({"email": req.email})

    if not user:
        raise HTTPException(status_code=404, detail="존재하지 않는 사용자입니다.")

    stored_password = user.get("password", DEFAULT_PASSWORD)
    if not _verify_password(req.oldPassword, stored_password, collection, req.email):
        raise HTTPException(status_code=400, detail="기존 비밀번호가 올바르지 않습니다.")

    collection.update_one(
        {"email": req.email},
        {"$set": {"password": _hash_password(req.newPassword), "passwordChanged": True, "updatedAt": datetime.now(KST)}}
    )
    return {"success": True, "message": "비밀번호가 변경되었습니다."}


@router.post(
    "/verify-password",
    description="Verify user password (no auth required)",
    response_class=JSONResponse,
    response_model=VerifyPasswordResponse,
)
def verify_password(req: VerifyPasswordRequest):
    """Check if the provided password matches the stored password."""
    collection = get_users_collection()
    user = collection.find_one({"email": req.email})

    if not user:
        return VerifyPasswordResponse(valid=False, passwordChanged=False)

    stored_password = user.get("password", DEFAULT_PASSWORD)
    pw_changed = user.get("passwordChanged", False)
    valid = _verify_password(req.password, stored_password, collection, req.email)
    return VerifyPasswordResponse(valid=valid, passwordChanged=pw_changed)


@router.post(
    "/request-evaluation",
    description="Request expert evaluation for a session (no auth required)",
    response_class=JSONResponse,
)
def request_evaluation(req: RequestEvaluationRequest):
    """User requests expert evaluation for a session"""
    sessions_col = get_sessions_collection()
    receipt_no = req.receiptNo
    # Try both string and int matching
    session = sessions_col.find_one({"receiptNo": receipt_no})
    if not session:
        try:
            session = sessions_col.find_one({"receiptNo": int(receipt_no)})
        except (ValueError, TypeError):
            pass
    if not session:
        try:
            session = sessions_col.find_one({"receiptNo": str(receipt_no)})
        except (ValueError, TypeError):
            pass
    if not session:
        raise HTTPException(status_code=404, detail="세션을 찾을 수 없습니다.")

    now = datetime.now(KST)
    sessions_col.update_one(
        {"_id": session["_id"]},
        {"$set": {
            "evaluationRequested": True,
            "evaluationRequestedAt": now,
            "evaluationRequestedBy": req.requestedBy,
        }}
    )
    return {"success": True}


@router.get(
    "/check-evaluations",
    description="Check if any evaluation responses arrived for this user's sessions (no auth required)",
    response_class=JSONResponse,
    response_model=CheckEvaluationsResponse,
)
def check_evaluations(email: str = Query(..., description="Counselor email")):
    """Check if any evaluation responses arrived for this user's sessions"""
    sessions_col = get_sessions_collection()
    query = {
        "counselorEmail": email,
        "evaluationRequested": True,
        "evaluationCompleted": True,
        "evaluationNotified": {"$ne": True},
    }
    docs = list(sessions_col.find(query, {
        "receiptNo": 1, "kid.name": 1, "familyType": 1, "aiEvaluation": 1,
    }))
    sessions_list = []
    for doc in docs:
        sessions_list.append({
            "receiptNo": doc.get("receiptNo"),
            "kidName": doc.get("kid", {}).get("name", ""),
            "familyType": doc.get("familyType", ""),
            "aiEvaluation": doc.get("aiEvaluation", ""),
        })
    return CheckEvaluationsResponse(
        hasNew=len(sessions_list) > 0,
        sessions=sessions_list,
    )


@router.post(
    "/mark-evaluation-notified",
    description="Mark evaluations as notified so popup doesn't show again (no auth required)",
    response_class=JSONResponse,
)
def mark_evaluation_notified(req: MarkEvaluationNotifiedRequest):
    """Mark evaluations as notified so popup doesn't show again"""
    sessions_col = get_sessions_collection()
    for rno in req.receiptNos:
        # Try both string and int matching
        result = sessions_col.update_one(
            {"receiptNo": rno},
            {"$set": {"evaluationNotified": True}}
        )
        if result.modified_count == 0:
            try:
                sessions_col.update_one(
                    {"receiptNo": int(rno)},
                    {"$set": {"evaluationNotified": True}}
                )
            except (ValueError, TypeError):
                pass
            try:
                sessions_col.update_one(
                    {"receiptNo": str(rno)},
                    {"$set": {"evaluationNotified": True}}
                )
            except (ValueError, TypeError):
                pass
    return {"success": True}


@router.get("/super-users", response_class=JSONResponse)
def get_super_users_public():
    """Get list of super user emails (public)"""
    from app.database.mongodb import get_database
    db = get_database()
    settings = db["app_settings"].find_one({"_id": "global"})
    default_super_users = ["appleiv@gmail.com", "a33351702@gmail.com", "beratung@hansei.ac.kr", "kaft2960@gmail.com"]
    super_users = settings.get("superUsers", default_super_users) if settings else default_super_users
    return {"superUsers": super_users}


@router.get(
    "/settings/show-result",
    description="Check if results should be shown to users",
    response_class=JSONResponse,
)
def get_show_result_setting():
    """Public endpoint to check if test results should be shown"""
    from app.database.mongodb import get_database
    db = get_database()
    settings = db["app_settings"].find_one({"_id": "global"})
    show = settings.get("showResultToUser", True) if settings else True
    return {"showResultToUser": show}


@router.post(
    "/auto-save-canvas",
    description="Auto-save canvas screenshot during doll placement",
    response_class=JSONResponse,
)
def auto_save_canvas(req: dict = Body(...)):
    """Auto-save canvas image for a session without completing it"""
    receipt_no = req.get("receiptNo")
    canvas_image = req.get("canvasImage")

    if not receipt_no or not canvas_image:
        raise HTTPException(status_code=400, detail="receiptNo and canvasImage required")

    collection = get_sessions_collection()
    result = collection.update_one(
        {"$or": [{"receiptNo": receipt_no}, {"receiptNo": str(receipt_no)}, {"receiptNo": int(receipt_no) if str(receipt_no).isdigit() else receipt_no}]},
        {"$set": {"canvasImage": canvas_image, "canvasAutoSavedAt": datetime.now(KST).isoformat()}}
    )

    return {"success": result.modified_count > 0}


@router.post(
    "/complete-session",
    description="Mark a session as completed",
    response_class=JSONResponse,
)
def complete_session(req: dict = Body(...)):
    """Mark a session as completed and calculate scores"""
    receipt_no = req.get("receiptNo")
    if not receipt_no:
        raise HTTPException(status_code=400, detail="receiptNo required")

    collection = get_sessions_collection()
    receipt_no_query = {"$or": [{"receiptNo": receipt_no}, {"receiptNo": str(receipt_no)}, {"receiptNo": int(receipt_no) if str(receipt_no).isdigit() else receipt_no}]}

    # Auto-calculate scores BEFORE marking as completed
    # If score calculation fails, the session won't be stuck as "completed" with no scores.
    try:
        from app.controllers import controller_figure
        session = collection.find_one(receipt_no_query)
        if session:
            kid_name = session.get("kid", {}).get("name", "아동")
            receipt_no_int = int(receipt_no) if str(receipt_no).isdigit() else receipt_no
            controller_figure.get_Report(kid_name, receipt_no_int)
            # Also save inferred step
            session = collection.find_one(receipt_no_query)
            if session:
                step = _infer_step(session)
                collection.update_one(receipt_no_query, {"$set": {"currentStep": step}})
    except Exception as e:
        print(f"Score calculation error for {receipt_no}: {e}")

    # Mark as completed AFTER score calculation
    result = collection.update_one(
        receipt_no_query,
        {"$set": {"status": "completed", "completedAt": datetime.now(KST).isoformat()}}
    )

    return {"success": result.modified_count > 0}


@router.get(
    "/my-session/{receipt_no}",
    description="Get session detail for the session owner (no admin auth required)",
    response_class=JSONResponse,
)
def get_my_session(receipt_no: str, email: str = Query(...)):
    """Get session detail - only if the counselor email matches"""
    collection = get_sessions_collection()
    session = collection.find_one(
        {"$or": [
            {"receiptNo": receipt_no},
            {"receiptNo": str(receipt_no)},
            {"receiptNo": int(receipt_no) if str(receipt_no).isdigit() else receipt_no},
        ]}
    )
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    # Verify ownership by counselor email
    session_email = session.get("counselorEmail", "")
    if session_email != email:
        raise HTTPException(status_code=403, detail="Access denied")

    from app.routers.admin import serialize_session
    from app.utils.session_token import generate_session_token
    session_token = generate_session_token(str(session.get("receiptNo", "")))
    return {"session": serialize_session(session), "sessionToken": session_token}


@router.get(
    "/my-sessions",
    description="Get sessions for a specific counselor email (no admin auth required)",
    response_class=JSONResponse,
)
def get_my_sessions(
    email: str = Query(...),
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
):
    """Get sessions belonging to a counselor"""
    collection = get_sessions_collection()
    query = {"counselorEmail": email}
    total = collection.count_documents(query)
    sessions = list(
        collection.find(query)
        .sort("createdAt", -1)
        .skip((page - 1) * limit)
        .limit(limit)
    )

    from app.routers.admin import serialize_session
    serialized = [serialize_session(s) for s in sessions]

    return {
        "sessions": serialized,
        "total": total,
        "page": page,
        "limit": limit,
        "totalPages": (total + limit - 1) // limit,
    }
