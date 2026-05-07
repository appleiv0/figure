"""Per-session lock manager with LRU eviction to prevent memory leaks."""
import asyncio
import threading
from collections import OrderedDict


# 동시에 진행 중인 세션 수보다 충분히 큰 값. 이를 초과하면 가장 오래 안 쓰인 락부터 제거됨.
# 1000개면 100명 동시 평가 × 10배 여유. 메모리도 미미 (~수십KB).
_MAX_LOCKS = 1000


class SessionLockManager:
    """Per-session lock manager with LRU eviction.

    Uses asyncio.Lock for async handlers and threading.Lock for sync handlers.
    Locks are keyed by receiptNo so different sessions can proceed in parallel.

    Locks are evicted in LRU order when count exceeds _MAX_LOCKS to prevent
    unbounded memory growth.
    """

    def __init__(self):
        self._async_locks: "OrderedDict[str, asyncio.Lock]" = OrderedDict()
        self._sync_locks: "OrderedDict[str, threading.Lock]" = OrderedDict()
        self._manager_lock = threading.Lock()

    def _evict_if_needed(self, locks: OrderedDict) -> None:
        """LRU 순서대로 가장 오래 안 쓰인 락 제거. _manager_lock 안에서 호출돼야 함."""
        while len(locks) > _MAX_LOCKS:
            locks.popitem(last=False)

    def get_async_lock(self, receipt_no: str) -> asyncio.Lock:
        """Get an asyncio lock for a specific session. Marks as recently used."""
        with self._manager_lock:
            if receipt_no in self._async_locks:
                self._async_locks.move_to_end(receipt_no)
            else:
                self._async_locks[receipt_no] = asyncio.Lock()
                self._evict_if_needed(self._async_locks)
            return self._async_locks[receipt_no]

    def get_sync_lock(self, receipt_no: str) -> threading.Lock:
        """Get a threading lock for a specific session. Marks as recently used."""
        with self._manager_lock:
            if receipt_no in self._sync_locks:
                self._sync_locks.move_to_end(receipt_no)
            else:
                self._sync_locks[receipt_no] = threading.Lock()
                self._evict_if_needed(self._sync_locks)
            return self._sync_locks[receipt_no]

    def release(self, receipt_no: str) -> None:
        """명시적으로 락 제거 — 세션 완료 시 호출하면 즉시 정리.

        호출 안 해도 LRU에 의해 자동 정리되므로 옵션. 단,
        complete_session 같은 명확한 종료 시점에서는 호출 권장.
        """
        with self._manager_lock:
            self._async_locks.pop(receipt_no, None)
            self._sync_locks.pop(receipt_no, None)

    def stats(self) -> dict:
        """모니터링용 — 현재 락 카운트 반환."""
        with self._manager_lock:
            return {
                "async_lock_count": len(self._async_locks),
                "sync_lock_count": len(self._sync_locks),
                "max_locks": _MAX_LOCKS,
            }


# Singleton instance
session_locks = SessionLockManager()
