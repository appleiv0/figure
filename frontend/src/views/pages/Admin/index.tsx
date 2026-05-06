import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";
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

  // Add User Modal State
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserName, setNewUserName] = useState("");
  const [newUserOrg, setNewUserOrg] = useState("");
  const [addUserLoading, setAddUserLoading] = useState(false);

  // Codes Tab State
  const [codeGenOrg, setCodeGenOrg] = useState("");
  const [codeGenEmail, setCodeGenEmail] = useState("");
  const [codeGenCount, setCodeGenCount] = useState(1);
  const [codeGenLoading, setCodeGenLoading] = useState(false);
  const [generatedCodes, setGeneratedCodes] = useState<Array<{ code: string; email: string; name: string; organization: string; createdAt: string }>>([]);

  // Show Result Toggle State
  const [showResult, setShowResult] = useState(true);
  const [showResultLoading, setShowResultLoading] = useState(false);

  const [superUsers, setSuperUsers] = useState<string[]>(["appleiv@gmail.com", "a33351702@gmail.com", "beratung@hansei.ac.kr", "kaft2960@gmail.com"]);
  const currentAuth = JSON.parse(sessionStorage.getItem("counselorAuth") || "{}");
  const currentUserEmail = currentAuth.email || "";
  const isSuperUserLoggedIn = superUsers.includes(currentUserEmail);

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
    if (hash === "codes") return "codes";
    return "dashboard";
  };

  const [activeTab, setActiveTabState] = useState<"dashboard" | "sessions" | "users" | "codes" | "evaluations" | "settings">(getTabFromHash);

  const navigate = useNavigate();

  const setActiveTab = (tab: "dashboard" | "sessions" | "users" | "codes" | "evaluations" | "settings") => {
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

  // Load showResult setting on auth
  useEffect(() => {
    if (isAuthenticated) {
      adminApi.getSettings().then(data => setShowResult(data.showResultToUser)).catch(() => {});
      adminApi.getSuperUsers().then(data => setSuperUsers(data.superUsers)).catch(() => {});
    }
  }, [isAuthenticated]);

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

  // Fetch users when switching to users or codes tab
  useEffect(() => {
    if (isAuthenticated && (activeTab === "users" || activeTab === "codes")) {
      setUsersLoading(true);
      adminApi.getUsers()
        .then(data => setUsers(data.users.filter((u: any) => u.registered !== false)))
        .catch(err => console.error(err))
        .finally(() => setUsersLoading(false));
    }
  }, [isAuthenticated, activeTab]);

  // Fetch evaluation requests
  const [evalRequests, setEvalRequests] = useState<any[]>([]);
  const [evalLoading, setEvalLoading] = useState(false);
  useEffect(() => {
    if (isAuthenticated && activeTab === "evaluations") {
      setEvalLoading(true);
      adminApi.getSessions(1, 100)
        .then(data => {
          const pending = data.sessions.filter((s: any) => s.evaluationRequested && !s.evaluationCompleted);
          const completed = data.sessions.filter((s: any) => s.evaluationRequested && s.evaluationCompleted);
          setEvalRequests([...pending, ...completed]);
        })
        .catch(err => console.error(err))
        .finally(() => setEvalLoading(false));
    }
  }, [isAuthenticated, activeTab]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const envPassword = import.meta.env.VITE_ADMIN_PASSWORD || "";
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

  const handleAddUser = async () => {
    if (!newUserEmail.trim()) return;
    setAddUserLoading(true);
    try {
      await adminApi.createUser(newUserEmail.trim(), newUserName.trim(), newUserOrg.trim());
      setShowAddUserModal(false);
      // Refresh users list
      const data = await adminApi.getUsers();
      setUsers(data.users.filter((u: any) => u.registered !== false));
    } catch (err: any) {
      const msg = err?.response?.data?.detail || "사용자 등록에 실패했습니다.";
      alert(msg);
    } finally {
      setAddUserLoading(false);
    }
  };

  const handleCreditSave = async () => {
    if (!creditModal || !creditInput) return;
    try {
      await adminApi.setCredits(creditModal.email, parseInt(creditInput));
      setCreditModal(null);
      // Refresh users list
      const data = await adminApi.getUsers();
      setUsers(data.users.filter((u: any) => u.registered !== false));
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
            {isSuperUserLoggedIn && (
            <li>
              <button
                onClick={() => setActiveTab("users")}
                className={`w-full text-left ${sidebarOpen ? 'px-3 py-2' : 'p-2 justify-center'} rounded-lg flex items-center gap-2 transition-colors text-sm ${activeTab === "users"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
                title="사용자 관리"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {sidebarOpen && '사용자 관리'}
              </button>
            </li>
            )}
            <li>
              <button
                onClick={() => setActiveTab("codes")}
                className={`w-full text-left ${sidebarOpen ? 'px-3 py-2' : 'p-2 justify-center'} rounded-lg flex items-center gap-2 transition-colors text-sm ${activeTab === "codes"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
                title="코드 관리"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                </svg>
                {sidebarOpen && '코드 관리'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("evaluations")}
                className={`w-full text-left ${sidebarOpen ? 'px-3 py-2' : 'p-2 justify-center'} rounded-lg flex items-center gap-2 transition-colors text-sm ${activeTab === "evaluations"
                    ? "bg-red-50 text-red-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
                title="판정 의뢰"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
                {sidebarOpen && '판정 의뢰'}
              </button>
            </li>
            <li>
              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full text-left ${sidebarOpen ? 'px-3 py-2' : 'p-2 justify-center'} rounded-lg flex items-center gap-2 transition-colors text-sm ${activeTab === "settings"
                    ? "bg-blue-50 text-blue-700 font-medium"
                    : "text-gray-600 hover:bg-gray-50"
                  }`}
                title="설정"
              >
                <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {sidebarOpen && '설정'}
              </button>
            </li>
          </ul>
        </nav>
        <div className={`absolute bottom-0 ${sidebarOpen ? 'w-52' : 'w-12'} p-2 border-t`}>
          <Link to="/" className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 mb-2" title="메인으로">
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {sidebarOpen && '메인'}
          </Link>
          <button
            onClick={() => {
              sessionStorage.removeItem("adminAuth");
              sessionStorage.removeItem("counselorAuth");
              navigate("/login");
            }}
            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 w-full"
            title="로그아웃"
          >
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {sidebarOpen && '로그아웃'}
          </button>
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
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
              <h2 className="text-2xl font-bold">사용자 관리</h2>
              <button
                onClick={() => { setShowAddUserModal(true); setNewUserEmail(""); setNewUserName(""); setNewUserOrg(""); }}
                style={{
                  padding: "8px 20px",
                  backgroundColor: "#2563eb",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 600,
                }}
              >
                새 사용자 등록
              </button>
            </div>
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <p className="text-gray-600 text-sm mb-4">등록된 사용자만 Google 로그인이 가능합니다.</p>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">이메일</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">이름</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">소속</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">사용 횟수</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">크레딧</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">최근 로그인</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">관리</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {usersLoading ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">로딩 중...</td>
                      </tr>
                    ) : users.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="px-4 py-8 text-center text-gray-400 text-sm">등록된 사용자가 없습니다.</td>
                      </tr>
                    ) : (
                      users.map(user => {
                        const isSuperUser = superUsers.includes(user.email);
                        return (
                        <tr key={user.email} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm">
                            {user.email}
                            {isSuperUser && <span className="ml-1 text-xs text-purple-600 font-bold">(슈퍼)</span>}
                            {!(user as any).registered && !isSuperUser && <span className="ml-1 text-xs text-orange-500 font-bold">(미등록)</span>}
                          </td>
                          <td className="px-4 py-2 text-sm">{user.name || "-"}</td>
                          <td className="px-4 py-2 text-sm">{(user as any).organization || "-"}</td>
                          <td className="px-4 py-2 text-sm font-semibold">{user.sessionCount}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {isSuperUser ? <span className="font-bold">무제한</span> : `${(user as any).credits ?? 10}회`}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {user.lastUsed ? new Date(user.lastUsed).toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }) : "-"}
                          </td>
                          <td className="px-4 py-2 text-sm">
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              {isSuperUserLoggedIn && user.email !== currentUserEmail && (
                                <button
                                  className={`px-2 py-1 rounded text-xs font-bold ${
                                    isSuperUser
                                      ? "bg-yellow-500 text-white"
                                      : "bg-gray-200 text-gray-600"
                                  }`}
                                  onClick={async () => {
                                    const action = isSuperUser ? "remove" : "add";
                                    try {
                                      const result = await adminApi.updateSuperUser(user.email, action);
                                      setSuperUsers(result.superUsers);
                                    } catch (e) {
                                      alert("슈퍼 유저 변경에 실패했습니다.");
                                    }
                                  }}
                                >
                                  {isSuperUser ? "★ 슈퍼유저" : "일반유저"}
                                </button>
                              )}
                              {!isSuperUser && (
                                <button
                                  className="text-blue-600 hover:underline text-xs"
                                  onClick={() => { setCreditModal({ email: user.email, credits: (user as any).credits ?? 10 }); setCreditInput(String((user as any).credits ?? 10)); }}
                                >
                                  크레딧
                                </button>
                              )}
                              {!isSuperUser && (
                                <button
                                  className="text-red-600 hover:underline text-xs"
                                  onClick={async () => {
                                    if (!confirm(`${user.email} 사용자를 삭제하시겠습니까?\n삭제된 사용자는 더 이상 로그인할 수 없습니다.`)) return;
                                    try {
                                      await adminApi.deleteUser(user.email);
                                      const data = await adminApi.getUsers();
                                      setUsers(data.users.filter((u: any) => u.registered !== false));
                                    } catch (err) {
                                      alert("사용자 삭제에 실패했습니다.");
                                    }
                                  }}
                                >
                                  삭제
                                </button>
                              )}
                            </div>
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
              <p className="text-xs text-gray-400">슈퍼유저 ({superUsers.join(", ")})는 삭제 불가, 크레딧 무제한</p>
              <p className="text-xs text-gray-400">새 사용자를 등록하면 Google 로그인 시 접근이 허용됩니다.</p>
            </div>

            {/* 크레딧 변경 모달 */}
            {creditModal && (
              <div
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
                onClick={() => setCreditModal(null)}
              >
                <div style={{ background: "white", borderRadius: "12px", padding: "24px", minWidth: "320px" }} onClick={(e) => e.stopPropagation()}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, marginBottom: "8px" }}>크레딧 변경</h3>
                  <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "16px" }}>{creditModal.email}</p>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
                    <label style={{ fontSize: "14px", color: "#374151" }}>크레딧:</label>
                    <input
                      type="number"
                      value={creditInput}
                      onChange={(e) => setCreditInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !e.nativeEvent.isComposing && creditInput && handleCreditSave()}
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

            {/* 새 사용자 등록 모달 */}
            {showAddUserModal && (
              <div
                style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
                onClick={() => setShowAddUserModal(false)}
              >
                <div style={{ background: "white", borderRadius: "12px", padding: "28px", minWidth: "360px", maxWidth: "440px", width: "100%" }} onClick={(e) => e.stopPropagation()}>
                  <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", color: "#111827" }}>새 사용자 등록</h3>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>이메일 *</label>
                    <input
                      type="email"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      placeholder="user@example.com"
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                      autoFocus
                    />
                  </div>

                  <div style={{ marginBottom: "14px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>이름</label>
                    <input
                      type="text"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      placeholder="이름을 입력해주세요"
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ marginBottom: "24px" }}>
                    <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>소속(상담기관)</label>
                    <input
                      type="text"
                      value={newUserOrg}
                      onChange={(e) => setNewUserOrg(e.target.value)}
                      placeholder="소속 기관명을 입력해주세요"
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.nativeEvent.isComposing && !addUserLoading && newUserEmail.trim()) {
                          handleAddUser();
                        }
                      }}
                      style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                    />
                  </div>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => setShowAddUserModal(false)}
                      style={{
                        flex: 1,
                        padding: "12px",
                        background: "white",
                        color: "#6b7280",
                        border: "1px solid #d1d5db",
                        borderRadius: "8px",
                        fontSize: "15px",
                        cursor: "pointer",
                      }}
                    >
                      취소
                    </button>
                    <button
                      onClick={handleAddUser}
                      disabled={!newUserEmail.trim() || addUserLoading}
                      style={{
                        flex: 1,
                        padding: "12px",
                        backgroundColor: !newUserEmail.trim() || addUserLoading ? "#9ca3af" : "#2563eb",
                        color: "white",
                        border: "none",
                        borderRadius: "8px",
                        fontSize: "15px",
                        fontWeight: 600,
                        cursor: !newUserEmail.trim() || addUserLoading ? "not-allowed" : "pointer",
                      }}
                    >
                      {addUserLoading ? "등록 중..." : "등록"}
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
                      판정 의뢰
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      가족체계유형
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      가족 관계
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      가족기능
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      긴장/갈등
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      신뢰도
                    </th>
                    <th className="px-0.5 py-1 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">
                      가족배치
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
                      <td colSpan={13} className="px-6 py-4 text-center">
                        로딩 중...
                      </td>
                    </tr>
                  ) : filteredSessions.length === 0 ? (
                    <tr>
                      <td colSpan={13} className="px-6 py-4 text-center text-gray-500">
                        데이터가 없습니다.
                      </td>
                    </tr>
                  ) : (
                    filteredSessions.map((session, idx) => (
                      <tr key={session.receiptNo} style={{ background: idx % 2 === 0 ? '#ffffff' : '#FFFBF0' }}>
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
                            {session.status === "completed" ? "완료" : `진행중 (${(session as any).currentStep ?? 0}/7)`}
                          </span>
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm">
                          {(session as any).evaluationRequested ? (
                            (session as any).evaluationCompleted
                              ? <span style={{color:"#16a34a",fontWeight:600}}>판정완료</span>
                              : <span style={{color:"#dc2626",fontWeight:700,background:"#fef2f2",padding:"2px 8px",borderRadius:12,fontSize:12}}>의뢰접수</span>
                          ) : <span style={{color:"#9ca3af"}}>-</span>}
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
                              ? <span className="text-red-600 font-bold">역기능 있음</span>
                              : sum >= 1
                              ? <span className="text-yellow-600 font-semibold">역기능 가능성</span>
                              : <span className="text-green-600">역기능 없음</span>;
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
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm">
                          {(() => {
                            const reliability = (session as any).reliability;
                            if (!reliability?.grade) return <span style={{color:'#9ca3af'}}>-</span>;
                            if (reliability.grade === "높음") return <span style={{color:'#16a34a'}}>{reliability.grade}</span>;
                            if (reliability.grade === "보통") return <span style={{color:'#ca8a04'}}>{reliability.grade}</span>;
                            if (reliability.grade === "낮음") return <span style={{color:'#dc2626',fontWeight:'bold'}}>{reliability.grade}</span>;
                            return <span>{reliability.grade}</span>;
                          })()}
                        </td>
                        <td className="px-0.5 py-1 whitespace-nowrap text-sm">
                          {(session as any).canvasImage
                            ? <span style={{color:"#16a34a",fontWeight:600}}>있음</span>
                            : <span style={{color:"#dc2626",fontWeight:700}}>없음</span>}
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
        {activeTab === "codes" && (
          <>
            <h2 className="text-2xl font-bold mb-6">코드 관리</h2>

            {/* Code Generation Section */}
            <div className="bg-white rounded-lg shadow p-6 mb-6">
              <h3 className="text-lg font-semibold mb-4">일회용 코드 생성</h3>
              <div style={{ display: "flex", alignItems: "flex-end", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>소속</label>
                  <select
                    value={codeGenOrg}
                    onChange={(e) => { setCodeGenOrg(e.target.value); setCodeGenEmail(""); }}
                    style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", minWidth: "180px" }}
                    disabled={usersLoading}
                  >
                    <option value="">{usersLoading ? "로딩 중..." : "소속을 선택하세요"}</option>
                    {[...new Set(users.map(u => u.organization).filter(org => !!org))].sort().map(org => (
                      <option key={org} value={org}>{org}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>상담사</label>
                  <select
                    value={codeGenEmail}
                    onChange={(e) => setCodeGenEmail(e.target.value)}
                    style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", minWidth: "220px" }}
                    disabled={usersLoading || !codeGenOrg}
                  >
                    <option value="">상담사를 선택하세요</option>
                    {users
                      .filter(u => u.organization === codeGenOrg)
                      .sort((a, b) => (a.name || "").localeCompare(b.name || ""))
                      .map(u => (
                        <option key={u.email} value={u.email}>
                          {u.name} ({u.email})
                        </option>
                      ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>생성 수량</label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={codeGenCount}
                    onChange={(e) => setCodeGenCount(Math.min(100, Math.max(1, parseInt(e.target.value) || 1)))}
                    style={{ border: "1px solid #d1d5db", borderRadius: "6px", padding: "8px 12px", fontSize: "14px", width: "80px" }}
                  />
                </div>
                <button
                  disabled={!codeGenEmail || codeGenLoading}
                  onClick={async () => {
                    if (!codeGenEmail) return;
                    const selectedUser = users.find(u => u.email === codeGenEmail);
                    setCodeGenLoading(true);
                    try {
                      const results: Array<{ code: string; email: string; name: string; organization: string; createdAt: string }> = [];
                      for (let i = 0; i < codeGenCount; i++) {
                        const res = await adminApi.generateCode(
                          codeGenEmail,
                          selectedUser?.name || "",
                          selectedUser?.organization || ""
                        );
                        results.push({
                          code: res.code,
                          email: codeGenEmail,
                          name: selectedUser?.name || "",
                          organization: selectedUser?.organization || "",
                          createdAt: new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" }),
                        });
                      }
                      setGeneratedCodes(prev => [...results, ...prev]);
                    } catch (err) {
                      alert("코드 생성에 실패했습니다.");
                      console.error(err);
                    } finally {
                      setCodeGenLoading(false);
                    }
                  }}
                  style={{
                    padding: "8px 20px",
                    backgroundColor: !codeGenEmail || codeGenLoading ? "#9ca3af" : "#2563eb",
                    color: "white",
                    border: "none",
                    borderRadius: "6px",
                    cursor: !codeGenEmail || codeGenLoading ? "not-allowed" : "pointer",
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  {codeGenLoading ? "생성 중..." : "생성"}
                </button>
              </div>
            </div>

            {/* Generated Codes Table */}
            {generatedCodes.length > 0 && (
              <div className="bg-white rounded-lg shadow p-6">
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                  <h3 className="text-lg font-semibold">생성된 코드 ({generatedCodes.length}개)</h3>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      onClick={() => {
                        const text = generatedCodes.map(c => c.code).join("\n");
                        navigator.clipboard.writeText(text).then(() => alert("전체 코드가 복사되었습니다."));
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#059669",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      전체 복사
                    </button>
                    <button
                      onClick={() => {
                        const wsData = [
                          ["번호", "코드", "이메일", "이름", "소속", "생성일시"],
                          ...generatedCodes.map((c, i) => [i + 1, c.code, c.email, c.name, c.organization, c.createdAt]),
                        ];
                        const ws = XLSX.utils.aoa_to_sheet(wsData);
                        const wb = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(wb, ws, "일회용코드");
                        const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
                        XLSX.writeFile(wb, `일회용코드_${today}.xlsx`);
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "#7c3aed",
                        color: "white",
                        border: "none",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                        fontWeight: 500,
                      }}
                    >
                      엑셀 내보내기
                    </button>
                    <button
                      onClick={() => {
                        if (confirm("생성된 코드 목록을 모두 지우시겠습니까?")) setGeneratedCodes([]);
                      }}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: "white",
                        color: "#6b7280",
                        border: "1px solid #d1d5db",
                        borderRadius: "6px",
                        cursor: "pointer",
                        fontSize: "14px",
                      }}
                    >
                      목록 지우기
                    </button>
                  </div>
                </div>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">번호</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">코드</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">이메일</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">이름</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">소속</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">생성일시</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">복사</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {generatedCodes.map((c, i) => (
                        <tr key={i} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm text-gray-500">{i + 1}</td>
                          <td className="px-4 py-2 text-sm font-mono font-semibold text-blue-700">{c.code}</td>
                          <td className="px-4 py-2 text-sm">{c.email}</td>
                          <td className="px-4 py-2 text-sm">{c.name || "-"}</td>
                          <td className="px-4 py-2 text-sm">{c.organization || "-"}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{c.createdAt}</td>
                          <td className="px-4 py-2 text-sm">
                            <button
                              onClick={() => navigator.clipboard.writeText(c.code).then(() => alert("복사되었습니다."))}
                              style={{
                                padding: "4px 10px",
                                backgroundColor: "#eff6ff",
                                color: "#2563eb",
                                border: "1px solid #bfdbfe",
                                borderRadius: "4px",
                                cursor: "pointer",
                                fontSize: "12px",
                              }}
                            >
                              복사
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {activeTab === "evaluations" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>판정 의뢰 목록</h2>
            {evalLoading ? (
              <p style={{ textAlign: "center", padding: 40, color: "#888" }}>로딩 중...</p>
            ) : evalRequests.length === 0 ? (
              <p style={{ textAlign: "center", padding: 40, color: "#888" }}>판정 의뢰가 없습니다.</p>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>접수번호</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>아동명</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>기관/상담사</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>의뢰 상태</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>가족체계유형</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 600, color: "#6b7280" }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evalRequests.map((s: any, idx: number) => (
                      <tr key={s.receiptNo} style={{ background: idx % 2 === 0 ? "#fff" : "#FFFBF0", borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "10px 12px" }}>{s.receiptNo}</td>
                        <td style={{ padding: "10px 12px", fontWeight: 600 }}>{s.kid?.name || "-"}</td>
                        <td style={{ padding: "10px 12px" }}>{s.counselor?.organization || "-"} / {s.counselor?.name || "-"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          {s.evaluationCompleted
                            ? <span style={{ color: "#16a34a", fontWeight: 700 }}>판정완료</span>
                            : <span style={{ color: "#dc2626", fontWeight: 700, background: "#fef2f2", padding: "3px 10px", borderRadius: 12, fontSize: 12 }}>의뢰접수</span>}
                        </td>
                        <td style={{ padding: "10px 12px" }}>{s.familyType || "-"}</td>
                        <td style={{ padding: "10px 12px" }}>
                          <Link
                            to={`/admin/sessions/${s.receiptNo}`}
                            style={{ color: "#2563eb", textDecoration: "underline", fontSize: 13 }}
                          >
                            {s.evaluationCompleted ? "결과보기" : "판정하기"}
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 20 }}>설정</h2>
            <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: 24 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>검사결과 보여주기</h3>
                  <p style={{ fontSize: 13, color: "#6b7280", margin: "4px 0 0" }}>검사 종료 시 내담자에게 결과를 보여줍니다</p>
                </div>
                <button
                  onClick={async () => {
                    setShowResultLoading(true);
                    try {
                      const newVal = !showResult;
                      await adminApi.updateSettings({ showResultToUser: newVal });
                      setShowResult(newVal);
                    } catch (e) { alert("설정 변경 실패"); }
                    finally { setShowResultLoading(false); }
                  }}
                  disabled={showResultLoading}
                  style={{
                    padding: "8px 24px",
                    borderRadius: 20,
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 700,
                    fontSize: 14,
                    background: showResult ? "#16a34a" : "#dc2626",
                    color: "#fff",
                    opacity: showResultLoading ? 0.6 : 1,
                    minWidth: 70,
                  }}
                >
                  {showResult ? "ON" : "OFF"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default AdminDashboard;
