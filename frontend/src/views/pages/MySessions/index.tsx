import { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi, Session, SessionListResponse } from "../../../services/adminApi";

const MySessions = () => {
  const navigate = useNavigate();

  const authRaw = sessionStorage.getItem("counselorAuth");
  const auth = authRaw ? JSON.parse(authRaw) : null;

  useEffect(() => {
    if (!auth?.email) {
      navigate("/");
    }
  }, []);

  if (!auth?.email) return null;

  const isAdmin = !!auth.isAdmin;

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
  const [profileName, setProfileName] = useState(auth.userName || auth.name || "");
  const [profileOrg, setProfileOrg] = useState(auth.userOrganization || auth.organization || "");
  const [profileSaving, setProfileSaving] = useState(false);

  // My codes state
  const [codesOpen, setCodesOpen] = useState(false);
  const [myCodes, setMyCodes] = useState<Array<{ code: string; used: boolean; createdAt: string; usedAt?: string; sessionReceiptNo?: string }>>([]);
  const [codesLoading, setCodesLoading] = useState(false);
  const [codeCopiedIndex, setCodeCopiedIndex] = useState<number | null>(null);

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
        data = await adminApi.searchSessions(
          { kidName: name, organization: undefined },
          pageNum,
          pageSize
        );
        // 서버 검색 결과를 내 이메일로 필터링
        const myEmail = auth.email.toLowerCase();
        data = {
          ...data,
          sessions: data.sessions.filter(
            (s: any) => s.counselor?.email?.toLowerCase() === myEmail
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
            <h1 className="text-3xl font-bold">내 검사 목록</h1>
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
                navigate("/");
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
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">상태</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">가족유형</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">긴장/갈등</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">신뢰도</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">생성일</th>
                <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap">상세보기</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center">로딩 중...</td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-6 py-4 text-center text-gray-500">데이터가 없습니다.</td>
                </tr>
              ) : (
                filteredSessions.map((session) => (
                  <tr key={session.receiptNo} className="hover:bg-gray-50">
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{session.receiptNo}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm font-medium">{session.kid?.name || "-"}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{formatSex(session.kid?.sex)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">{calculateAge(session.kid?.birth)}</td>
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
                    <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">{formatDate(session.createdAt)}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-sm">
                      <Link
                        to={`/admin/sessions/${session.receiptNo}`}
                        className="text-blue-600 hover:underline"
                      >
                        상세
                      </Link>
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
    </div>
  );
};

export default MySessions;
