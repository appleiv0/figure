from fastapi import APIRouter, Query, HTTPException, Depends, Header, Request
from fastapi.responses import JSONResponse
from datetime import datetime
from typing import Optional
import re
import os

from app.repositories.session_repository import session_repository
from app.models.admin_models import (
    SessionListResponse,
    SessionDetailResponse,
    SearchRequest,
    StatisticsResponse,
    DeleteResponse
)
import libcommon.config.status_error as status_error
from libcommon.routes import response, default_responses


ADMIN_API_KEY = os.environ.get("ADMIN_API_KEY", "change-this-in-production")


async def verify_admin_key(request: Request, x_admin_key: Optional[str] = Header(None, alias="X-Admin-Key")):
    """Verify admin API key from header."""
    if request.method == "OPTIONS":
        return None
    
    if x_admin_key != ADMIN_API_KEY:
        raise HTTPException(status_code=401, detail="Invalid admin key")
    return x_admin_key


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

    # Convert ObjectId to string
    if "_id" in session:
        session["_id"] = str(session["_id"])

    # Convert datetime objects to ISO format strings
    for key in ["createdAt", "updatedAt", "_migrated_at"]:
        if key in session and isinstance(session[key], datetime):
            session[key] = session[key].isoformat()

    # Handle chatHistory timestamps
    if "chatHistory" in session:
        for entry in session["chatHistory"]:
            if "timestamp" in entry and isinstance(entry["timestamp"], datetime):
                entry["timestamp"] = entry["timestamp"].isoformat()

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
