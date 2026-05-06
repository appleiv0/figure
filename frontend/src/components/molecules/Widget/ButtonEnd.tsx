import { useNavigate, useLocation } from "react-router-dom";
import { USER } from "../../../constants/common.constant";
import { useGetReport } from "../../../services/hooks/hookChatbot";
import { getItemLocalStorage } from "../../../utils/helper";
import { formatLLMConversation } from "../../../utils/pdfReport";
import Icon from "../../atoms/Icon";
import useStore from "../../../store";

const ButtonEnd = () => {
  const { fetchReport } = useGetReport();
  const userInfo = getItemLocalStorage(USER);
  const navigator = useNavigate();
  const location = useLocation();
  const setResponse = useStore((state: any) => state.setResponse);
  const response = useStore((state: any) => state.response);
  const setCurrentStep = useStore((state: any) => state.setCurrentStep);

  const handleReport = async () => {
    try {
      const response = await fetchReport({
        kidName: userInfo.kidname,
        receiptNo: `${userInfo.receiptNo}`,
      });

      if (response) {
        setResponse(response);
        navigator("/result");
      } else {
        alert("결과를 불러오는데 실패했습니다. 다시 시도해주세요.");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      alert("결과를 불러오는데 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleNext = () => {
    setCurrentStep(6);
    navigator("/stage6");
  };

  const handleOpenReport = () => {
    if (!response?.result) {
      alert("보고서 데이터가 없습니다.");
      return;
    }

    const html = generateReportHTML(response.result);
    const kidName = response.result?.kid?.name || "아동";

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
            <button onclick="window.print()" style="padding: 8px 16px; background: #2EB500; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px; margin-right: 8px;">인쇄</button>
            <button onclick="downloadPDF()" style="padding: 8px 16px; background: #1976d2; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">PDF 다운로드 (컬러)</button>
          </div>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js"><\/script>
          <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"><\/script>
          <script>
            async function downloadPDF() {
              const el = document.querySelector('div[style*="210mm"]');
              if (!el) return;
              const btn = event.target;
              btn.textContent = '생성 중...';
              btn.disabled = true;
              try {
                const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
                const pdfW = pdf.internal.pageSize.getWidth();
                const pdfH = pdf.internal.pageSize.getHeight();
                const imgW = canvas.width;
                const imgH = canvas.height;
                const ratio = pdfW / imgW;
                const pageH = pdfH / ratio;
                let y = 0;
                while (y < imgH) {
                  const pageCanvas = document.createElement('canvas');
                  pageCanvas.width = imgW;
                  pageCanvas.height = Math.min(pageH, imgH - y);
                  const ctx = pageCanvas.getContext('2d');
                  ctx.drawImage(canvas, 0, y, imgW, pageCanvas.height, 0, 0, imgW, pageCanvas.height);
                  const imgData = pageCanvas.toDataURL('image/png');
                  if (y > 0) pdf.addPage();
                  pdf.addImage(imgData, 'PNG', 0, 0, pdfW, pageCanvas.height * ratio);
                  y += pageH;
                }
                pdf.save('AI_가족평가_보고서_${kidName}.pdf');
              } catch(e) { console.error(e); alert('PDF 생성 실패'); }
              btn.textContent = 'PDF 다운로드 (컬러)';
              btn.disabled = false;
            }
          <\/script>
          ${html}
        </body>
        </html>
      `);
      newTab.document.close();
    }
  };

  return (
    <>
      <div className="react-chatbot-kit-chat-bot-message-container flex gap-2">
        {location.pathname.endsWith("/stage5") && (
          <button
            type="button"
            className="text-2xl font-bold ml-auto flex items-center gap-2 border border-primary bg-primary hover:bg-grey-100 hover:text-[#2C9608] text-white px-3 py-4 rounded-md cursor-pointer select-none"
            onClick={handleNext}
          >
            확인
            <Icon
              icon="arrowRight"
              width={24}
              height={24}
              className="max-w-6"
            />
          </button>
        )}
        {location.pathname.endsWith("/ending") && (
          <button
            type="button"
            className="text-2xl font-bold ml-auto flex items-center gap-2 border border-primary bg-primary hover:bg-grey-100 hover:text-[#2C9608] text-white px-3 py-4 rounded-md cursor-pointer select-none"
            onClick={handleReport}
          >
            결과 페이지로 이동
            <Icon
              icon="arrowRight"
              width={24}
              height={24}
              className="max-w-6"
            />
          </button>
        )}
        {location.pathname.endsWith("/result") && (
          <button
            type="button"
            className="text-2xl font-bold flex items-center gap-2 border border-primary bg-primary hover:bg-grey-100 hover:text-[#2C9608] text-white px-3 py-4 rounded-md cursor-pointer select-none"
            onClick={handleOpenReport}
          >
            PDF로 보기
            <Icon icon="download" width={24} height={24} className="max-w-6" />
          </button>
        )}
      </div>
    </>
  );
};

// PDF 보고서 HTML 생성 함수
const generateReportHTML = (data: any): string => {
  const kidName = data.kid?.name || "아동";
  const age = data.kid?.birth ? calculateAge(data.kid.birth) : "-"; void age;
  const sex = data.kid?.sex === "Female" ? "여" : data.kid?.sex === "Male" ? "남" : "-";
  const testDate = formatDate(data.date);

  const meFigures = data.figures?.["1"] || [];
  const wishFigures = data.figures?.["2"] || [];
  const allFamilyFigures = data.figures?.["3"] || [];
  const familyFigures = allFamilyFigures.filter(
    (f: any) => f.relation !== "나" && f.relation !== kidName && !f.relation.includes("나")
  );
  const myFamilyFigure = allFamilyFigures.find(
    (f: any) => f.relation === "나" || f.relation === kidName || f.relation.includes(kidName)
  );
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

  // 나를 상징하는 동물
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

  // 내가 소망하는 동물
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

  // 가족을 상징하는 동물
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

  // 가족이 나를 상징하는 동물
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
  const familyTypeDesc = data.familyType || "-";

  // AI 임상 해석 (markdown rendering)
  const aiInterpretation = data.aiInterpretation || "";
  const therapistInterpretation = data.therapistInterpretation || "";

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
          <td style="${cellStyle}">${data.familyType || "-"}</td>
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
        <div style="font-size:13px;line-height:1.8;color:#333;">${(() => {
          let t = aiInterpretation;
          t = t.replace(/^### (.+)$/gm, '<h4 style="font-size:13px;font-weight:700;color:#1565c0;margin:16px 0 6px;border-left:3px solid #1565c0;padding-left:8px;">$1</h4>');
          t = t.replace(/^## (.+)$/gm, '<h3 style="font-size:15px;font-weight:700;color:#1565c0;margin:20px 0 8px;border-left:4px solid #1565c0;padding-left:8px;">$1</h3>');
          t = t.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
          t = t.replace(/\*(.+?)\*/g, '<em>$1</em>');
          t = t.replace(/\n\n/g, '</p><p style="margin:8px 0;">');
          t = t.replace(/\n/g, '<br/>');
          return '<p style="margin:8px 0;">' + t + '</p>';
        })()}</div>
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
          <img src="/aspt-logo.png" alt="ASPT" style="height:40px;" />
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

  return `${page1}${page2}`;
};

const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  if (dateStr.length === 14) {
    return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
  }
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
};

export default ButtonEnd;
