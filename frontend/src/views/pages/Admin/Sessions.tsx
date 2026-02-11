import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { adminApi, Session, SessionListResponse } from "../../../services/adminApi";
import { exportSessionsToExcel } from "../../../utils/excelExport";

const AdminSessions = () => {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchName, setSearchName] = useState("");
  const [searchOrg, setSearchOrg] = useState("");
  const [searchSex, setSearchSex] = useState("");
  const [searchStatus, setSearchStatus] = useState("");
  const [searchAgeMin, setSearchAgeMin] = useState("");
  const [searchAgeMax, setSearchAgeMax] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [pageSize, setPageSize] = useState(20);

  const fetchSessions = async (pageNum: number) => {
    setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSessions(page);
  }, [page, pageSize]);

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

  const handleSearch = () => {
    setPage(1);
    fetchSessions(1);
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

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setPage(1);
  };

  const handleDelete = async (receiptNo: string) => {
    if (!confirm("정말 삭제하시겠습니까?")) return;
    try {
      await adminApi.deleteSession(receiptNo);
      fetchSessions(page);
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

  const handleExcelDownload = () => {
    const selectedSessions = filteredSessions.filter(s => selectedIds.has(s.receiptNo));
    if (selectedSessions.length === 0) {
      alert("세션을 선택해주세요.");
      return;
    }
    exportSessionsToExcel(selectedSessions);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">세션 목록</h1>
          <Link to="/admin" className="text-blue-600 hover:underline">
            ← 대시보드로
          </Link>
        </div>

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

        {/* Total count and Excel download */}
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
        </div>

        {/* Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  접수번호
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  아동명
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  성별
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  나이
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  결과
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  기관/상담사
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  상태
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  점수
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  생성일
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  관리
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={11} className="px-6 py-4 text-center">
                    로딩 중...
                  </td>
                </tr>
              ) : filteredSessions.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-6 py-4 text-center text-gray-500">
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {session.receiptNo}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {session.kid?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {formatSex(session.kid?.sex)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {calculateAge(session.kid?.birth)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span style={{
                        color: session.report?.includes("역기능 가능성") ? "#f59e0b" : session.report?.includes("역기능") ? "#dc2626" : "#16a34a",
                        fontWeight: 600
                      }}>
                        {session.report || "-"}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {session.counselor?.organization || "-"} / {session.counselor?.name || "-"}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
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
      </div>
    </div>
  );
};

export default AdminSessions;
