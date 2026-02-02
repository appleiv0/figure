from datetime import datetime
from typing import Optional, List, Dict, Any
from bson import ObjectId
from pymongo.collection import Collection
from app.database.mongodb import get_sessions_collection
import os
import libcommon.config.config as config

class SessionRepository:
    """Repository for therapy session data operations"""

    def __init__(self):
        self._collection: Optional[Collection] = None

    @property
    def collection(self) -> Collection:
        if self._collection is None:
            self._collection = get_sessions_collection()
        return self._collection

    def create_session(self, data: Dict[str, Any]) -> str:
        """Create a new therapy session"""
        data["createdAt"] = datetime.utcnow()
        data["updatedAt"] = datetime.utcnow()
        data["status"] = "in_progress"
        result = self.collection.insert_one(data)
        return str(result.inserted_id)

    def find_by_receipt_no(self, receipt_no: str) -> Optional[Dict[str, Any]]:
        """Find a session by receipt number"""
        return self.collection.find_one({"receiptNo": receipt_no})

    def update_session(self, receipt_no: str, update_data: Dict[str, Any]) -> bool:
        """Update a session by receipt number"""
        update_data["updatedAt"] = datetime.utcnow()
        result = self.collection.update_one(
            {"receiptNo": receipt_no},
            {"$set": update_data}
        )
        return result.modified_count > 0

    def update_figures(self, receipt_no: str, stage: str, figures: List[Dict]) -> bool:
        """Update figures for a specific stage"""
        return self.update_session(receipt_no, {f"figures.{stage}": figures})

    def update_positions(self, receipt_no: str, positions: Dict[str, Any]) -> bool:
        """Update positions data"""
        return self.update_session(receipt_no, {"positions": positions})

    def update_chat_history(self, receipt_no: str, chat_entry: Dict[str, Any]) -> bool:
        """Add a chat entry to the session"""
        result = self.collection.update_one(
            {"receiptNo": receipt_no},
            {
                "$push": {"chatHistory": chat_entry},
                "$set": {"updatedAt": datetime.utcnow()}
            }
        )
        return result.modified_count > 0

    def update_llm_completion(self, receipt_no: str, relation: str, completion: Dict) -> bool:
        """Update LLM completion for a family relation"""
        return self.update_session(receipt_no, {f"llmCompletion.{relation}": completion})

    def update_scripts(self, receipt_no: str, relation: str, scripts: List[str]) -> bool:
        """Update scripts for a family relation"""
        return self.update_session(receipt_no, {f"scripts.{relation}": scripts})

    def update_scoring(self, receipt_no: str, score: int, abuse: Dict, abuser: Dict) -> bool:
        """Update scoring data"""
        return self.update_session(receipt_no, {
            "score": score,
            "abuse": abuse,
            "abuser": abuser
        })

    def update_report(self, receipt_no: str, report: str) -> bool:
        """Update the final report"""
        return self.update_session(receipt_no, {
            "report": report,
            "status": "completed"
        })

    def update_canvas_image(self, receipt_no: str, canvas_image: str) -> bool:
        """Update the canvas image (base64 encoded)"""
        return self.update_session(receipt_no, {"canvasImage": canvas_image})

    def delete_session(self, receipt_no: str) -> bool:
        """Delete a session by receipt number"""
        # First find the session to get kid name for JSON file
        session = self.find_by_receipt_no(receipt_no)

        # Delete from MongoDB
        result = self.collection.delete_one({"receiptNo": receipt_no})

        # If deleted from DB, also delete JSON file
        if result.deleted_count > 0 and session:
            try:
                kid_name = session.get("kid", {}).get("name", "")
                json_filename = f"{receipt_no}_{kid_name}.json"
                json_path = os.path.join(config.THERAPY_RESULT_DIR, json_filename)
                if os.path.exists(json_path):
                    os.remove(json_path)
            except Exception as e:
                # Log but don't fail if JSON deletion fails
                pass

        return result.deleted_count > 0

    # Admin query methods
    def find_all(self, skip: int = 0, limit: int = 20, sort_by: str = "createdAt",
                 sort_order: int = -1) -> List[Dict[str, Any]]:
        """Find all sessions with pagination"""
        cursor = self.collection.find().sort(sort_by, sort_order).skip(skip).limit(limit)
        return list(cursor)

    def count_all(self) -> int:
        """Count all sessions"""
        return self.collection.count_documents({})

    def search(self, query: Dict[str, Any], skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        """Search sessions with custom query"""
        cursor = self.collection.find(query).sort("createdAt", -1).skip(skip).limit(limit)
        return list(cursor)

    def search_by_kid_name(self, name: str, skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        """Search sessions by kid name (partial match)"""
        query = {"kid.name": {"$regex": name, "$options": "i"}}
        return self.search(query, skip, limit)

    def search_by_date_range(self, start_date: datetime, end_date: datetime,
                             skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        """Search sessions by date range"""
        query = {"createdAt": {"$gte": start_date, "$lte": end_date}}
        return self.search(query, skip, limit)

    def search_by_organization(self, organization: str, skip: int = 0, limit: int = 20) -> List[Dict[str, Any]]:
        """Search sessions by counselor organization"""
        query = {"counselor.organization": {"$regex": organization, "$options": "i"}}
        return self.search(query, skip, limit)

    def get_statistics(self) -> Dict[str, Any]:
        """Get aggregate statistics"""
        pipeline = [
            {
                "$group": {
                    "_id": None,
                    "totalSessions": {"$sum": 1},
                    "completedSessions": {
                        "$sum": {"$cond": [{"$eq": ["$status", "completed"]}, 1, 0]}
                    },
                    "avgScore": {"$avg": "$score"},
                    "maxScore": {"$max": "$score"},
                    "minScore": {"$min": "$score"}
                }
            }
        ]
        result = list(self.collection.aggregate(pipeline))
        return result[0] if result else {}

    def get_score_distribution(self) -> List[Dict[str, Any]]:
        """Get score distribution for statistics"""
        pipeline = [
            {"$match": {"status": "completed", "score": {"$gt": 0}}},
            {
                "$bucket": {
                    "groupBy": "$score",
                    "boundaries": [0, 20, 40, 60, 80, 100, 150],
                    "default": "150+",
                    "output": {"count": {"$sum": 1}}
                }
            }
        ]
        return list(self.collection.aggregate(pipeline))

    def get_monthly_stats(self, year: int) -> List[Dict[str, Any]]:
        """Get monthly session counts for a year"""
        pipeline = [
            {
                "$match": {
                    "createdAt": {
                        "$gte": datetime(year, 1, 1),
                        "$lt": datetime(year + 1, 1, 1)
                    }
                }
            },
            {
                "$group": {
                    "_id": {"$month": "$createdAt"},
                    "count": {"$sum": 1}
                }
            },
            {"$sort": {"_id": 1}}
        ]
        return list(self.collection.aggregate(pipeline))


# Singleton instance
session_repository = SessionRepository()
