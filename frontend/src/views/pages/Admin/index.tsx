import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { adminApi, Statistics, Session, SessionListResponse } from "../../../services/adminApi";
import { exportSessionsToExcel } from "../../../utils/excelExport";

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
  const [pageSize, setPageSize] = useState(20);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [users, setUsers] = useState<Array<{ email: string; name: string; organization: string; sessionCount: number; lastUsed: string }>>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [creditModal, setCreditModal] = useState<{ email: string; credits: number } | null>(null);
  const [creditInput, setCreditInput] = useState("");

  const SUPER_USERS = ["appleiv@gmail.com"];

  // Search State
  const [searchName, setSearchName] = useState("");
  const [searchOrg, setSearchOrg] = useState("");
  const [searchSex, setSearchSex] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchAgeMin, setSearchAgeMin] = useState("");
  const [searchAgeMax, setSearchAgeMax] = useState("");


  // Selected Sessions State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // Get active tab from URL hash, default to "dashboard"
  const getTabFromHash = () => {
    const hash = window.location.hash.replace("#", "");
    if (hash === "sessions") return "sessions";
    if (hash === "users") return "users";
    return "dashboard";
  };

  const [activeTab, setActiveTabState] = useState<"dashboard" | "sessions" | "users">(getTabFromHash);

  const setActiveTab = (tab: "dashboard" | "sessions" | "users") => {
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
          pageSize
        );
      } else {
        data = await adminApi.getSessions(pageNum, pageSize);
      }

      setSessions(data.sessions);
      setTotalPages(data.totalPages);
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
  }, [isAuthenticated, activeTab, page, pageSize]);

  // Fetch users when switching to users tab
  useEffect(() => {
    if (isAuthenticated && activeTab === "users") {
      setUsersLoading(true);
      adminApi.getUsers()
        .then(data => setUsers(data.users))
        .catch(err => console.error(err))
        .finally(() => setUsersLoading(false));
    }
  }, [isAuthenticated, activeTab]);

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

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) {
      alert("삭제할 세션을 선택해주세요.");
      return;
    }
    if (!confirm(`선택한 ${selectedIds.size}건을 삭제하시겠습니까?`)) return;
    try {
      await Promise.all(Array.from(selectedIds).map(id => adminApi.deleteSession(id)));
      setSelectedIds(new Set());
      fetchSessions(page);
      const statsData = await adminApi.getStatistics();
      setStats(statsData);
    } catch (err) {
      alert("일부 삭제에 실패했습니다.");
      fetchSessions(page);
    }
  };

  const handleAIDatasetDownload = () => {
    const selectedSessions = filteredSessions.filter(s => selectedIds.has(s.receiptNo));
    if (selectedSessions.length === 0) {
      alert("세션을 선택해주세요.");
      return;
    }
    exportSessionsToExcel(selectedSessions, `AI_데이터셋_${new Date().toISOString().slice(0, 10).replace(/-/g, "")}.xlsx`);
  };

  const handleReset = () => {
    setSearchName("");
    setSearchOrg("");
    setSearchSex("");
    setSearchStatus("");
    setSearchAgeMin("");
    setSearchAgeMax("");
    setPage(1);
    fetchSessions(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("ko-KR", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const calculateAge = (birthDate: string): string => {
    if (!birthDate) return "-";
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return `${age}세`;
  };

  const formatSex = (sex: string): string => {
    if (sex === "Female") return "여";
    if (sex === "Male") return "남";
    return "-";
  };

  const filteredSessions = useMemo(() => {
    let filtered = sessions;

    if (searchSex) {
      filtered = filtered.filter(s => s.kid?.sex === searchSex);
    }
    if (searchStatus) {
      filtered = filtered.filter(s => s.status === searchStatus);
    }
    if (searchAgeMin || searchAgeMax) {
      filtered = filtered.filter(s => {
        if (!s.kid?.birth) return false;
        const birth = new Date(s.kid.birth);
        const today = new Date();
        let age = today.getFullYear() - birth.getFullYear();
        const monthDiff = today.getMonth() - birth.getMonth();
        if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
        if (searchAgeMin && age < parseInt(searchAgeMin)) return false;
        if (searchAgeMax && age > parseInt(searchAgeMax)) return false;
        return true;
      });
    }

    return filtered;
  }, [sessions, searchSex, searchStatus, searchAgeMin, searchAgeMax]);

  const handleSelectAll = () => {
    if (selectedIds.size === filteredSessions.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredSessions.map(s => s.receiptNo)));
    }
  };

  const handleSelectOne = (receiptNo: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(receiptNo)) {
      newSet.delete(receiptNo);
    } else {
      newSet.add(receiptNo);
    }
    setSelectedIds(newSet);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleCreditSave = async () => {
    if (!creditModal || !creditInput) return;
    try {
      await adminApi.setCredits(creditModal.email, parseInt(creditInput));
      setCreditModal(null);
      // Refresh users list
      const data = await adminApi.getUsers();
      setUsers(data.users);
    } catch (err) {
      alert("크레딧 변경에 실패했습니다.");
    }
  };

  const handleExcelDownload = () => {
    const selectedSessions = filteredSessions.filter(s => selectedIds.has(s.receiptNo));
    if (selectedSessions.length === 0) {
      alert("세션을 선택해주세요.");
      return;
    }
    exportSessionsToExcel(selectedSessions);
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
      {/* Sidebar - collapsible */}
      <aside className={`${sidebarOpen ? 'w-52' : 'w-12'} bg-white shadow-lg transition-all duration-200 relative flex-shrink-0`}>
        <div className={`${sidebarOpen ? 'p-4' : 'p-2'} border-b flex items-center justify-between`}>
          {sidebarOpen && <h1 className="text-sm font-bold text-gray-800">관리자</h1>}
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-1 hover:bg-gray-100 rounded">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={sidebarOpen ? "M11 19l-7-7 7-7" : "M13 5l7 7-7 7"} />
            </svg>
          </button>
        </div>
        <nav className={`${sidebarOpen ? 'p-2' : 'p-1'}`}>
          <ul className="space-y-1">
            <li>
              <button
                onClick={() => setActiveTab("dashboard")}
                className={`w-full text-left ${sidebarOpen ? 'px-3 py-2' : 'p-2 justify-center'} rounded-lg flex items-center gap-2 transition-colors text-sm ${activeTab === "dashboard"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
                title="대시보드"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                {sidebarOpen && '대시보드'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("sessions")}
                className={`w-full text-left ${sidebarOpen ? 'px-3 py-2' : 'p-2 justify-center'} rounded-lg flex items-center gap-2 transition-colors text-sm ${activeTab === "sessions"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
                title="세션 목록"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {sidebarOpen && '세션 목록'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("users")}
                className={`w-full text-left ${sidebarOpen ? 'px-3 py-2' : 'p-2 justify-center'} rounded-lg flex items-center gap-2 transition-colors text-sm ${activeTab === "users"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
                title="사용량 관리"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {sidebarOpen && '사용량 관리'}
              </button>
            </li>
          </ul>
        </nav>
        <div className={`absolute bottom-0 ${sidebarOpen ? 'w-52' : 'w-12'} p-2 border-t`}>
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1" title="메인으로">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {sidebarOpen && '메인'}
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 overflow-auto">
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

        {activeTab === "users" && (
          <>
            <h2 className="text-2xl font-bold mb-6">사용량 관리</h2>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <p className="text-gray-600 text-sm mb-4">Google 로그인 사용자별 검사 사용량을 관리합니다.</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">이메일</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">이름</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">사용 횟수</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">제한</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">최근 로그인</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">로딩 중...</td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-8 text-center text-gray-400 text-sm">등록된 사용자가 없습니다.</td>
                      </tr>
                    ) : (
                      users.map(user => {
                        const isSuperUser = SUPER_USERS.includes(user.email);
                        return (
                        <tr key={user.email} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">{user.email}{isSuperUser && <span className="ml-1 text-xs text-purple-600 font-bold">(슈퍼)</span>}</td>
                          <td className="px-4 py-2 text-sm">{user.name || "-"}</td>
                          <td className="px-4 py-2 text-sm font-semibold">{user.sessionCount}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {isSuperUser ? <span className="font-bold">-</span> : `${(user as any).credits ?? 10}회`}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {user.lastUsed ? new Date(user.lastUsed).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            {!isSuperUser && (
                              <button
                                className="text-blue-600 hover:underline text-xs"
                                onClick={() => { setCreditModal({ email: user.email, credits: (user as any).credits ?? 10 }); setCreditInput(String((user as any).credits ?? 10)); }}
                              >
                                제한 변경
                              </button>
                            )}
                          </td>
                        </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-lg shadow p-6">
              <p className="text-xs text-gray-400">슈퍼유저 ({SUPER_USERS.join(", ")})는 사용량 제한 없음 (- 표시)</p>
              <p className="text-xs text-gray-400">제한 변경 클릭 시 해당 사용자의 남은 크레딧을 수정할 수 있습니다.</p>
            </div>

            {/* 크레딧 변경 모달 */}
            {creditModal && (
              <div
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
                onClick={() => setCreditModal(null)}
              >
                <div style={{ background: "white", borderRadius: "12px", padding: "24px", minWidth: "320px" }} onClick={(e) => e.stopPropagation()}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>사용량 제한 변경</h3>
                  <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>{creditModal.email}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <label style={{ fontSize: "14px", color: "#374151" }}>남은 크레딧:</label>
                    <input
                      type="number"
                      value={creditInput}
                      onChange={(e) => setCreditInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && creditInput && handleCreditSave()}
                      style={{ width: "80px", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "14px" }}
                      autoFocus
                    />
                    <span style={{ fontSize: "14px", color: "#6b7280" }}>회</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
                    <button
                      onClick={() => setCreditModal(null)}
                      style={{ padding: "8px 16px", borderRadius: "6px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontSize: "14px" }}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleCreditSave}
                      style={{ padding: "8px 16px", borderRadius: "6px", border: "none", background: "#2563eb", color: "white", cursor: "pointer", fontSize: "14px" }}
                    >
                      저장
                    </button>
                  </div>
                </div>
              </div>
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
                  className="border rounded px-3 py-2"
                />
                <input
                  type="text"
                  placeholder="기관명"
                  value={searchOrg}
                  onChange={(e) => setSearchOrg(e.target.value)}
                  className="border rounded px-3 py-2"
                />
                <select
                  value={searchSex}
                  onChange={(e) => setSearchSex(e.target.value)}
                  style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "8px 12px", fontSize: "14px" }}
                >
                  <option value="">성별 전체</option>
                  <option value="Male">남</option>
                  <option value="Female">여</option>
                </select>
                <select
                  value={searchStatus}
                  onChange={(e) => setSearchStatus(e.target.value)}
                  style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "8px 12px", fontSize: "14px" }}
                >
                  <option value="">상태 전체</option>
                  <option value="completed">완료</option>
                  <option value="in_progress">진행중</option>
                </select>
                <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <input
                    type="number"
                    placeholder="최소 나이"
                    value={searchAgeMin}
                    onChange={(e) => setSearchAgeMin(e.target.value)}
                    style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "8px 12px", width: "90px", fontSize: "14px" }}
                  />
                  <span style={{ color: "#6b7280" }}>~</span>
                  <input
                    type="number"
                    placeholder="최대 나이"
                    value={searchAgeMax}
                    onChange={(e) => setSearchAgeMax(e.target.value)}
                    style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "8px 12px", width: "90px", fontSize: "14px" }}
                  />
                  <span style={{ color: "#6b7280", fontSize: "14px" }}>세</span>
                </div>
                <button
                  onClick={handleSearch}
                  className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                >
                  검색
                </button>
                <button
                  onClick={handleReset}
                  style={{ padding: "8px 16px", color: "#6b7280", fontSize: "14px", cursor: "pointer", background: "none", border: "none" }}
                >
                  초기화
                </button>
              </div>
            </div>

            {/* Total count and actions */}
            <div style={{ marginBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <span style={{ color: "#4b5563" }}>
                  총 {filteredSessions.length}개의 세션
                  {filteredSessions.length !== sessions.length ? ` (전체 ${sessions.length}개)` : ""}
                </span>
                <select
                  value={pageSize}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  style={{ border: "1px solid #d1d5db", borderRadius: "4px", padding: "4px 8px", fontSize: "14px" }}
                >
                  <option value={20}>20개씩</option>
                  <option value={40}>40개씩</option>
                  <option value={50}>50개씩</option>
                  <option value={100}>100개씩</option>
                  <option value={200}>200개씩</option>
                </select>
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={handleBulkDelete}
                  disabled={selectedIds.size === 0}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: selectedIds.size > 0 ? "#dc2626" : "#9ca3af",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: selectedIds.size > 0 ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  선택 삭제 ({selectedIds.size}건)
                </button>
                <button
                  onClick={handleExcelDownload}
                  disabled={selectedIds.size === 0}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: selectedIds.size > 0 ? "#2563eb" : "#9ca3af",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: selectedIds.size > 0 ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  엑셀 다운로드 ({selectedIds.size}건)
                </button>
                <button
                  onClick={handleAIDatasetDownload}
                  disabled={selectedIds.size === 0}
                  style={{
                    padding: "8px 16px",
                    backgroundColor: selectedIds.size > 0 ? "#7c3aed" : "#9ca3af",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: selectedIds.size > 0 ? "pointer" : "not-allowed",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  AI 데이터셋 ({selectedIds.size}건)
                </button>
              </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-lg shadow" style={{ overflowX: "auto" }}>
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "center", width: "40px" }}>
                      <input
                        type="checkbox"
                        checked={filteredSessions.length > 0 && selectedIds.size === filteredSessions.length}
                        onChange={handleSelectAll}
                        style={{ width: "16px", height: "16px", cursor: "pointer" }}
                      />
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      접수번호
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      아동명
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      성별
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      나이
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      기관/상담사
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      상태
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      가족유형
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      판정내용
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      역기능
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      긴장/갈등
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      생성일
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      관리
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {sessionsLoading ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-4 text-center">
                        로딩 중...
                      </td>
                    </tr>
                  ) : filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-6 py-4 text-center text-gray-500">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session) => (
                      <tr key={session.receiptNo} className="hover:bg-gray-50">
                        <td style={{ padding: "16px", textAlign: "center" }}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(session.receiptNo)}
                            onChange={() => handleSelectOne(session.receiptNo)}
                            style={{ width: "16px", height: "16px", cursor: "pointer" }}
                          />
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm">
                          {session.receiptNo}
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm font-medium">
                          {session.kid?.name || "-"}
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm">
                          {formatSex(session.kid?.sex)}
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm">
                          {calculateAge(session.kid?.birth)}
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm">
                          {session.counselor?.organization || "-"} / {session.counselor?.name || "-"}
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 text-xs rounded-full ${
                              session.status === "completed"
                                ? "bg-green-100 text-green-800"
                                : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {session.status === "completed" ? "완료" : "진행중"}
                          </span>
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm font-medium">
                          {(session as any).familyType || "-"}
                        </td>
                        <td className="px-0.5 py-1 text-sm" style={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {session.aiEvaluation || "-"}
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm">
                          {(() => {
                            const abuse = (session as any).abuse;
                            if (!abuse) return "-";
                            const sum = (abuse["1"] || 0) + (abuse["2"] || 0) + (abuse["3"] || 0);
                            return sum === 3
                              ? <span className="text-red-600 font-bold">있음</span>
                              : sum >= 1
                              ? <span className="text-yellow-600 font-semibold">가능성</span>
                              : <span className="text-green-600">없음</span>;
                          })()}
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm">
                          {(() => {
                            const t = (session as any).tension;
                            if (!t) return "-";
                            return t === "높음"
                              ? <span className="text-red-600 font-bold">{t}</span>
                              : t === "있음"
                              ? <span className="text-yellow-600 font-semibold">{t}</span>
                              : <span className="text-green-600">{t}</span>;
                          })()}
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm text-gray-500">
                          {formatDate(session.createdAt)}
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm">
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
              <div style={{ display: "flex", justifyContent: "center", gap: "4px", marginTop: "24px", flexWrap: "wrap" }}>
                <button
                  onClick={() => setPage(1)}
                  disabled={page === 1}
                  style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1, background: "white" }}
                >
                  «
                </button>
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "4px", cursor: page === 1 ? "not-allowed" : "pointer", opacity: page === 1 ? 0.5 : 1, background: "white" }}
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || (p >= page - 2 && p <= page + 2))
                  .map((p, idx, arr) => {
                    const elements = [];
                    if (idx > 0 && arr[idx - 1] !== p - 1) {
                      elements.push(<span key={`dot-${p}`} style={{ padding: "8px 4px" }}>...</span>);
                    }
                    elements.push(
                      <button
                        key={p}
                        onClick={() => setPage(p)}
                        style={{
                          padding: "8px 12px",
                          border: "1px solid #d1d5db",
                          borderRadius: "4px",
                          cursor: "pointer",
                          background: p === page ? "#2563eb" : "white",
                          color: p === page ? "white" : "#374151",
                          fontWeight: p === page ? 600 : 400,
                        }}
                      >
                        {p}
                      </button>
                    );
                    return elements;
                  })}
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "4px", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1, background: "white" }}
                >
                  ›
                </button>
                <button
                  onClick={() => setPage(totalPages)}
                  disabled={page === totalPages}
                  style={{ padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: "4px", cursor: page === totalPages ? "not-allowed" : "pointer", opacity: page === totalPages ? 0.5 : 1, background: "white" }}
                >
                  »
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
