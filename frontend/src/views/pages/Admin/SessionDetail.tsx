import { useEffect, useState, lazy, Suspense } from "react";
import { useParams, Link } from "react-router-dom";
import { adminApi, Session } from "../../../services/adminApi";
import { formatLLMConversation } from "../../../utils/pdfReport";
import { DollInstanceData } from "../../../types/figure3d";

const DeskScene3D = lazy(() => import("../../../components/organisms/DeskScene3D"));

const AdminSessionDetail = () => {
  const { receiptNo } = useParams<{ receiptNo: string }>();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [aiEvaluation, setAiEvaluation] = useState("");
  const [familyType, setFamilyType] = useState("");
  const [evalSaving, setEvalSaving] = useState(false);
  const [evalSaved, setEvalSaved] = useState(false);
  const [aiInterpretation, setAiInterpretation] = useState<string>("");
  const [therapistInterpretation, setTherapistInterpretation] = useState<string>("");
  const [generatingInterpretation, setGeneratingInterpretation] = useState(false);
  const [savingInterpretation, setSavingInterpretation] = useState(false);
  const isAdmin = sessionStorage.getItem("adminAuth") === "true";
  const [showScenePreview, setShowScenePreview] = useState(false);
  const [capturingSaving, setCapturingSaving] = useState(false);

  // Check authorization for AI interpretation
  const counselorAuth = sessionStorage.getItem("counselorAuth");
  const counselorEmail = counselorAuth ? JSON.parse(counselorAuth).email : "";
  const isAuthorizedForInterpretation = counselorEmail === "appleiv@gmail.com";

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

  // Load existing interpretations
  useEffect(() => {
    if (!receiptNo || !isAuthorizedForInterpretation) return;
    const loadInterpretation = async () => {
      try {
        const data = await adminApi.getInterpretation(receiptNo);
        if (data.aiInterpretation) setAiInterpretation(data.aiInterpretation);
        if (data.therapistInterpretation) setTherapistInterpretation(data.therapistInterpretation);
      } catch {}
    };
    loadInterpretation();
  }, [receiptNo, isAuthorizedForInterpretation]);

  const handleGenerateInterpretation = async () => {
    if (!receiptNo) return;
    setGeneratingInterpretation(true);
    try {
      const result = await adminApi.generateInterpretation(receiptNo);
      setAiInterpretation(result.interpretation);
    } catch (err) {
      alert("AI 해석 생성에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setGeneratingInterpretation(false);
    }
  };

  const handleSaveTherapistInterpretation = async () => {
    if (!receiptNo) return;
    setSavingInterpretation(true);
    try {
      await adminApi.saveTherapistInterpretation(receiptNo, therapistInterpretation);
      alert("치료사 의견이 저장되었습니다.");
    } catch (err) {
      alert("저장에 실패했습니다.");
    } finally {
      setSavingInterpretation(false);
    }
  };

  const handleOpenReport = () => {
    if (!session) return;

    const data = session as any;
    const kidName = data.kid?.name || "아동";
    const age = data.kid?.birth ? calculateAge(data.kid.birth) : "-"; void age;
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
    const wishedFamilyFigures = data.figures?.["5"] || []; void wishedFamilyFigures;
    const familyThinkOfMe = data.figures?.["6"] || [];
    const llmConversations = formatLLMConversation(data.llmCompletion, data.chatHistory);

    // Abuse / family function summary
    const abuseLabel = (() => {
      const abuse = data.abuse;
      if (!abuse) return "-";
      const sum = (abuse["1"] || 0) + (abuse["2"] || 0) + (abuse["3"] || 0);
      return sum === 3 ? "역기능 있음" : sum >= 1 ? "역기능 가능성" : "역기능 없음";
    })();

    // Tension label
    const tensionLabel = data.tension || "-";

    // --- 평가내용 rows ---
    const evalRows: string[] = [];

    // 나를 상징하는 동물 (동물별 행 분리, 첫 열 셀 병합)
    if (meFigures.length > 0) {
      meFigures.forEach((f: any, i: number) => {
        evalRows.push(`<tr>
          ${i === 0 ? `<td rowspan="${meFigures.length}" style="border:1px solid #ccc;padding:8px 10px;font-weight:500;vertical-align:middle;text-align:center;">나를 상징하는 동물</td>` : ''}
          <td style="border:1px solid #ccc;padding:8px 10px;">${f.figure}</td>
          <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
          <td style="border:1px solid #ccc;padding:8px 10px;">${f.message || "-"}</td>
        </tr>`);
      });
    } else {
      evalRows.push(`<tr>
        <td style="border:1px solid #ccc;padding:8px 10px;font-weight:500;text-align:center;">나를 상징하는 동물</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
      </tr>`);
    }

    // 내가 소망하는 동물 (동물별 행 분리, 첫 열 셀 병합)
    if (wishFigures.length > 0) {
      wishFigures.forEach((f: any, i: number) => {
        evalRows.push(`<tr>
          ${i === 0 ? `<td rowspan="${wishFigures.length}" style="border:1px solid #ccc;padding:8px 10px;font-weight:500;vertical-align:middle;text-align:center;">내가 소망하는 동물</td>` : ''}
          <td style="border:1px solid #ccc;padding:8px 10px;">${f.figure}</td>
          <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
          <td style="border:1px solid #ccc;padding:8px 10px;">${f.message || "-"}</td>
        </tr>`);
      });
    } else {
      evalRows.push(`<tr>
        <td style="border:1px solid #ccc;padding:8px 10px;font-weight:500;text-align:center;">내가 소망하는 동물</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
      </tr>`);
    }

    // 가족을 상징하는 동물 (셀 병합)
    const allFamilyRows = [...familyFigures];
    if (myFamilyFigure) allFamilyRows.push({...myFamilyFigure, relation: myFamilyFigure.relation + ' (나)'});
    if (allFamilyRows.length > 0) {
      allFamilyRows.forEach((f: any, i: number) => {
        evalRows.push(`<tr>
          ${i === 0 ? `<td rowspan="${allFamilyRows.length}" style="border:1px solid #ccc;padding:8px 10px;font-weight:500;vertical-align:middle;text-align:center;">가족을 상징하는 동물</td>` : ''}
          <td style="border:1px solid #ccc;padding:8px 10px;">${f.figure}</td>
          <td style="border:1px solid #ccc;padding:8px 10px;">${f.relation}</td>
          <td style="border:1px solid #ccc;padding:8px 10px;">${f.message || "-"}</td>
        </tr>`);
      });
    } else {
      evalRows.push(`<tr>
        <td style="border:1px solid #ccc;padding:8px 10px;font-weight:500;text-align:center;">가족을 상징하는 동물</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
      </tr>`);
    }

    // 가족이 나를 상징하는 동물 (셀 병합)
    if (familyThinkOfMe.length > 0) {
      familyThinkOfMe.forEach((f: any, i: number) => {
        evalRows.push(`<tr>
          ${i === 0 ? `<td rowspan="${familyThinkOfMe.length}" style="border:1px solid #ccc;padding:8px 10px;font-weight:500;vertical-align:middle;text-align:center;">가족이 나를 상징하는 동물</td>` : ''}
          <td style="border:1px solid #ccc;padding:8px 10px;">${f.figure}</td>
          <td style="border:1px solid #ccc;padding:8px 10px;">${f.relation}</td>
          <td style="border:1px solid #ccc;padding:8px 10px;">${f.message || "-"}</td>
        </tr>`);
      });
    } else {
      evalRows.push(`<tr>
        <td style="border:1px solid #ccc;padding:8px 10px;font-weight:500;text-align:center;">가족이 나를 상징하는 동물</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">-</td>
      </tr>`);
    }

    // 가족인형 세우기
    const canvasContent = data.canvasImage
      ? `<img src="${data.canvasImage}" alt="가족인형 세우기" style="max-width:100%;max-height:300px;object-fit:contain;" />`
      : "가족인형 배치 이미지가 없습니다.";
    evalRows.push(`<tr>
      <td style="border:1px solid #ccc;padding:8px 10px;font-weight:500;">가족인형 세우기</td>
      <td colspan="3" style="border:1px solid #ccc;padding:8px 10px;text-align:center;">${canvasContent}</td>
    </tr>`);

    // --- 상담내용 rows ---
    const counselRows = llmConversations.map(({ relation, conversations }) => {
      const firstConv = conversations[0];
      if (!firstConv) return "";
      return `<tr>
        <td style="border:1px solid #ccc;padding:8px 10px;font-weight:500;">${relation}</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">${firstConv.question}</td>
        <td style="border:1px solid #ccc;padding:8px 10px;">${firstConv.answer || "-"}</td>
      </tr>`;
    }).filter(Boolean).join("");

    // --- 평가결과 ---
    const familyTypeDesc = (() => {
      if (!data.familyType && !aiEvaluation) return "-";
      let desc = data.familyType || familyType || "-";
      if (aiEvaluation) desc += `<br/><span style="font-size:11px;color:#555;">${aiEvaluation}</span>`;
      return desc;
    })();

    // Common styles
    const cellStyle = 'border:1px solid #ccc;padding:8px 10px;';
    const labelCellStyle = `${cellStyle}background:#f0f0f0;font-weight:500;width:20%;`;

    // --- PAGE 1 ---
    const page1 = `
      <div style="width:210mm;min-height:297mm;padding:20mm 15mm;background:#fff;font-family:'Noto Sans KR',sans-serif;font-size:13px;line-height:1.7;color:#333;box-sizing:border-box;">
        <!-- Title -->
        <h1 style="text-align:center;font-size:52px;font-weight:400;color:#333;margin:0 0 32px 0;">AI 가족 평가 결과지</h1>

        <!-- 개요 -->
        <div style="background:linear-gradient(135deg,#a8b5d6,#8e9ec7);border-radius:8px;padding:10px 20px;margin-bottom:12px;">
          <span style="font-size:22px;font-weight:700;color:#fff;">개요</span>
        </div>
        <p style="font-size:13px;line-height:1.8;color:#444;margin:0 0 24px 0;">
          본 결과지는 아동·청소년의 가족 관계 및 가족 기능을 파악하기 위해 실시된 AI 기반 가족 평가 결과를 정리한 문서입니다.
          동물 상징 기법과 가족 인형 세우기를 활용하여 내담자가 인식하는 가족 역동, 정서적 거리감, 의사소통 패턴을 탐색하였으며,
          상담사의 관찰 내용과 함께 종합적으로 분석되었습니다.
        </p>

        <!-- 기본정보 -->
        <div style="background:linear-gradient(135deg,#7ec4a8,#5fb893);border-radius:8px;padding:10px 20px;margin-bottom:12px;">
          <span style="font-size:22px;font-weight:700;color:#fff;">기본정보</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr>
            <td style="${labelCellStyle}">이름</td>
            <td style="${cellStyle}width:30%;">${kidName}</td>
            <td style="${labelCellStyle}">성별/생년월일</td>
            <td style="${cellStyle}width:30%;">${sex} / ${data.kid?.birth ? data.kid.birth.substring(0, 10) : "-"}</td>
          </tr>
          <tr>
            <td style="${labelCellStyle}">가족기능</td>
            <td style="${cellStyle}">${abuseLabel}</td>
            <td style="${labelCellStyle}">상담기관</td>
            <td style="${cellStyle}">${data.counselor?.organization || "-"}</td>
          </tr>
          <tr>
            <td style="${labelCellStyle}">가족관계</td>
            <td style="${cellStyle}">${tensionLabel === "높음" ? "긴장/갈등 높음" : tensionLabel === "있음" ? "긴장/갈등 있음" : tensionLabel === "없음" ? "긴장/갈등 없음" : tensionLabel}</td>
            <td style="${labelCellStyle}">상담사</td>
            <td style="${cellStyle}">${data.counselor?.name || "-"}</td>
          </tr>
          <tr>
            <td style="${labelCellStyle}">가족체계유형</td>
            <td style="${cellStyle}">${data.familyType || familyType || "-"}</td>
            <td style="${labelCellStyle}">검사일</td>
            <td style="${cellStyle}">${testDate}</td>
          </tr>
        </table>

        <!-- 평가내용 -->
        <div style="background:linear-gradient(135deg,#c9a5d4,#b48cc2);border-radius:8px;padding:10px 20px;margin-bottom:12px;">
          <span style="font-size:22px;font-weight:700;color:#fff;">평가내용</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr>
              <th style="${cellStyle}background:#f0f0f0;font-weight:700;width:22%;">유형</th>
              <th style="${cellStyle}background:#f0f0f0;font-weight:700;width:18%;">동물</th>
              <th style="${cellStyle}background:#f0f0f0;font-weight:700;width:18%;">내용/가족</th>
              <th style="${cellStyle}background:#f0f0f0;font-weight:700;width:42%;">선택이유</th>
            </tr>
          </thead>
          <tbody>
            ${evalRows.join("")}
          </tbody>
        </table>
      </div>
    `;

    // --- PAGE 2 ---
    const page2 = `
      <div style="width:210mm;min-height:297mm;padding:20mm 15mm;background:#fff;font-family:'Noto Sans KR',sans-serif;font-size:13px;line-height:1.7;color:#333;box-sizing:border-box;page-break-before:always;">
        <!-- 상담내용 -->
        <div style="background:linear-gradient(135deg,#e8a87c,#d99565);border-radius:8px;padding:10px 20px;margin-bottom:12px;">
          <span style="font-size:22px;font-weight:700;color:#fff;">상담내용</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <thead>
            <tr>
              <th style="${cellStyle}background:#f0f0f0;font-weight:700;width:20%;">유형</th>
              <th style="${cellStyle}background:#f0f0f0;font-weight:700;width:40%;">상담사질문</th>
              <th style="${cellStyle}background:#f0f0f0;font-weight:700;width:40%;">내담자 답변</th>
            </tr>
          </thead>
          <tbody>
            ${counselRows || '<tr><td colspan="3" style="' + cellStyle + 'text-align:center;color:#999;">대화 기록이 없습니다.</td></tr>'}
          </tbody>
        </table>

        <!-- 평가결과 -->
        <div style="background:linear-gradient(135deg,#d4a5a0,#c9918c);border-radius:8px;padding:10px 20px;margin-bottom:12px;">
          <span style="font-size:22px;font-weight:700;color:#fff;">평가결과</span>
        </div>
        <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
          <tr>
            <td style="${labelCellStyle}">가족기능</td>
            <td style="${cellStyle}">${abuseLabel}</td>
          </tr>
          <tr>
            <td style="${labelCellStyle}">가족관계</td>
            <td style="${cellStyle}">${tensionLabel === "높음" ? "긴장/갈등 높음" : tensionLabel === "있음" ? "긴장/갈등 있음" : tensionLabel === "없음" ? "긴장/갈등 없음" : tensionLabel}</td>
          </tr>
          <tr>
            <td style="${labelCellStyle}">가족체계유형</td>
            <td style="${cellStyle}">${familyTypeDesc}</td>
          </tr>
        </table>

        ${aiInterpretation ? `
        <!-- AI 임상 해석 -->
        <div style="background:linear-gradient(135deg,#64b5f6,#42a5f5);border-radius:8px;padding:10px 20px;margin-bottom:12px;">
          <span style="font-size:22px;font-weight:700;color:#fff;">AI 임상 해석</span>
        </div>
        <div style="padding:15px;background:#f0f7ff;border:1px solid #bdd7ee;border-radius:8px;margin-bottom:12px;">
          <p style="font-size:11px;color:#666;font-style:italic;margin-bottom:12px;">※ AI 자동 생성 해석입니다. 치료사가 검토 후 활용하세요.</p>
          <div style="font-size:13px;line-height:1.8;color:#333;white-space:pre-wrap;">${aiInterpretation}</div>
        </div>
        ${therapistInterpretation ? `
        <div style="padding:15px;background:#f0fff0;border:1px solid #b2dfb2;border-radius:8px;margin-bottom:24px;">
          <h4 style="font-size:14px;font-weight:bold;color:#2e7d32;margin-bottom:8px;">치료사 의견</h4>
          <div style="font-size:13px;line-height:1.8;color:#333;white-space:pre-wrap;">${therapistInterpretation}</div>
        </div>
        ` : `
        <div style="padding:15px;background:#f0fff0;border:1px solid #b2dfb2;border-radius:8px;margin-bottom:24px;">
          <h4 style="font-size:14px;font-weight:bold;color:#2e7d32;margin-bottom:8px;">치료사 의견:</h4>
          <div style="min-height:80px;border:1px dashed #ccc;border-radius:4px;padding:8px;"></div>
        </div>
        `}
        ` : ''}

        <!-- Footer -->
        <div style="background:linear-gradient(135deg,#d4a5a0,#c9918c,#b8807a);padding:18px 30px;display:flex;align-items:center;gap:16px;border-radius:4px;margin-top:32px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="/family/aspt-logo.png" alt="ASPT" style="height:40px;" />
            <div style="font-size:13px;font-weight:700;color:#fff;line-height:1.4;">
              한국인형치료연구회
              <span style="display:block;font-size:12px;font-weight:500;">AI가족평가</span>
            </div>
          </div>
          <div style="font-size:11px;color:#fff;line-height:1.6;text-align:right;flex:1;">
            <strong style="font-size:12px;">저자 최광현, 선우현</strong><br/>
            한국인형치료연구회의 허락없이 이 결과지의 일부 또는 전부를<br/>
            무단으로 공개, 배포하거나 변형하는 행위를 절대 금합니다.
          </div>
        </div>
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
          <title>AI 가족 평가 결과지 - ${kidName}</title>
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+KR:wght@400;500;700;900&display=swap" rel="stylesheet">
          <style>
            html, body, *, *::before, *::after { margin: 0; padding: 0; box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; forced-color-adjust: none !important; }
            body { font-family: 'Noto Sans KR', sans-serif; background: #e0e0e0; }
            @media print {
              @page { size: A4; margin: 0; }
              body { margin: 0; background: #fff; }
              .no-print { display: none !important; }
              html, body, *, *::before, *::after { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; forced-color-adjust: none !important; }
            }
          </style>
        </head>
        <body>
          <div class="no-print" style="padding: 10px; text-align: right; background: #f5f5f5; border-bottom: 1px solid #ddd;">
            <button onclick="window.print()" style="padding: 8px 16px; background: #2EB500; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">인쇄 / PDF 저장</button>
          </div>
          ${page1}
          ${page2}
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
            {session.loginCode && (
            <div>
              <span className="text-gray-500">쿠폰번호:</span>
              <span className="ml-2 font-medium text-blue-600">{session.loginCode}</span>
            </div>
            )}
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
              <span className="text-gray-500">가족기능:</span>
              <span className={`ml-2 font-bold ${(() => { const abuse = (session as any).abuse; if (!abuse) return ""; const sum = (abuse["1"] || 0) + (abuse["2"] || 0) + (abuse["3"] || 0); return sum === 3 ? "text-red-600" : sum >= 1 ? "text-yellow-600" : "text-green-600"; })()}`}>
                {(() => { const abuse = (session as any).abuse; if (!abuse) return "-"; const sum = (abuse["1"] || 0) + (abuse["2"] || 0) + (abuse["3"] || 0); return sum === 3 ? "역기능 있음" : sum >= 1 ? "역기능 가능성" : "역기능 없음"; })()}
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
                {(session as any).dollInstances?.length > 0 && (
                  <button
                    onClick={() => setShowScenePreview(true)}
                    className="mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                  >
                    3D 인형 배치 재생성
                  </button>
                )}
              </div>
            )}

            {/* 3D Scene Preview Modal */}
            {showScenePreview && (session as any).dollInstances?.length > 0 && (
              <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
                <div className="bg-white rounded-xl p-4 w-[90vw] max-w-[800px]" style={{ height: "70vh" }}>
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="text-lg font-bold">3D 인형 배치 미리보기</h3>
                    <div className="flex gap-2">
                      <button
                        disabled={capturingSaving}
                        onClick={async () => {
                          setCapturingSaving(true);
                          try {
                            // Find the canvas inside the 3D scene
                            const canvas = document.querySelector('.scene-preview-container canvas') as HTMLCanvasElement;
                            if (canvas) {
                              const dataUrl = canvas.toDataURL('image/png');
                              // Save to backend
                              const apiBase = (import.meta as any).env?.VITE_ENV_API_BACKEND_DOMAIN || '/api';
                              await fetch(`${apiBase}/admin/sessions/${receiptNo}/canvas`, {
                                method: 'PUT',
                                headers: {
                                  'Content-Type': 'application/json',
                                  'X-Admin-Key': 'change-this-in-production'
                                },
                                body: JSON.stringify({ canvasImage: dataUrl })
                              });
                              // Update local state
                              setSession({ ...session!, canvasImage: dataUrl } as any);
                              setShowScenePreview(false);
                              alert('인형 배치 이미지가 저장되었습니다.');
                            } else {
                              alert('캔버스를 찾을 수 없습니다. 잠시 후 다시 시도해주세요.');
                            }
                          } catch (e) {
                            alert('저장에 실패했습니다.');
                          } finally {
                            setCapturingSaving(false);
                          }
                        }}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
                      >
                        {capturingSaving ? '저장 중...' : '캡처 & 저장'}
                      </button>
                      <button
                        onClick={() => setShowScenePreview(false)}
                        className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600"
                      >
                        닫기
                      </button>
                    </div>
                  </div>
                  <div className="scene-preview-container" style={{ height: "calc(100% - 50px)" }}>
                    <Suspense fallback={<div className="flex items-center justify-center h-full text-gray-500">3D 씬 로딩 중...</div>}>
                      <DeskScene3D
                        onNext={() => {}}
                        phase={1}
                        onPhaseChange={() => {}}
                        readOnly={true}
                        initialDollInstances={(session as any).dollInstances}
                      />
                    </Suspense>
                  </div>
                </div>
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
              {!isAdmin && (
                <button
                  onClick={async () => {
                    try {
                      const auth = JSON.parse(sessionStorage.getItem("counselorAuth") || "{}");
                      await adminApi.requestEvaluation(session.receiptNo, auth.email);
                      alert("전문가에게 판정 의뢰가 전송되었습니다.");
                    } catch (err) {
                      alert("의뢰 전송에 실패했습니다.");
                    }
                  }}
                  style={{ marginTop: 8, padding: "8px 16px", background: "#E8845C", color: "white", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 600 }}
                >
                  전문가에게 가족유형 판정 의뢰
                </button>
              )}
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

        {/* AI 임상 해석 섹션 - appleiv@gmail.com만 표시 */}
        {isAuthorizedForInterpretation && (
          <div style={{ marginTop: 32, padding: 24, background: '#f0f7ff', borderRadius: 12, border: '1px solid #bdd7ee' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, color: '#1565c0' }}>
              AI 임상 해석
            </h3>

            <p style={{ fontSize: 12, color: '#666', marginBottom: 16, fontStyle: 'italic' }}>
              ※ AI 자동 생성 해석입니다. 치료사가 검토 후 수정하세요.
            </p>

            {/* AI Interpretation display */}
            {aiInterpretation ? (
              <div style={{ background: 'white', padding: 16, borderRadius: 8, marginBottom: 16, whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: 14 }}>
                {aiInterpretation}
              </div>
            ) : (
              <p style={{ color: '#999', marginBottom: 16 }}>AI 해석이 아직 생성되지 않았습니다.</p>
            )}

            {/* Generate / Regenerate button */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
              <button
                onClick={handleGenerateInterpretation}
                disabled={generatingInterpretation}
                style={{
                  padding: '10px 20px',
                  background: generatingInterpretation ? '#ccc' : '#1565c0',
                  color: 'white',
                  border: 'none',
                  borderRadius: 8,
                  cursor: generatingInterpretation ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 600,
                }}
              >
                {generatingInterpretation ? 'AI 해석 생성 중...' : aiInterpretation ? 'AI 해석 재생성' : 'AI 임상 해석 생성'}
              </button>
            </div>

            {/* Therapist interpretation textarea */}
            <h4 style={{ fontSize: 15, fontWeight: 600, marginBottom: 8, color: '#333' }}>치료사 의견</h4>
            <textarea
              value={therapistInterpretation}
              onChange={(e) => setTherapistInterpretation(e.target.value)}
              placeholder="치료사 의견을 입력하세요..."
              style={{
                width: '100%',
                minHeight: 120,
                padding: 12,
                border: '1px solid #ddd',
                borderRadius: 8,
                fontSize: 14,
                lineHeight: 1.6,
                resize: 'vertical',
                boxSizing: 'border-box',
              }}
            />
            <button
              onClick={handleSaveTherapistInterpretation}
              disabled={savingInterpretation}
              style={{
                marginTop: 8,
                padding: '8px 16px',
                background: '#4caf50',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {savingInterpretation ? '저장 중...' : '치료사 의견 저장'}
            </button>
          </div>
        )}

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
