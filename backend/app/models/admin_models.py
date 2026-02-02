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
