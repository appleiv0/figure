import { Suspense, useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApi, Session } from "../../../services/adminApi";
import { formatLLMConversation } from "../../../utils/pdfReport";
import DeskScene3D from "../../../components/organisms/DeskScene3D";
import { DollInstanceData } from "../../../types/figure3d";

const AdminSessionDetail = () => {
  const { receiptNo } = useParams<{ receiptNo: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiEvaluation, setAiEvaluation] = useState("");
  const [familyType, setFamilyType] = useState("");
  const [evalSaving, setEvalSaving] = useState(false);
  const [evalSaved, setEvalSaved] = useState(false);
  const isAdmin = sessionStorage.getItem("adminAuth") === "true";

  useEffect(() => {
    const fetchSession = async () => {
      if (!receiptNo) return;
      try {
        const data = await adminApi.getSession(receiptNo);
        setSession(data.session);
        setAiEvaluation((data.session as any)?.aiEvaluation || "");
        setFamilyType((data.session as any)?.familyType || "");
      } catch (err) {
        setError("세션을 불러오는데 실패했습니다.");
      } finally {
        setLoading(false);
      }
    };
    fetchSession();
  }, [receiptNo]);

  const handleOpenReport = () => {
    if (!session) return;

    const data = session as any;
    const kidName = data.kid?.name || "아동";
    const age = data.kid?.birth ? calculateAge(data.kid.birth) : "-";
    const sex = data.kid?.sex === "Female" ? "여" : data.kid?.sex === "Male" ? "남" : "-";
    const testDate = formatDateStr(data.date);
    const meFigures = data.figures?.["1"] || [];
    const wishFigures = data.figures?.["2"] || [];
    const allFamilyFigures = data.figures?.["3"] || [];
    const familyFigures = allFamilyFigures.filter(
      (f: any) => f.relation !== "나" && f.relation !== kidName && !f.relation.includes("나")
    );
    const myFamilyFigure = allFamilyFigures.find(
      (f: any) => f.relation === "나" || f.relation === kidName || f.relation.includes(kidName)
    );
    const wishedFamilyFigures = data.figures?.["5"] || [];
    const familyThinkOfMe = data.figures?.["6"] || [];
    const llmConversations = formatLLMConversation(data.llmCompletion, data.chatHistory);

    const formatFigures = (figures: any[]) => {
      if (!figures || figures.length === 0) return "-";
      return figures.map((f: any) => `${f.figure} - ${f.message || "이유 없음"}`).join("<br/>");
    };

    const llmHTML = llmConversations
      .map(({ relation, conversations }) => {
        const rows = conversations
          .map((conv) => `
            <tr>
              <td style="border: 1px solid #ccc; padding: 8px;">${conv.question}</td>
              <td style="border: 1px solid #ccc; padding: 8px;">${conv.answer || "-"}</td>
            </tr>
          `).join("");
        return `
          <h4 style="font-size: 12px; font-weight: bold; margin: 10px 0 5px;">[${relation}]에 대한 대화</h4>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
            <thead><tr>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; width: 60%;">상담사 질문</th>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; width: 40%;">아동 응답</th>
            </tr></thead>
            <tbody>${rows}</tbody>
          </table>
        `;
      }).join("");

    const html = `
      <div style="width: 210mm; min-height: 297mm; padding: 15mm; background: #fff; font-family: 'Noto Sans KR', sans-serif; font-size: 11px; line-height: 1.6; color: #333;">
        <h1 style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">AI 가족 평가 보고서</h1>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">검사일</td><td style="border: 1px solid #ccc; padding: 8px;">${testDate}</td><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">관리번호</td><td style="border: 1px solid #ccc; padding: 8px;">${data.receiptNo}</td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">상담기관</td><td style="border: 1px solid #ccc; padding: 8px;">${data.counselor?.organization || "-"}</td><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">상담사</td><td style="border: 1px solid #ccc; padding: 8px;">${data.counselor?.name || "-"}</td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">아동 이름</td><td style="border: 1px solid #ccc; padding: 8px;">${kidName}</td><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">성별 / 나이</td><td style="border: 1px solid #ccc; padding: 8px;">${sex} / 만 ${age}세</td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">역기능</td><td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">${(() => { const abuse = data.abuse; if (!abuse) return "-"; const sum = (abuse["1"] || 0) + (abuse["2"] || 0) + (abuse["3"] || 0); return sum === 3 ? '<span style="color:#d32f2f">있음</span>' : sum >= 1 ? '<span style="color:#f59e0b">가능성</span>' : '<span style="color:#16a34a">없음</span>'; })()}</td><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">긴장/갈등</td><td style="border: 1px solid #ccc; padding: 8px; font-weight: bold;">${(() => { const t = data.tension; if (!t) return "-"; return t === "높음" ? '<span style="color:#d32f2f">높음</span>' : t === "있음" ? '<span style="color:#f59e0b">있음</span>' : '<span style="color:#16a34a">없음</span>'; })()}</td></tr>
        </table>
        <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">1. 나 (Me)</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">나를 표현하는 동물</td><td style="border: 1px solid #ccc; padding: 8px;">${formatFigures(meFigures)}</td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">되고 싶은 동물 (소망)</td><td style="border: 1px solid #ccc; padding: 8px;">${formatFigures(wishFigures)}</td></tr>
        </table>
        <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">2. 가족 (Family)</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <thead><tr><th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0;">가족 관계</th><th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0;">선택한 동물</th><th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0;">선택 이유</th></tr></thead>
          <tbody>
            ${familyFigures.length > 0 ? familyFigures.map((f: any) => `<tr><td style="border: 1px solid #ccc; padding: 8px;">${f.relation}</td><td style="border: 1px solid #ccc; padding: 8px;">${f.figure}</td><td style="border: 1px solid #ccc; padding: 8px;">${f.message || "-"}</td></tr>`).join("") : '<tr><td style="border: 1px solid #ccc; padding: 8px;" colspan="3">-</td></tr>'}
            ${myFamilyFigure ? `<tr><td style="border: 1px solid #ccc; padding: 8px;">${myFamilyFigure.relation} (나)</td><td style="border: 1px solid #ccc; padding: 8px;">${myFamilyFigure.figure}</td><td style="border: 1px solid #ccc; padding: 8px;">${myFamilyFigure.message || "-"}</td></tr>` : ""}
          </tbody>
        </table>
        <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">3. 나와 가족 관계</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">친한 가족끼리 배치 하기</td><td style="border: 1px solid #ccc; padding: 8px;">${data.friendly_message || "-"}</td></tr>
          ${data.canvasImage ? `<tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">가족 배치도</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;"><img src="${data.canvasImage}" alt="가족 배치도" style="max-width: 100%; max-height: 250px; object-fit: contain;" /></td></tr>` : ''}
        </table>
        <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">4. 심층 분석</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">내가 바라는 가족의 동물상징</td><td style="border: 1px solid #ccc; padding: 8px;">${wishedFamilyFigures.length > 0 ? wishedFamilyFigures.map((f: any) => `${f.relation}: ${f.figure}(${f.message})`).join(", ") : "-"}</td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">가족이 생각하는 나</td><td style="border: 1px solid #ccc; padding: 8px;">${familyThinkOfMe.length > 0 ? familyThinkOfMe.map((f: any) => `${f.relation}이 생각하는 나: ${f.figure}(${f.message})`).join(", ") : "-"}</td></tr>
        </table>
        <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">5. 종합 소견 (상담 대화 내용)</h2>
        ${llmHTML || '<p style="color: #666;">대화 기록이 없습니다.</p>'}
      </div>
    `;

    const newTab = window.open('', '_blank');
    if (newTab) {
      newTab.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>진단보고서 - ${kidName}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="padding: 10px; text-align: right; background: #f5f5f5; border-bottom: 1px solid #ddd;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #2EB500; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">인쇄 / PDF 저장</button>
          </div>
          ${html}
        </body>
        </html>
      `);
      newTab.document.close();
    }
  };

  const calculateAge = (birthDate: string): number => {
    const birth = new Date(birthDate);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
    return age;
  };

  const formatDateStr = (dateStr: string): string => {
    if (!dateStr) return "";
    if (dateStr.length === 14) return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
    const d = new Date(dateStr);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-center">로딩 중...</div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="text-center text-red-500">{error || "세션을 찾을 수 없습니다."}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold">세션 상세</h1>
          <Link to="/admin#sessions" className="text-blue-600 hover:underline">
            ← 목록으로
          </Link>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">기본 정보</h2>
            <button
              onClick={handleOpenReport}
              style={{ padding: "8px 16px", backgroundColor: "#16a34a", color: "white", borderRadius: "8px", fontSize: "14px", fontWeight: 500, display: "flex", alignItems: "center", gap: "6px", border: "none", cursor: "pointer" }}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              보고서 보기
            </button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-gray-500">접수번호:</span>
              <span className="ml-2 font-medium">{session.receiptNo}</span>
            </div>
            <div>
              <span className="text-gray-500">상태:</span>
              <span
                className={`ml-2 px-2 py-1 text-xs rounded-full ${session.status === "completed"
                    ? "bg-green-100 text-green-800"
                    : "bg-yellow-100 text-yellow-800"
                  }`}
              >
                {session.status === "completed" ? "완료" : "진행중"}
              </span>
            </div>
            <div>
              <span className="text-gray-500">아동명:</span>
              <span className="ml-2 font-medium">{session.kid?.name}</span>
            </div>
            <div>
              <span className="text-gray-500">기관:</span>
              <span className="ml-2">{session.counselor?.organization}</span>
            </div>
            <div>
              <span className="text-gray-500">상담사:</span>
              <span className="ml-2">{session.counselor?.name}</span>
            </div>
            <div>
              <span className="text-gray-500">역기능:</span>
              <span className={`ml-2 font-bold ${(() => { const abuse = (session as any).abuse; if (!abuse) return ""; const sum = (abuse["1"] || 0) + (abuse["2"] || 0) + (abuse["3"] || 0); return sum === 3 ? "text-red-600" : sum >= 1 ? "text-yellow-600" : "text-green-600"; })()}`}>
                {(() => { const abuse = (session as any).abuse; if (!abuse) return "-"; const sum = (abuse["1"] || 0) + (abuse["2"] || 0) + (abuse["3"] || 0); return sum === 3 ? "있음" : sum >= 1 ? "가능성" : "없음"; })()}
              </span>
            </div>
            <div>
              <span className="text-gray-500">긴장/갈등:</span>
              <span className={`ml-2 font-bold ${(session as any).tension === "높음" ? "text-red-600" : (session as any).tension === "있음" ? "text-yellow-600" : "text-green-600"}`}>
                {(session as any).tension || "-"}
              </span>
            </div>
          </div>
        </div>

        {/* AI 진단 목록 - 관리자만 */}
        {isAdmin && (session as any).abuse && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">AI 가족 평가 진단 목록</h2>
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">진단 항목</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">설명</th>
                    <th className="border border-gray-200 px-3 py-2 text-center">결과</th>
                    <th className="border border-gray-200 px-3 py-2 text-center">점수</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { key: "1", label: "자기상(나)", desc: "나를 표현하는 동물에 피해 동물 포함" },
                    { key: "2", label: "소망상", desc: "되고 싶은 동물에 가해 동물 포함" },
                    { key: "3", label: "가족상", desc: "가족 동물에 가해 동물 포함" },
                    { key: "4", label: "배치 점수", desc: "가족 배치 거리/관계 점수" },
                    { key: "5", label: "가족소망 긴장", desc: "가족 동물이 가해↔피해로 변경" },
                    { key: "6", label: "자기인식 긴장", desc: "나의 동물이 가해↔피해로 변경" },
                  ].map(item => {
                    const val = (session as any).abuse?.[item.key] ?? 0;
                    const isScore = item.key === "4";
                    return (
                      <tr key={item.key} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2 font-medium">{item.label}</td>
                        <td className="border border-gray-200 px-3 py-2 text-gray-600">{item.desc}</td>
                        <td className="border border-gray-200 px-3 py-2 text-center">
                          {isScore ? (
                            <span className="font-semibold">{val}점</span>
                          ) : val === 1 ? (
                            <span className="text-red-600 font-bold">해당</span>
                          ) : (
                            <span className="text-green-600">정상</span>
                          )}
                        </td>
                        <td className="border border-gray-200 px-3 py-2 text-center font-semibold">
                          {isScore ? val : val === 1 ? <span className="text-red-600">1</span> : <span className="text-gray-400">0</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 검사 신뢰도 - 관리자만 */}
        {isAdmin && <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-2">검사 신뢰도</h2>
          <div className="text-sm text-gray-600 mb-4 space-y-1 bg-gray-50 rounded p-3">
            <p><b>동물 선택</b>: 나/소망 동물(stage 1,2) 선택 이유 품질 분석</p>
            <p><b>동물 선택 시간</b>: 나/소망 동물 카드 클릭 간 시간 간격 (막 찍기 감지)</p>
            <p><b>가족 선택</b>: 가족 동물(stage 3,5,6) 선택 이유 품질 분석</p>
            <p><b>가족 선택 시간</b>: 가족 동물 카드 클릭 간 시간 간격 (막 찍기 감지)</p>
            <p><b>대화 품질</b>: 챗봇(푸름이)과의 대화 응답 길이 분석</p>
            <p><b>응답 시간</b>: 챗봇 질문 후 답변까지 걸린 시간 분석</p>
            <p><b>인형 조작</b>: 인형 드래그/회전/포즈/크기 변경 여부 분석</p>
          </div>
          {!(session as any).reliability ? (
            <p className="text-gray-400 text-sm">신뢰도 분석 데이터 없음</p>
          ) : (() => {
            const r = (session as any).reliability;
            const gradeColor = (g: string) => g === "높음" ? "text-green-600" : g === "보통" ? "text-yellow-600" : "text-red-600 font-bold";
            const scoreColor = (score: number) => score >= 3 ? "text-green-600" : score >= 2 ? "text-yellow-600" : "text-red-600 font-bold";

            const renderTable = (items: Array<{label: string; key: string}>) => (
              <table className="min-w-full text-sm border-collapse">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-200 px-3 py-2 text-left">항목</th>
                    <th className="border border-gray-200 px-3 py-2 text-center">점수</th>
                    <th className="border border-gray-200 px-3 py-2 text-left">상세</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(({ label, key }) => {
                    const item = r[key] || (key === "dollInteraction" ? r["positionVariety"] : null);
                    if (!item) return null;
                    return (
                      <tr key={key} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2 font-medium">{label}</td>
                        <td className={`border border-gray-200 px-3 py-2 text-center font-semibold ${scoreColor(item.score)}`}>{item.score}/3</td>
                        <td className="border border-gray-200 px-3 py-2 text-gray-600">{item.detail || "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            );

            return (
              <div>
                <div className="mb-4">
                  <span className="text-gray-600 text-sm">종합 판정: </span>
                  <span className={`font-bold text-base ${gradeColor(r.grade)}`}>
                    {r.grade} ({r.totalScore}/3)
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* 동물 검사 신뢰도 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-gray-700">동물 검사 신뢰도</p>
                      {r.animalTest && (
                        <span className={`text-sm font-bold ${gradeColor(r.animalTest.grade)}`}>
                          {r.animalTest.grade} ({r.animalTest.score}/3)
                        </span>
                      )}
                    </div>
                    {renderTable([
                      { label: "동물 선택", key: "animalSelection" },
                      { label: "동물 선택 시간", key: "animalTiming" },
                      { label: "가족 선택", key: "familySelection" },
                      { label: "가족 선택 시간", key: "familyTiming" },
                      { label: "대화 품질", key: "chatQuality" },
                      { label: "응답 시간", key: "responseTime" },
                    ])}
                  </div>

                  {/* 인형 가족검사 신뢰도 */}
                  <div className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-bold text-gray-700">인형 가족검사 신뢰도</p>
                      {r.familyTest && (
                        <span className={`text-sm font-bold ${gradeColor(r.familyTest.grade)}`}>
                          {r.familyTest.grade} ({r.familyTest.score}/3)
                        </span>
                      )}
                    </div>
                    {renderTable([
                      { label: "인형 조작", key: "dollInteraction" },
                    ])}
                  </div>
                </div>
              </div>
            );
          })()}
        </div>}

        {/* Canvas Image + AI 평가 - 관리자만 */}
        {isAdmin && <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">인형 배치 이미지</h2>
            {session.canvasImage ? (
              <div className="flex justify-center">
                <img
                  src={session.canvasImage}
                  alt="인형 배치"
                  className="max-w-full h-auto rounded-lg border border-gray-200"
                  style={{ maxHeight: "400px" }}
                />
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                <svg className="w-16 h-16 mx-auto mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p>이미지가 저장되지 않았습니다.</p>
              </div>
            )}
          </div>
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">가족유형 판정</h2>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1">가족유형</label>
              <select
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
                value={familyType}
                onChange={(e) => { setFamilyType(e.target.value); setEvalSaved(false); }}
                disabled={!isAdmin}
              >
                <option value="">선택하세요</option>
                <option value="균형형">① 균형형 (기능적)</option>
                <option value="고립형">② 고립형 (역기능)</option>
                <option value="세대단절형">③ 세대단절형 (역기능)</option>
                <option value="우회공격형">④ 우회공격형 (역기능)</option>
                <option value="분열형">⑤ 분열형 (역기능)</option>
                <option value="이산형">⑥ 이산형 (역기능)</option>
                <option value="우회보호형">⑦ 우회보호형 (역기능)</option>
                <option value="밀착형">⑧ 밀착형 (역기능)</option>
                <option value="목적지향형">⑨ 목적지향형 (역기능)</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">판정 내용</label>
              <textarea
                className="w-full h-40 p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-vertical text-sm disabled:bg-gray-100 disabled:cursor-not-allowed"
                placeholder="판정 내용을 입력하세요..."
                value={aiEvaluation}
                onChange={(e) => { setAiEvaluation(e.target.value); setEvalSaved(false); }}
                disabled={!isAdmin}
              />
            </div>
            <div className="flex items-center justify-end gap-3">
              {evalSaved && <span className="text-green-600 text-sm font-medium">저장되었습니다</span>}
              {isAdmin && <button
                className="px-4 py-2 rounded-lg text-white font-bold text-sm bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-blue-600"
                disabled={evalSaving || evalSaved}
                onClick={async () => {
                  if (!receiptNo) return;
                  setEvalSaving(true);
                  try {
                    await adminApi.saveEvaluation(receiptNo, aiEvaluation, familyType);
                    setEvalSaved(true);
                  } catch {
                    alert("저장에 실패했습니다.");
                  } finally {
                    setEvalSaving(false);
                  }
                }}
              >
                {evalSaving ? '저장 중...' : '저장'}
              </button>}
            </div>
          </div>
        </div>}

        {/* 3D Doll Arrangement - 관리자만 */}
        {isAdmin && (session as any).dollInstances && (session as any).dollInstances.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">3D 인형 배치 데이터</h2>
            <div className="mt-3">
              <h3 className="text-sm font-medium text-gray-500 mb-2">인형 배치 데이터</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border border-gray-200 px-3 py-2 text-left">역할</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">인형 모델</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">자세</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">크기</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">위치 (X, Y, Z)</th>
                      <th className="border border-gray-200 px-3 py-2 text-left">회전 (°)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {((session as any).dollInstances as DollInstanceData[]).map((doll, idx) => (
                      <tr key={idx} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-2 font-medium">{doll.label}</td>
                        <td className="border border-gray-200 px-3 py-2">{doll.dollModel}</td>
                        <td className="border border-gray-200 px-3 py-2">{doll.pose === 'stand' ? '서있음' : '앉음'}</td>
                        <td className="border border-gray-200 px-3 py-2">{doll.size}</td>
                        <td className="border border-gray-200 px-3 py-2">{doll.position.x.toFixed(2)}, {doll.position.y.toFixed(2)}, {doll.position.z.toFixed(2)}</td>
                        <td className="border border-gray-200 px-3 py-2">{Math.round(doll.rotation * 180 / Math.PI)}°</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Figures by Stage - 관리자만 */}
        {isAdmin && <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">스테이지별 동물 선택</h2>
          {Object.entries(session.figures || {}).map(([stage, figures]) => (
            <div key={stage} className="mb-4">
              <h3 className="font-medium text-gray-700">Stage {stage}</h3>
              <div className="pl-4 mt-2">
                {Array.isArray(figures) && figures.length > 0 ? (
                  figures.map((fig: any, idx: number) => (
                    <div key={idx} className="text-sm text-gray-600">
                      • {fig.figure || fig.name} {fig.relation ? `(${fig.relation})` : ""}
                    </div>
                  ))
                ) : (
                  <span className="text-gray-400">선택 없음</span>
                )}
              </div>
            </div>
          ))}
        </div>}

        {/* Chat History - 관리자만 */}
        {isAdmin && (session as any).chatHistory && (session as any).chatHistory.length > 0 && (
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">대화 기록 (Chat History)</h2>
            <div className="space-y-2 max-h-[500px] overflow-y-auto">
              {(() => {
                const chatHistory = (session as any).chatHistory;
                const filteredPairs: Array<{ bot: any; user: any }> = [];

                for (let i = 0; i < chatHistory.length; i++) {
                  if (chatHistory[i].role === "bot") {
                    // Check if next message is a user response
                    const nextMsg = chatHistory[i + 1];
                    if (nextMsg && nextMsg.role === "user") {
                      filteredPairs.push({ bot: chatHistory[i], user: nextMsg });
                      i++; // Skip the user message since we already paired it
                    }
                  }
                }

                if (filteredPairs.length === 0) {
                  return <div className="text-center text-gray-500 py-4">응답된 대화 기록이 없습니다.</div>;
                }

                return filteredPairs.map((pair, idx) => {
                  const relationTag = pair.bot.relation ? <span className="text-xs font-bold text-gray-400 mr-2">[{pair.bot.relation}]</span> : null;
                  return (
                    <div key={idx} className="mb-3">
                      <div className="p-3 rounded-lg bg-gray-50 mr-12">
                        <div className="text-xs text-gray-500 mb-1 flex items-center">
                          {relationTag}
                          <span>🤖 푸름이 (상담사)</span>
                        </div>
                        <div className="text-sm whitespace-pre-wrap">{pair.bot.content}</div>
                      </div>
                      <div className="p-3 rounded-lg bg-blue-50 ml-12 mt-1">
                        <div className="text-xs text-gray-500 mb-1 flex items-center justify-end">
                          {pair.user.relation ? <span className="text-xs font-bold text-gray-400 mr-2">[{pair.user.relation}]</span> : null}
                          <span>👤 사용자 (아동)</span>
                        </div>
                        <div className="text-sm text-right">{pair.user.content}</div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminSessionDetail;
