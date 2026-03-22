from fastapi import APIRouter, HTTPException, Query
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
)
from libcommon.routes import default_responses

KST = timezone(timedelta(hours=9))

router = APIRouter(
    prefix="/public",
    tags=["Public"],
    responses=default_responses,
)


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
                return ValidateCodeResponse(valid=False, message="이미 완료된 세션의 코드입니다.")
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

    # Check 24-hour expiry
    created_at = code_doc.get("createdAt")
    if created_at:
        now = datetime.now(KST)
        if created_at.tzinfo is None:
            created_at = created_at.replace(tzinfo=KST)
        elapsed = now - created_at
        if elapsed.total_seconds() > 86400:
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
    """Mark a login code as used and link to session"""
    collection = get_login_codes_collection()
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

    collection.update_one(
        {"code": req.code},
        {"$set": {
            "used": True,
            "usedAt": datetime.now(KST),
            "sessionReceiptNo": req.receiptNo,
        }}
    )

    return UseCodeResponse(success=True, message="코드가 사용 처리되었습니다.")


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
            "password": "1234",
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
    if stored_password != req.oldPassword:
        raise HTTPException(status_code=400, detail="기존 비밀번호가 올바르지 않습니다.")

    collection.update_one(
        {"email": req.email},
        {"$set": {"password": req.newPassword, "passwordChanged": True, "updatedAt": datetime.now(KST)}}
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
    return VerifyPasswordResponse(valid=(stored_password == req.password), passwordChanged=pw_changed)
