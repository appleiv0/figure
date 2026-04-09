import { useEffect, useState, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi, Session, SessionListResponse } from "../../../services/adminApi";

const MySessions = () => {
  const navigate = useNavigate();

  const authRaw = sessionStorage.getItem("counselorAuth");
  const auth = (() => {
    try {
      return authRaw ? JSON.parse(authRaw) : null;
    } catch {
      return null;
    }
  })();

  const isAdmin = !!auth?.isAdmin;

  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchName, setSearchName] = useState("");
  const [pageSize] = useState(20);
  const [credits, setCredits] = useState<number | null>(null);
  const [codeModalOpen, setCodeModalOpen] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("");
  const [codeGenerating, setCodeGenerating] = useState(false);
  const [codeCopied, setCodeCopied] = useState(false);

  // Password change state
  const [pwModalOpen, setPwModalOpen] = useState(false);
  const [pwOld, setPwOld] = useState("");
  const [pwNew, setPwNew] = useState("");
  const [pwConfirm, setPwConfirm] = useState("");
  const [pwError, setPwError] = useState("");
  const [pwLoading, setPwLoading] = useState(false);
  const [pwSuccess, setPwSuccess] = useState("");

  // Profile edit state
  const [profileEditing, setProfileEditing] = useState(false);
  const [profileName, setProfileName] = useState(auth?.userName || auth?.name || "");
  const [profileOrg, setProfileOrg] = useState(auth?.userOrganization || auth?.organization || "");
  const [profileSaving, setProfileSaving] = useState(false);

  // My codes state
  const [codesOpen, setCodesOpen] = useState(false);
  const [myCodes, setMyCodes] = useState<Array<{ code: string; used: boolean; createdAt: string; usedAt?: string; sessionReceiptNo?: string }>>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codeCopiedIndex, setCodeCopiedIndex] = useState<number | null>(null);

  // Evaluation notification state
  const [evalModalOpen, setEvalModalOpen] = useState(false);
  const [evalSessions, setEvalSessions] = useState<Array<{ receiptNo: any; kidName: string; familyType: string; aiEvaluation: string }>>([]);

  // Session detail modal state
  const [detailSession, setDetailSession] = useState<any>(null);
  const [detailData, setDetailData] = useState<any>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [evalRequesting, setEvalRequesting] = useState(false);
  const [evalRequested, setEvalRequested] = useState(false);

  // Super user 5-click admin access
  // TODO: SUPER_USERS is duplicated in Admin/index.tsx - move to a shared constant (e.g. src/constants/)
  const SUPER_USERS = ["appleiv@gmail.com", "a33351702@gmail.com", "beratung@hansei.ac.kr"];
  const isSuperUser = SUPER_USERS.includes(auth?.email?.toLowerCase() || "");
  const [titleClickCount, setTitleClickCount] = useState(0);
  const titleClickTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleTitleClick = () => {
    if (!isSuperUser) return;
    const newCount = titleClickCount + 1;
    setTitleClickCount(newCount);
    if (titleClickTimerRef.current) clearTimeout(titleClickTimerRef.current);
    if (newCount >= 5) {
      setTitleClickCount(0);
      sessionStorage.setItem("adminAuth", "true");
      navigate("/admin");
      return;
    }
    titleClickTimerRef.current = setTimeout(() => setTitleClickCount(0), 2000);
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!auth?.email) {
      navigate("/login");
    }
  }, []);

  // Check for evaluation notifications on mount
  useEffect(() => {
    if (!auth?.email) return;
    const checkEval = async () => {
      try {
        const data = await adminApi.checkEvaluations(auth.email);
        if (data.hasNew && data.sessions.length > 0) {
          setEvalSessions(data.sessions);
          setEvalModalOpen(true);
        }
      } catch (err) {
        console.error("Failed to check evaluations:", err);
      }
    };
    checkEval();
  }, []);

  const handleProfileSave = async () => {
    if (!profileName.trim() || !profileOrg.trim()) return;
    setProfileSaving(true);
    try {
      await adminApi.registerUser(auth.email, profileName.trim(), profileOrg.trim());
      // sessionStorage 업데이트
      const updated = { ...auth, userName: profileName.trim(), userOrganization: profileOrg.trim() };
      sessionStorage.setItem("counselorAuth", JSON.stringify(updated));
      setProfileEditing(false);
    } catch (err) {
      console.error("Profile save error:", err);
      alert("저장에 실패했습니다.");
    } finally {
      setProfileSaving(false);
    }
  };

  const fetchCredits = async () => {
    try {
      const data = await adminApi.getCredits(auth.email);
      setCredits(data.credits);
    } catch (err) {
      console.error("Failed to fetch credits:", err);
    }
  };

  useEffect(() => {
    fetchCredits();
  }, []);

  const handleGenerateCode = async () => {
    if (credits !== null && credits <= 0) {
      alert("검사 횟수가 부족합니다.");
      return;
    }
    setCodeGenerating(true);
    try {
      const data = await adminApi.generateCode(auth.email, auth.userName || auth.name || "", auth.userOrganization || auth.organization || "");
      setGeneratedCode(data.code);
      setCredits(data.credits);
      setCodeModalOpen(true);
    } catch (err) {
      console.error("Failed to generate code:", err);
      alert("코드 생성에 실패했습니다.");
    } finally {
      setCodeGenerating(false);
    }
  };

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textarea = document.createElement("textarea");
      textarea.value = generatedCode;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCodeCopied(true);
      setTimeout(() => setCodeCopied(false), 2000);
    }
  };

  const handleChangePassword = async () => {
    setPwError("");
    setPwSuccess("");
    if (!pwOld || !pwNew || !pwConfirm) {
      setPwError("모든 필드를 입력해주세요.");
      return;
    }
    if (pwNew !== pwConfirm) {
      setPwError("새 비밀번호와 확인이 일치하지 않습니다.");
      return;
    }
    if (pwNew.length < 4) {
      setPwError("새 비밀번호는 4자 이상이어야 합니다.");
      return;
    }
    setPwLoading(true);
    try {
      const result = await adminApi.changePassword(auth.email, pwOld, pwNew);
      if (result.success) {
        setPwSuccess("비밀번호가 변경되었습니다.");
        setPwOld("");
        setPwNew("");
        setPwConfirm("");
        setTimeout(() => {
          setPwModalOpen(false);
          setPwSuccess("");
        }, 1500);
      } else {
        setPwError(result.message || "비밀번호 변경에 실패했습니다.");
      }
    } catch (err: any) {
      setPwError(err?.response?.data?.detail || "비밀번호 변경에 실패했습니다.");
    } finally {
      setPwLoading(false);
    }
  };

  const fetchMyCodes = async () => {
    setCodesLoading(true);
    try {
      const data = await adminApi.getMyCodes(auth.email);
      setMyCodes(data.codes || []);
    } catch (err) {
      console.error("Failed to fetch codes:", err);
    } finally {
      setCodesLoading(false);
    }
  };

  const handleCopyCodeItem = async (code: string, index: number) => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
    }
    setCodeCopiedIndex(index);
    setTimeout(() => setCodeCopiedIndex(null), 1500);
  };

  useEffect(() => {
    if (codesOpen) {
      fetchMyCodes();
    }
  }, [codesOpen]);

  const fetchSessions = async (pageNum: number, name?: string) => {
    setLoading(true);
    try {
      let data: SessionListResponse;
      if (name) {
        // Use public endpoint and filter by kid name on the client side
        data = await adminApi.getMySessions(auth.email, pageNum, pageSize);
        const lowerName = name.toLowerCase();
        data = {
          ...data,
          sessions: data.sessions.filter(
            (s: any) => s.kid?.name?.toLowerCase().includes(lowerName)
          ),
        };
      } else {
        data = await adminApi.getMySessions(auth.email, pageNum, pageSize);
      }
      setSessions(data.sessions);
      setTotalPages(data.totalPages);
      setTotal(data.total);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(page);
  }, [page]);

  const filteredSessions = useMemo(() => sessions, [sessions]);

  const handleSearch = () => {
    setPage(1);
    fetchSessions(1, searchName || undefined);
  };

  const handleReset = () => {
    setSearchName("");
    setPage(1);
    fetchSessions(1);
  };

  const handleOpenDetail = async (session: any) => {
    setDetailSession(session);
    setDetailData(null);
    setDetailLoading(true);
    setEvalRequested(!!(session as any).evaluationRequested);
    try {
      const data = await adminApi.getMySession(String(session.receiptNo), auth?.email || "");
      setDetailData(data.session);
    } catch (err) {
      console.error("Failed to load session detail:", err);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleRequestEvaluation = async () => {
    if (!detailSession) return;
    setEvalRequesting(true);
    try {
      await adminApi.requestEvaluation(detailSession.receiptNo, auth?.email || auth?.userEmail || "");
      setEvalRequested(true);
      alert("전문가에게 판정 의뢰가 전송되었습니다.");
    } catch (err) {
      alert("의뢰 전송에 실패했습니다.");
    } finally {
      setEvalRequesting(false);
    }
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

  return (
    <div className="min-h-screen bg-gray-100 p-4 md:p-8">
      <div className="mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold" onClick={handleTitleClick} style={{ cursor: isSuperUser ? "default" : undefined, userSelect: "none" }}>내 검사 목록</h1>
            {!profileEditing ? (
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-500 text-sm">
                  {profileName} | {profileOrg || "소속 미등록"} | {auth.email}
                </p>
                <button
                  onClick={() => setProfileEditing(true)}
                  style={{ fontSize: "12px", color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline" }}
                >
                  수정
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  placeholder="이름"
                  style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px", width: "100px" }}
                />
                <input
                  type="text"
                  value={profileOrg}
                  onChange={(e) => setProfileOrg(e.target.value)}
                  placeholder="소속(상담기관)"
                  style={{ padding: "4px 8px", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "13px", width: "150px" }}
                />
                <button
                  onClick={handleProfileSave}
                  disabled={profileSaving || !profileName.trim() || !profileOrg.trim()}
                  style={{ padding: "4px 12px", backgroundColor: "#2563eb", color: "white", border: "none", borderRadius: "4px", fontSize: "12px", cursor: "pointer" }}
                >
                  {profileSaving ? "저장중..." : "저장"}
                </button>
                <button
                  onClick={() => { setProfileEditing(false); setProfileName(auth.userName || auth.name || ""); setProfileOrg(auth.userOrganization || auth.organization || ""); }}
                  style={{ padding: "4px 12px", background: "none", border: "1px solid #d1d5db", borderRadius: "4px", fontSize: "12px", cursor: "pointer", color: "#6b7280" }}
                >
                  취소
                </button>
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              onClick={() => { setPwModalOpen(true); setPwError(""); setPwSuccess(""); setPwOld(""); setPwNew(""); setPwConfirm(""); }}
              style={{
                padding: "8px 16px",
                backgroundColor: "#f59e0b",
                color: "white",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                border: "none",
                cursor: "pointer",
              }}
            >
              비밀번호 변경
            </button>
            {isAdmin && (
              <Link
                to="/admin"
                style={{
                  padding: "8px 16px",
                  backgroundColor: "#7c3aed",
                  color: "white",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 500,
                  textDecoration: "none",
                }}
              >
                관리자 페이지
              </Link>
            )}
            <Link
              to="/register"
              style={{
                padding: "8px 16px",
                backgroundColor: "#00838F",
                color: "white",
                borderRadius: "6px",
                fontSize: "14px",
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              새 검사 시작
            </Link>
            <button
              onClick={() => {
                sessionStorage.removeItem("counselorAuth");
                sessionStorage.removeItem("adminAuth");
                navigate("/login");
              }}
              style={{
                padding: "8px 16px",
                backgroundColor: "transparent",
                color: "#6b7280",
                border: "1px solid #d1d5db",
                borderRadius: "6px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              로그아웃
            </button>
          </div>
        </div>

        {/* Credits & Code Generation */}
        <div className="bg-white rounded-lg shadow p-4 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <span className="text-gray-700 font-medium">
              남은 검사 횟수: <span className="text-blue-600 font-bold text-lg">{credits !== null ? `${credits}회` : "로딩중..."}</span>
            </span>
          </div>
          <button
            onClick={handleGenerateCode}
            disabled={codeGenerating}
            style={{
              padding: "8px 20px",
              backgroundColor: codeGenerating ? "#9ca3af" : "#2563eb",
              color: "white",
              borderRadius: "6px",
              fontSize: "14px",
              fontWeight: 600,
              border: "none",
              cursor: codeGenerating ? "not-allowed" : "pointer",
            }}
          >
            {codeGenerating ? "생성 중..." : "일회용 코드 생성"}
          </button>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4 flex-wrap items-center">
            <input
              type="text"
              placeholder="아동 이름 검색"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="border rounded px-3 py-2"
            />
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

        {/* My Codes Accordion */}
        <div className="bg-white rounded-lg shadow mb-6">
          <button
            onClick={() => setCodesOpen(!codesOpen)}
            style={{
              width: "100%",
              padding: "16px 20px",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: 600,
              color: "#1f2937",
            }}
          >
            <span>내 일회용 코드</span>
            <span style={{ fontSize: "20px", transition: "transform 0.2s", transform: codesOpen ? "rotate(180deg)" : "rotate(0deg)" }}>
              ▼
            </span>
          </button>
          {codesOpen && (
            <div style={{ padding: "0 20px 16px", overflowX: "auto" }}>
              {codesLoading ? (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "16px 0" }}>로딩 중...</p>
              ) : myCodes.length === 0 ? (
                <p style={{ color: "#6b7280", textAlign: "center", padding: "16px 0" }}>생성된 코드가 없습니다.</p>
              ) : (
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid #e5e7eb" }}>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>코드</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>상태</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>생성일</th>
                      <th style={{ padding: "10px 12px", textAlign: "left", fontSize: "13px", color: "#6b7280", fontWeight: 600 }}>사용일</th>
                    </tr>
                  </thead>
                  <tbody>
                    {myCodes.map((c, idx) => (
                      <tr
                        key={idx}
                        onClick={() => handleCopyCodeItem(c.code, idx)}
                        style={{
                          borderBottom: "1px solid #f3f4f6",
                          cursor: "pointer",
                          backgroundColor: codeCopiedIndex === idx ? "#eff6ff" : "transparent",
                          transition: "background-color 0.2s",
                        }}
                        title="클릭하여 복사"
                      >
                        <td style={{
                          padding: "10px 12px",
                          fontSize: "15px",
                          fontFamily: "monospace",
                          fontWeight: 700,
                          letterSpacing: "0.15em",
                          color: c.used ? "#9ca3af" : "#2563eb",
                        }}>
                          {codeCopiedIndex === idx ? "복사됨!" : c.code}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "13px" }}>
                          <span style={{
                            padding: "2px 10px",
                            borderRadius: "12px",
                            fontSize: "12px",
                            fontWeight: 600,
                            backgroundColor: c.used ? "#f3f4f6" : "#dbeafe",
                            color: c.used ? "#9ca3af" : "#2563eb",
                          }}>
                            {c.used ? "사용됨" : "미사용"}
                          </span>
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "13px", color: c.used ? "#9ca3af" : "#374151" }}>
                          {c.createdAt ? new Date(c.createdAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                        </td>
                        <td style={{ padding: "10px 12px", fontSize: "13px", color: c.used ? "#9ca3af" : "#374151" }}>
                          {c.usedAt ? new Date(c.usedAt).toLocaleString("ko-KR", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit" }) : "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

        {/* Count */}
        <div style={{ marginBottom: "16px" }}>
          <span style={{ color: "#4b5563" }}>총 {total}개의 세션</span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow" style={{ overflowX: "auto" }}>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">접수번호</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">아동명</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">성별</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">나이</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">기관/상담사</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">상태</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">가족체계유형</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">가족 관계</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">가족기능</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">긴장/갈등</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">신뢰도</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">가족배치</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">생성일</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">상세보기</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-6 py-4 text-center">로딩 중...</td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-6 py-4 text-center text-gray-500">데이터가 없습니다.</td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr key={session.receiptNo} style={{ background: filteredSessions.indexOf(session) % 2 === 0 ? '#ffffff' : '#FFFBF0' }}>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{session.receiptNo}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">{session.kid?.name || "-"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{formatSex(session.kid?.sex)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{calculateAge(session.kid?.birth)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{(session as any).counselor?.organization || "-"} / {(session as any).counselor?.name || "-"}</td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        session.status === "completed"
                          ? "bg-green-100 text-green-800"
                          : "bg-yellow-100 text-yellow-800"
                      }`}>
                        {session.status === "completed" ? "완료" : "진행중"}
                      </span>
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{(session as any).familyType || "-"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{session.aiEvaluation ? session.aiEvaluation.substring(0, 20) + (session.aiEvaluation.length > 20 ? "..." : "") : "-"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      {(() => {
                        const ff = (session as any).familyFunction;
                        if (!ff) return "-";
                        if (ff === "역기능") return <span className="text-red-600 font-bold">{ff}</span>;
                        if (ff === "역기능 있음" || ff === "있음") return <span className="text-yellow-600 font-semibold">{ff}</span>;
                        if (ff === "역기능 없음" || ff === "없음") return <span className="text-green-600">{ff}</span>;
                        return <span>{ff}</span>;
                      })()}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      {(() => {
                        const t = (session as any).tension;
                        if (!t) return "-";
                        return t.includes("높음")
                          ? <span className="text-red-600 font-bold">{t}</span>
                          : t.includes("있음")
                          ? <span className="text-yellow-600 font-semibold">{t}</span>
                          : <span className="text-green-600">{t}</span>;
                      })()}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      {(() => {
                        const reliability = (session as any).reliability;
                        if (!reliability?.grade) return <span className="text-gray-400">-</span>;
                        if (reliability.grade === "높음") return <span className="text-green-600">{reliability.grade}</span>;
                        if (reliability.grade === "보통") return <span className="text-yellow-600">{reliability.grade}</span>;
                        if (reliability.grade === "낮음") return <span className="text-red-600 font-bold">{reliability.grade}</span>;
                        return <span>{reliability.grade}</span>;
                      })()}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      {(session as any).canvasImage
                        ? <span style={{color:"#16a34a",fontWeight:600}}>있음</span>
                        : <span style={{color:"#dc2626",fontWeight:700}}>없음</span>}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(session.createdAt)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      <button
                        onClick={() => handleOpenDetail(session)}
                        style={{ color: "#2563eb", background: "none", border: "none", cursor: "pointer", textDecoration: "underline", fontSize: "14px" }}
                      >
                        상세
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
                const elements: React.ReactNode[] = [];
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
      </div>

      {/* Password Change Modal */}
      {pwModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => setPwModalOpen(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              minWidth: "360px",
              maxWidth: "440px",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "24px", color: "#1f2937" }}>
              비밀번호 변경
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px", display: "block" }}>현재 비밀번호</label>
                <input
                  type="password"
                  value={pwOld}
                  onChange={(e) => setPwOld(e.target.value)}
                  placeholder="현재 비밀번호"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px", display: "block" }}>새 비밀번호</label>
                <input
                  type="password"
                  value={pwNew}
                  onChange={(e) => setPwNew(e.target.value)}
                  placeholder="새 비밀번호"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px", display: "block" }}>새 비밀번호 확인</label>
                <input
                  type="password"
                  value={pwConfirm}
                  onChange={(e) => setPwConfirm(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleChangePassword()}
                  placeholder="새 비밀번호 확인"
                  style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
                />
              </div>
            </div>
            {pwError && (
              <p style={{ color: "#dc2626", fontSize: "13px", marginBottom: "12px" }}>{pwError}</p>
            )}
            {pwSuccess && (
              <p style={{ color: "#16a34a", fontSize: "13px", marginBottom: "12px" }}>{pwSuccess}</p>
            )}
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px" }}>
              <button
                onClick={() => setPwModalOpen(false)}
                style={{
                  padding: "8px 20px",
                  backgroundColor: "transparent",
                  color: "#6b7280",
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  fontSize: "14px",
                  cursor: "pointer",
                }}
              >
                취소
              </button>
              <button
                onClick={handleChangePassword}
                disabled={pwLoading}
                style={{
                  padding: "8px 20px",
                  backgroundColor: pwLoading ? "#9ca3af" : "#f59e0b",
                  color: "white",
                  border: "none",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: pwLoading ? "not-allowed" : "pointer",
                }}
              >
                {pwLoading ? "변경 중..." : "변경하기"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Code Modal */}
      {codeModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => { setCodeModalOpen(false); setCodeCopied(false); }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              minWidth: "360px",
              maxWidth: "440px",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "8px", color: "#1f2937" }}>
              일회용 코드가 생성되었습니다
            </h3>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "24px" }}>
              아래 코드를 내담자에게 전달해 주세요.
            </p>
            <div
              style={{
                fontSize: "40px",
                fontWeight: 800,
                letterSpacing: "0.3em",
                color: "#2563eb",
                background: "#eff6ff",
                borderRadius: "12px",
                padding: "20px",
                marginBottom: "16px",
                fontFamily: "monospace",
                userSelect: "all",
              }}
            >
              {generatedCode}
            </div>
            <button
              onClick={handleCopyCode}
              style={{
                padding: "10px 24px",
                backgroundColor: codeCopied ? "#16a34a" : "#2563eb",
                color: "white",
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 600,
                border: "none",
                cursor: "pointer",
                marginBottom: "12px",
                transition: "background-color 0.2s",
              }}
            >
              {codeCopied ? "복사됨!" : "코드 복사"}
            </button>
            <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "16px" }}>
              남은 검사 횟수: {credits}회
            </p>
            <button
              onClick={() => { setCodeModalOpen(false); setCodeCopied(false); }}
              style={{
                padding: "8px 20px",
                backgroundColor: "transparent",
                color: "#6b7280",
                border: "1px solid #d1d5db",
                borderRadius: "8px",
                fontSize: "14px",
                cursor: "pointer",
              }}
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Session Detail Modal */}
      {detailSession && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}
          onClick={() => setDetailSession(null)}
        >
          <div
            style={{ background: "#fff", borderRadius: 12, maxWidth: 600, width: "100%", maxHeight: "85vh", overflowY: "auto", padding: 0 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>세션 상세 정보</h3>
              <button onClick={() => setDetailSession(null)} style={{ background: "none", border: "none", fontSize: 24, cursor: "pointer", color: "#999" }}>&times;</button>
            </div>

            <div style={{ padding: "20px 24px" }}>
              {detailLoading ? (
                <p style={{ textAlign: "center", padding: 40, color: "#888" }}>로딩 중...</p>
              ) : detailData ? (
                <>
                  {/* 기본정보 */}
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#333", borderLeft: "4px solid #7ec4a8", paddingLeft: 8 }}>기본정보</h4>
                  <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
                    <tbody>
                      <tr>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", background: "#f9fafb", fontWeight: 600, width: "25%" }}>이름</td>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", width: "25%" }}>{detailData.kid?.name || "-"}</td>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", background: "#f9fafb", fontWeight: 600, width: "25%" }}>성별/생년월일</td>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", width: "25%" }}>{detailData.kid?.sex === "Female" ? "여" : detailData.kid?.sex === "Male" ? "남" : "-"} / {detailData.kid?.birth ? detailData.kid.birth.substring(0, 10) : "-"}</td>
                      </tr>
                      <tr>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", background: "#f9fafb", fontWeight: 600 }}>상태</td>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px" }}>{detailData.status === "completed" ? "완료" : "진행중"}</td>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", background: "#f9fafb", fontWeight: 600 }}>검사일</td>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px" }}>{detailData.date ? new Date(detailData.date).toLocaleDateString("ko-KR") : "-"}</td>
                      </tr>
                      <tr>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", background: "#f9fafb", fontWeight: 600 }}>가족체계유형</td>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px" }}>{detailData.familyType || "-"}</td>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px", background: "#f9fafb", fontWeight: 600 }}>가족기능</td>
                        <td style={{ border: "1px solid #e5e7eb", padding: "8px 12px" }}>
                          {(() => {
                            const abuse = detailData.abuse;
                            if (!abuse) return "-";
                            const sum = (abuse["1"] || 0) + (abuse["2"] || 0) + (abuse["3"] || 0);
                            return sum === 3 ? "역기능 있음" : sum >= 1 ? "역기능 가능성" : "역기능 없음";
                          })()}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* 인형 배치 이미지 */}
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#333", borderLeft: "4px solid #c9a5d4", paddingLeft: 8 }}>인형 배치</h4>
                  {detailData.canvasImage ? (
                    <div style={{ textAlign: "center", marginBottom: 24, border: "1px solid #e5e7eb", borderRadius: 8, padding: 12 }}>
                      <img src={detailData.canvasImage} alt="인형 배치" style={{ maxWidth: "100%", maxHeight: 300, objectFit: "contain" }} />
                    </div>
                  ) : (
                    <p style={{ color: "#999", marginBottom: 24, textAlign: "center", padding: 20, background: "#f9fafb", borderRadius: 8 }}>인형 배치 이미지가 없습니다.</p>
                  )}

                  {/* 가족유형 판정 의뢰 */}
                  <h4 style={{ fontSize: 15, fontWeight: 700, marginBottom: 12, color: "#333", borderLeft: "4px solid #E8845C", paddingLeft: 8 }}>가족유형 판정</h4>
                  {detailData.familyType ? (
                    <div style={{ padding: 16, background: "#f0fdf4", borderRadius: 8, marginBottom: 16 }}>
                      <p style={{ fontWeight: 600, color: "#166534" }}>판정 완료: {detailData.familyType}</p>
                      {detailData.aiEvaluation && <p style={{ marginTop: 8, fontSize: 13, color: "#333" }}>{detailData.aiEvaluation}</p>}
                    </div>
                  ) : (
                    <div style={{ marginBottom: 16 }}>
                      <p style={{ fontSize: 13, color: "#666", marginBottom: 12 }}>아직 전문가 판정이 완료되지 않았습니다.</p>
                      {evalRequested ? (
                        <div style={{ padding: 12, background: "#FFF7ED", borderRadius: 8, color: "#9A3412", fontSize: 13 }}>
                          판정 의뢰가 접수되었습니다. 전문가 검토 후 결과가 통보됩니다.
                        </div>
                      ) : (
                        <button
                          onClick={handleRequestEvaluation}
                          disabled={evalRequesting}
                          style={{ padding: "10px 20px", background: "#E8845C", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600, opacity: evalRequesting ? 0.6 : 1 }}
                        >
                          {evalRequesting ? "전송 중..." : "전문가에게 가족유형 판정 의뢰"}
                        </button>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p style={{ textAlign: "center", padding: 40, color: "#999" }}>데이터를 불러올 수 없습니다.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Evaluation Notification Modal */}
      {evalModalOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 10000,
          }}
          onClick={async () => {
            try {
              await adminApi.markEvaluationNotified(evalSessions.map(s => s.receiptNo));
            } catch (err) {
              console.error("Failed to mark notified:", err);
            }
            setEvalModalOpen(false);
          }}
        >
          <div
            style={{
              background: "white",
              borderRadius: "16px",
              padding: "32px",
              minWidth: "380px",
              maxWidth: "520px",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "20px", fontWeight: 700, marginBottom: "8px", color: "#1f2937", textAlign: "center" }}>
              판정이 도착했습니다!
            </h3>
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px", textAlign: "center" }}>
              전문가의 가족유형 판정 결과가 도착했습니다.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
              {evalSessions.map((s, idx) => (
                <div
                  key={idx}
                  style={{
                    border: "1px solid #e5e7eb",
                    borderRadius: "10px",
                    padding: "14px 16px",
                    background: "#f9fafb",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ fontWeight: 600, fontSize: "14px", color: "#374151" }}>
                      {s.kidName || "아동"}
                    </span>
                    <span style={{ fontSize: "12px", color: "#9ca3af" }}>
                      접수번호: {s.receiptNo}
                    </span>
                  </div>
                  {s.familyType && (
                    <div style={{ fontSize: "13px", color: "#2563eb", fontWeight: 600, marginBottom: "4px" }}>
                      가족유형: {s.familyType}
                    </div>
                  )}
                  {s.aiEvaluation && (
                    <div style={{ fontSize: "12px", color: "#6b7280", lineHeight: "1.5" }}>
                      {s.aiEvaluation.length > 100 ? s.aiEvaluation.substring(0, 100) + "..." : s.aiEvaluation}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ textAlign: "center" }}>
              <button
                onClick={async () => {
                  try {
                    await adminApi.markEvaluationNotified(evalSessions.map(s => s.receiptNo));
                  } catch (err) {
                    console.error("Failed to mark notified:", err);
                  }
                  setEvalModalOpen(false);
                }}
                style={{
                  padding: "10px 32px",
                  backgroundColor: "#E8845C",
                  color: "white",
                  borderRadius: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                확인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MySessions;
