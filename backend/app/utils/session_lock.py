import asyncio
import threading
from collections import defaultdict


class SessionLockManager:
    """Per-session lock manager to prevent concurrent mutations to the same session.

    Uses asyncio.Lock for async handlers and threading.Lock for sync handlers.
    Locks are keyed by receiptNo so different sessions can proceed in parallel.
    """

    def __init__(self):
        self._async_locks: dict[str, asyncio.Lock] = defaultdict(asyncio.Lock)
        self._sync_locks: dict[str, threading.Lock] = defaultdict(threading.Lock)
        self._manager_lock = threading.Lock()

    def get_async_lock(self, receipt_no: str) -> asyncio.Lock:
        """Get an asyncio lock for a specific session."""
        with self._manager_lock:
            if receipt_no not in self._async_locks:
                self._async_locks[receipt_no] = asyncio.Lock()
            return self._async_locks[receipt_no]

    def get_sync_lock(self, receipt_no: str) -> threading.Lock:
        """Get a threading lock for a specific session."""
        with self._manager_lock:
            if receipt_no not in self._sync_locks:
                self._sync_locks[receipt_no] = threading.Lock()
            return self._sync_locks[receipt_no]


# Singleton instance
session_locks = SessionLockManager()
