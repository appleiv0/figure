#!/usr/bin/env python3
"""
Migration script to transfer existing JSON therapy session files to MongoDB.

Usage:
    python scripts/migrate_json_to_mongodb.py

This script will:
1. Read all JSON files from therapy_result/ directory
2. Transform and validate data
3. Insert into MongoDB therapy_sessions collection
4. Report migration statistics
"""

import os
import sys
import json
from datetime import datetime
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from app.database.mongodb import get_sessions_collection, mongodb
from pymongo.errors import DuplicateKeyError

# Configuration
THERAPY_RESULT_DIR = "therapy_result"
TEMPLATE_FILE = "0_template.json"


def load_json_file(file_path: str) -> dict:
    """Load and parse a JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None


def transform_session_data(data: dict, filename: str) -> dict:
    """Transform JSON data to MongoDB document format"""
    # Convert receiptNo to string for consistency
    if "receiptNo" in data:
        data["receiptNo"] = str(data["receiptNo"])

    # Add timestamps if not present
    if "createdAt" not in data:
        # Try to extract from date field or filename
        if data.get("date"):
            try:
                data["createdAt"] = datetime.strptime(data["date"], "%Y%m%d%H%M%S")
            except:
                data["createdAt"] = datetime.utcnow()
        else:
            data["createdAt"] = datetime.utcnow()

    if "updatedAt" not in data:
        data["updatedAt"] = data["createdAt"]

    # Add status field
    if "status" not in data:
        # If report exists, mark as completed
        data["status"] = "completed" if data.get("report") else "in_progress"

    # Initialize chatHistory if not present
    if "chatHistory" not in data:
        data["chatHistory"] = []

    # Add source filename for tracking
    data["_migrated_from"] = filename
    data["_migrated_at"] = datetime.utcnow()

    return data


def migrate_sessions():
    """Main migration function"""
    print("=" * 60)
    print("MongoDB Migration Script")
    print("=" * 60)

    # Connect to MongoDB
    print("\n1. Connecting to MongoDB...")
    try:
        collection = get_sessions_collection()
        print(f"   Connected to database: {mongodb._db.name}")
        print(f"   Collection: {collection.name}")
    except Exception as e:
        print(f"   ERROR: Failed to connect to MongoDB: {e}")
        return False

    # Get list of JSON files
    print(f"\n2. Scanning {THERAPY_RESULT_DIR}/ directory...")
    json_files = []

    if not os.path.exists(THERAPY_RESULT_DIR):
        print(f"   ERROR: Directory {THERAPY_RESULT_DIR} not found!")
        return False

    for filename in os.listdir(THERAPY_RESULT_DIR):
        if filename.endswith('.json') and filename != TEMPLATE_FILE:
            json_files.append(filename)

    print(f"   Found {len(json_files)} JSON files (excluding template)")

    if not json_files:
        print("   No files to migrate.")
        return True

    # Migration statistics
    stats = {
        "total": len(json_files),
        "success": 0,
        "skipped": 0,
        "failed": 0
    }

    # Process each file
    print(f"\n3. Migrating sessions...")
    print("-" * 60)

    for filename in json_files:
        file_path = os.path.join(THERAPY_RESULT_DIR, filename)

        # Load JSON
        data = load_json_file(file_path)
        if data is None:
            print(f"   FAILED: {filename} - Could not load file")
            stats["failed"] += 1
            continue

        # Transform data
        transformed = transform_session_data(data, filename)

        # Check if already migrated
        existing = collection.find_one({"receiptNo": transformed.get("receiptNo")})
        if existing:
            print(f"   SKIPPED: {filename} - Already exists (receiptNo: {transformed.get('receiptNo')})")
            stats["skipped"] += 1
            continue

        # Insert into MongoDB
        try:
            result = collection.insert_one(transformed)
            print(f"   SUCCESS: {filename} -> {result.inserted_id}")
            stats["success"] += 1
        except DuplicateKeyError:
            print(f"   SKIPPED: {filename} - Duplicate receiptNo")
            stats["skipped"] += 1
        except Exception as e:
            print(f"   FAILED: {filename} - {e}")
            stats["failed"] += 1

    # Print summary
    print("-" * 60)
    print(f"\n4. Migration Summary")
    print(f"   Total files:    {stats['total']}")
    print(f"   Successful:     {stats['success']}")
    print(f"   Skipped:        {stats['skipped']}")
    print(f"   Failed:         {stats['failed']}")

    # Verify migration
    print(f"\n5. Verification")
    total_docs = collection.count_documents({})
    print(f"   Total documents in MongoDB: {total_docs}")

    # Close connection
    mongodb.close()
    print("\n6. Migration complete!")
    print("=" * 60)

    return stats["failed"] == 0


if __name__ == "__main__":
    success = migrate_sessions()
    sys.exit(0 if success else 1)
