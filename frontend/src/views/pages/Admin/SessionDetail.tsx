import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApi, Session } from "../../../services/adminApi";

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
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">세션 상세</h1>
          <Link to="/admin/sessions" className="text-blue-600 hover:underline">
            ← 목록으로
          </Link>
        </div>

        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold mb-4">기본 정보</h2>
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
              {(session as any).chatHistory.map((chat: any, idx: number) => {
                const relationTag = chat.relation ? <span className="text-xs font-bold text-gray-400 mr-2">[{chat.relation}]</span> : null;

                if (chat.role === "bot") {
                  return (
                    <div key={idx} className="p-3 rounded-lg bg-gray-50 mr-12">
                      <div className="text-xs text-gray-500 mb-1 flex items-center">
                        {relationTag}
                        <span>🤖 푸름이 (상담사)</span>
                      </div>
                      <div className="text-sm whitespace-pre-wrap">{chat.content}</div>
                    </div>
                  );
                }
                if (chat.role === "user") {
                  return (
                    <div key={idx} className="p-3 rounded-lg bg-blue-50 ml-12">
                      <div className="text-xs text-gray-500 mb-1 flex items-center justify-end">
                        {relationTag}
                        <span>👤 사용자 (아동)</span>
                      </div>
                      <div className="text-sm text-right">{chat.content}</div>
                    </div>
                  );
                }
                return null;
              })}
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
