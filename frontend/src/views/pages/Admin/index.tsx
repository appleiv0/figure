import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { adminApi, Statistics, Session, SessionListResponse } from "../../../services/adminApi";

const AdminDashboard = () => {
  // Auth State
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");

  // Statistics State
  const [stats, setStats] = useState<Statistics | null>(null);

  // Sessions State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Pagination State
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Search State
  const [searchName, setSearchName] = useState("");
  const [searchOrg, setSearchOrg] = useState("");

  // Sort State
  const [sortConfig, setSortConfig] = useState<{ key: keyof Session | "kid.name" | "counselor.name"; direction: "asc" | "desc" } | null>(null);

  // Get active tab from URL hash, default to "dashboard"
  const getTabFromHash = () => {
    const hash = window.location.hash.replace("#", "");
    return hash === "sessions" ? "sessions" : "dashboard";
  };

  const [activeTab, setActiveTabState] = useState<"dashboard" | "sessions">(getTabFromHash);

  const setActiveTab = (tab: "dashboard" | "sessions") => {
    window.location.hash = tab;
    setActiveTabState(tab);
  };

  // Auth Check on Mount
  useEffect(() => {
    const auth = sessionStorage.getItem("adminAuth");
    if (auth === "true") {
      setIsAuthenticated(true);
    }
  }, []);

  // Listen for hash changes
  useEffect(() => {
    const handleHashChange = () => {
      setActiveTabState(getTabFromHash());
    };
    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;

    const fetchStats = async () => {
      try {
        const data = await adminApi.getStatistics();
        setStats(data);
      } catch (err) {
        setError("통계를 불러오는데 실패했습니다.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isAuthenticated]);

  const fetchSessions = async (pageNum: number) => {
    setSessionsLoading(true);
    try {
      let data: SessionListResponse;
      if (searchName || searchOrg) {
        data = await adminApi.searchSessions(
          { kidName: searchName || undefined, organization: searchOrg || undefined },
          pageNum,
          20
        );
      } else {
        data = await adminApi.getSessions(pageNum, 20);
      }
      setSessions(data.sessions);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setSessionsLoading(false);
    }
  };

  // Fetch sessions when switching to sessions tab or when page changes
  useEffect(() => {
    if (isAuthenticated && activeTab === "sessions") {
      fetchSessions(page);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, activeTab, page]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const envPassword = import.meta.env.VITE_ADMIN_PASSWORD || "1234";
    if (passwordInput === envPassword) {
      sessionStorage.setItem("adminAuth", "true");
      setIsAuthenticated(true);
    } else {
      alert("비밀번호가 일치하지 않습니다.");
    }
  };

  const handleSearch = () => {
    setPage(1);
    fetchSessions(1);
  };

  const handleDelete = async (receiptNo: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await adminApi.deleteSession(receiptNo);
      fetchSessions(page);
      // Refresh stats too
      const statsData = await adminApi.getStatistics();
      setStats(statsData);
    } catch (err) {
      alert("삭제에 실패했습니다.");
    }
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleDateString("ko-KR", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Sorting Logic
  const handleSort = (key: keyof Session | "kid.name" | "counselor.name") => {
    let direction: "asc" | "desc" = "asc";
    if (sortConfig && sortConfig.key === key && sortConfig.direction === "asc") {
      direction = "desc";
    }
    setSortConfig({ key, direction });
  };

  const sortedSessions = useMemo(() => {
    if (!sortConfig) return sessions;

    return [...sessions].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof Session];
      let bValue: any = b[sortConfig.key as keyof Session];

      // Handle nested properties
      if (sortConfig.key === "kid.name") {
        aValue = a.kid?.name || "";
        bValue = b.kid?.name || "";
      } else if (sortConfig.key === "counselor.name") {
        aValue = a.counselor?.organization || ""; // Sorting by Org/Counselor string
        bValue = b.counselor?.organization || "";
      }

      if (aValue < bValue) {
        return sortConfig.direction === "asc" ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === "asc" ? 1 : -1;
      }
      return 0;
    });
  }, [sessions, sortConfig]);

  const getSortIcon = (key: string) => {
    if (sortConfig?.key !== key) return "↕";
    return sortConfig.direction === "asc" ? "↑" : "↓";
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <form onSubmit={handleLogin} className="bg-white p-8 rounded shadow-md w-96">
          <h2 className="text-2xl font-bold mb-6 text-center">관리자 로그인</h2>
          <input
            type="password"
            placeholder="비밀번호를 입력하세요"
            value={passwordInput}
            onChange={(e) => setPasswordInput(e.target.value)}
            className="w-full border p-2 rounded mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700 transition"
          >
            로그인
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <aside className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b">
          <h1 className="text-xl font-bold text-gray-800">관리자</h1>
          <p className="text-sm text-gray-500">심리검사 관리 시스템</p>
        </div>
        <nav className="p-4">
          <ul className="space-y-2">
            <li>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === "dashboard"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                대시보드
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("sessions")}
                className={`w-full text-left px-4 py-3 rounded-lg flex items-center gap-3 transition-colors ${activeTab === "sessions"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                세션 목록
              </button>
            </li>
          </ul>
        </nav>
        <div className="absolute bottom-0 w-64 p-4 border-t">
          <Link to="/" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            메인으로 돌아가기
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-auto">
        {activeTab === "dashboard" && (
          <>
            <h2 className="text-2xl font-bold mb-6">대시보드</h2>

            {loading ? (
              <div className="text-center py-8">로딩 중...</div>
            ) : error ? (
              <div className="text-center text-red-500 py-8">{error}</div>
            ) : (
              <>
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm font-medium">총 세션</h3>
                    <p className="text-3xl font-bold text-blue-600">{stats?.totalSessions || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm font-medium">완료된 세션</h3>
                    <p className="text-3xl font-bold text-green-600">{stats?.completedSessions || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm font-medium">진행 중</h3>
                    <p className="text-3xl font-bold text-yellow-600">{stats?.inProgressSessions || 0}</p>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-gray-500 text-sm font-medium">평균 점수</h3>
                    <p className="text-3xl font-bold text-purple-600">
                      {stats?.avgScore ? stats.avgScore.toFixed(1) : "-"}
                    </p>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold mb-4">빠른 작업</h3>
                  <div className="flex gap-4">
                    <button
                      onClick={() => setActiveTab("sessions")}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      세션 목록 보기
                    </button>
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {activeTab === "sessions" && (
          <>
            <h2 className="text-2xl font-bold mb-6">세션 목록</h2>

            {/* Search */}
            <div className="bg-white rounded-lg shadow p-4 mb-6">
              <div className="flex gap-4 flex-wrap">
                <input
                  type="text"
                  placeholder="아동 이름"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="기관명"
                  value={searchOrg}
                  onChange={(e) => setSearchOrg(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors"
                >
                  검색
                </button>
                {(searchName || searchOrg) && (
                  <button
                    onClick={() => {
                      setSearchName("");
                      setSearchOrg("");
                      setPage(1);
                      fetchSessions(1);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    초기화
                  </button>
                )}
              </div>
            </div>

            {/* Total count and refresh */}
            <div className="mb-4 flex justify-between items-center">
              <span className="text-gray-600">총 {total}개의 세션</span>
              <button
                onClick={() => fetchSessions(page)}
                disabled={sessionsLoading}
                className="flex items-center gap-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded transition-colors disabled:opacity-50"
              >
                <svg className={`w-4 h-4 ${sessionsLoading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                새로고침
              </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => handleSort("receiptNo")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      접수번호 <span className="ml-1">{getSortIcon("receiptNo")}</span>
                    </th>
                    <th
                      onClick={() => handleSort("kid.name")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      아동명 <span className="ml-1">{getSortIcon("kid.name")}</span>
                    </th>
                    <th
                      onClick={() => handleSort("counselor.name")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      기관/상담사 <span className="ml-1">{getSortIcon("counselor.name")}</span>
                    </th>
                    <th
                      onClick={() => handleSort("status")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      상태 <span className="ml-1">{getSortIcon("status")}</span>
                    </th>
                    <th
                      onClick={() => handleSort("score")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      점수 <span className="ml-1">{getSortIcon("score")}</span>
                    </th>
                    <th
                      onClick={() => handleSort("createdAt")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    >
                      생성일 <span className="ml-1">{getSortIcon("createdAt")}</span>
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessionsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center">
                        로딩 중...
                      </td>
                    </tr>
                  ) : sortedSessions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-4 text-center text-gray-500">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    sortedSessions.map((session) => (
                      <tr key={session.receiptNo} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {session.receiptNo}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {session.kid?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {session.counselor?.organization || "-"} / {session.counselor?.name || "-"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${session.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                              }`}
                          >
                            {session.status === "completed" ? "완료" : "진행중"}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          {session.score || 0}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(session.createdAt)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
                          <Link
                            to={`/admin/sessions/${session.receiptNo}`}
                            className="text-blue-600 hover:underline mr-4"
                          >
                            상세
                          </Link>
                          <button
                            onClick={() => handleDelete(session.receiptNo)}
                            className="text-red-600 hover:underline"
                          >
                            삭제
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 mt-6">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  이전
                </button>
                <span className="px-4 py-2">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="px-4 py-2 border rounded disabled:opacity-50 hover:bg-gray-50"
                >
                  다음
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
