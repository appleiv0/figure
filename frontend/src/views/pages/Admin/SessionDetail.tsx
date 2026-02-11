import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApi, Session } from "../../../services/adminApi";
import { formatLLMConversation } from "../../../utils/pdfReport";

const AdminSessionDetail = () => {
  const { receiptNo } = useParams<{ receiptNo: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchSession = async () => {
      if (!receiptNo) return;
      try {
        const data = await adminApi.getSession(receiptNo);
        setSession(data.session);
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
      return figures.map((f: any) => `${f.figure}(${f.message || "이유 없음"})`).join(", ");
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
        <h1 style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">부모-자녀 관계 진단 보고서</h1>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">검사일</td><td style="border: 1px solid #ccc; padding: 8px;">${testDate}</td><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">관리번호</td><td style="border: 1px solid #ccc; padding: 8px;">${data.receiptNo}</td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">상담기관</td><td style="border: 1px solid #ccc; padding: 8px;">${data.counselor?.organization || "-"}</td><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">상담사</td><td style="border: 1px solid #ccc; padding: 8px;">${data.counselor?.name || "-"}</td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">아동 이름</td><td style="border: 1px solid #ccc; padding: 8px;">${kidName}</td><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">성별 / 나이</td><td style="border: 1px solid #ccc; padding: 8px;">${sex} / 만 ${age}세</td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">진단 결과</td><td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; color: #d32f2f;" colspan="3">${data.report || "-"}</td></tr>
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
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">친한 가족끼리 동물 세우기</td><td style="border: 1px solid #ccc; padding: 8px;">${data.friendly_message || "-"}</td></tr>
          ${data.canvasImage ? `<tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">동물 배치도</td><td style="border: 1px solid #ccc; padding: 8px; text-align: center;"><img src="${data.canvasImage}" alt="동물 배치도" style="max-width: 100%; max-height: 250px; object-fit: contain;" /></td></tr>` : ''}
        </table>
        <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">4. 심층 분석</h2>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">내가 바라는 가족의 동물상징</td><td style="border: 1px solid #ccc; padding: 8px;">${wishedFamilyFigures.length > 0 ? wishedFamilyFigures.map((f: any) => `${f.relation}: ${f.figure}(${f.message})`).join(", ") : "-"}</td></tr>
          <tr><td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">가족이 생각하는 나</td><td style="border: 1px solid #ccc; padding: 8px;">${familyThinkOfMe.length > 0 ? familyThinkOfMe.map((f: any) => `${f.relation}이 생각하는 나: ${f.figure}(${f.message})`).join(", ") : "-"}</td></tr>
        </table>
        <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">5. 종합 소견 (상담 대화 내용)</h2>
        ${llmHTML || '<p style="color: #666;">대화 기록이 없습니다.</p>'}
        <div style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; text-align: center;"><strong>종합 점수:</strong> ${data.score || 0}점</div>
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
          <Link to="/admin/sessions" className="text-blue-600 hover:underline">
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
              <span className="text-gray-500">점수:</span>
              <span className="ml-2 font-bold text-lg">{session.score || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">기관:</span>
              <span className="ml-2">{session.counselor?.organization}</span>
            </div>
            <div>
              <span className="text-gray-500">상담사:</span>
              <span className="ml-2">{session.counselor?.name}</span>
            </div>
          </div>
        </div>

        {/* Canvas Image */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">동물 배치 이미지</h2>
          {session.canvasImage ? (
            <div className="flex justify-center">
              <img
                src={session.canvasImage}
                alt="동물 배치"
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
              <p className="text-sm mt-1">치료 세션에서 동물 배치 단계를 완료하면 이미지가 저장됩니다.</p>
            </div>
          )}
        </div>

        {/* Figures by Stage */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
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
        </div>

        {/* Chat History */}
        {(session as any).chatHistory && (session as any).chatHistory.length > 0 && (
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

        {/* Report */}
        {session.report && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold mb-4">최종 리포트</h2>
            <div className="whitespace-pre-wrap text-gray-700">{session.report}</div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminSessionDetail;
