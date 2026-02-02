from pymongo import MongoClient
from pymongo.database import Database
from pymongo.collection import Collection
from typing import Optional
import libcommon.config.config as config

class MongoDB:
    _instance: Optional['MongoDB'] = None
    _client: Optional[MongoClient] = None
    _db: Optional[Database] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def connect(self) -> Database:
        """Connect to MongoDB and return database instance"""
        if self._client is None:
            self._client = MongoClient(config.MONGODB_URI)
            self._db = self._client[config.MONGODB_DB_NAME]

            # Create indexes for therapy_sessions collection
            self._create_indexes()

        return self._db

    def _create_indexes(self):
        """Create indexes for better query performance"""
        sessions = self._db["therapy_sessions"]

        # Unique index on receiptNo
        sessions.create_index("receiptNo", unique=True)
        # Index for searching by kid name
        sessions.create_index("kid.name")
        # Index for date-based queries
        sessions.create_index("createdAt")
        # Index for organization-based queries
        sessions.create_index("counselor.organization")
        # Compound index for common queries
        sessions.create_index([("createdAt", -1), ("status", 1)])

    def get_db(self) -> Database:
        """Get database instance, connecting if necessary"""
        if self._db is None:
            self.connect()
        return self._db

    def get_collection(self, name: str) -> Collection:
        """Get a collection by name"""
        return self.get_db()[name]

    def close(self):
        """Close the MongoDB connection"""
        if self._client:
            self._client.close()
            self._client = None
            self._db = None

# Singleton instance
mongodb = MongoDB()

def get_database() -> Database:
    """Get the database instance"""
    return mongodb.get_db()

def get_sessions_collection() -> Collection:
    """Get the therapy_sessions collection"""
    return mongodb.get_collection("therapy_sessions")
