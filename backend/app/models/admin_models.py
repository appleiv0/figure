from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime


class SessionListResponse(BaseModel):
    """Response model for session list"""
    sessions: List[Dict[str, Any]]
    total: int
    page: int
    limit: int
    totalPages: int


class SessionDetailResponse(BaseModel):
    """Response model for session detail"""
    session: Dict[str, Any]


class SearchRequest(BaseModel):
    """Request model for search"""
    kidName: Optional[str] = None
    organization: Optional[str] = None
    startDate: Optional[str] = None
    endDate: Optional[str] = None
    status: Optional[str] = None


class StatisticsResponse(BaseModel):
    """Response model for statistics"""
    totalSessions: int
    completedSessions: int
    inProgressSessions: int
    avgScore: Optional[float]
    maxScore: Optional[int]
    minScore: Optional[int]
    scoreDistribution: List[Dict[str, Any]]
    monthlyStats: List[Dict[str, Any]]


class DeleteResponse(BaseModel):
    """Response model for delete operation"""
    success: bool
    message: str


# --- Credit & Login Code Models ---

class CreditResponse(BaseModel):
    """Response model for credit query"""
    email: str
    credits: int


class GenerateCodeRequest(BaseModel):
    """Request model for generating a login code"""
    email: str
    name: str
    organization: str


class GenerateCodeResponse(BaseModel):
    """Response model for generated login code"""
    code: str
    credits: int


class ValidateCodeRequest(BaseModel):
    """Request model for validating a login code"""
    code: str


class ValidateCodeResponse(BaseModel):
    """Response model for code validation"""
    valid: bool
    counselorEmail: Optional[str] = None
    counselorName: Optional[str] = None
    organization: Optional[str] = None
    message: Optional[str] = None
    used: Optional[bool] = None
    sessionReceiptNo: Optional[str] = None


class UseCodeRequest(BaseModel):
    """Request model for using a login code"""
    code: str
    receiptNo: str


class UseCodeResponse(BaseModel):
    """Response model for use code"""
    success: bool
    message: str


class SetCreditRequest(BaseModel):
    """Request model for setting credits manually"""
    email: str
    credits: int


# --- Public User Registration Models ---

class RegisterUserRequest(BaseModel):
    """Request model for registering or updating a user"""
    email: str
    name: str
    organization: str


class RegisterUserResponse(BaseModel):
    """Response model for user registration"""
    email: str
    name: str
    organization: str
    credits: int
    isNew: bool


class UserInfoResponse(BaseModel):
    """Response model for user info lookup"""
    exists: bool
    name: Optional[str] = None
    organization: Optional[str] = None
    credits: Optional[int] = None


# --- Password Management Models ---

class ChangePasswordRequest(BaseModel):
    """Request model for changing a user's password"""
    email: str
    oldPassword: str
    newPassword: str


class VerifyPasswordRequest(BaseModel):
    """Request model for verifying a user's password"""
    email: str
    password: str


class VerifyPasswordResponse(BaseModel):
    """Response model for password verification"""
    valid: bool
    passwordChanged: bool = False


# --- My Codes Models ---

class CodeItem(BaseModel):
    """Single login code item"""
    code: str
    used: bool
    createdAt: Optional[str] = None
    usedAt: Optional[str] = None
    sessionReceiptNo: Optional[str] = None


class MyCodesResponse(BaseModel):
    """Response model for my codes list"""
    codes: List[CodeItem]
    total: int
