import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { USER } from "../../../constants/common.constant";
import { useGetReport } from "../../../services/hooks/hookChatbot";
import { getItemLocalStorage } from "../../../utils/helper";
import { generatePDF, formatLLMConversation } from "../../../utils/pdfReport";
import Icon from "../../atoms/Icon";
import useStore from "../../../store";

const ButtonEnd = () => {
  const { fetchReport } = useGetReport();
  const userInfo = getItemLocalStorage(USER);
  const navigator = useNavigate();
  const setResponse = useStore((state: any) => state.setResponse);
  const response = useStore((state: any) => state.response);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const handleReport = async () => {
    try {
      const response = await fetchReport({
        kidName: userInfo.kidname,
        receiptNo: `${userInfo.receiptNo}`,
      });

      if (!response) {
        console.error("API Error:", response.statusText);
      }

      navigator("/result");
      setResponse(response);
      return response;
    } catch (error: any) {
      console.error("Error:", error.message);
    }
  };

  const handleNext = () => {
    navigator("/ending");
  };

  const handleDownload = () => {
    const jsonData = response.result;

    const jsonStr = JSON.stringify(jsonData, null, 2);

    const blob = new Blob([jsonStr], { type: "application/json" });

    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "data.json";

    document.body.appendChild(a);
    a.click();

    URL.revokeObjectURL(url);
  };

  const handlePDFDownload = async () => {
    if (!response?.result) {
      alert("보고서 데이터가 없습니다.");
      return;
    }

    setIsGeneratingPDF(true);

    // PDF 보고서 요소를 동적으로 생성
    const reportElement = document.createElement("div");
    reportElement.id = "pdf-report";
    reportElement.innerHTML = generateReportHTML(response.result);
    reportElement.style.position = "absolute";
    reportElement.style.left = "-9999px";
    reportElement.style.top = "0";
    document.body.appendChild(reportElement);

    try {
      const kidName = response.result?.kid?.name || "아동";
      const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const filename = `진단보고서_${kidName}_${date}.pdf`;

      await generatePDF("pdf-report", filename);
    } catch (error) {
      console.error("PDF 생성 실패:", error);
      alert("PDF 생성에 실패했습니다.");
    } finally {
      document.body.removeChild(reportElement);
      setIsGeneratingPDF(false);
    }
  };

  return (
    <>
      <div className="react-chatbot-kit-chat-bot-message-container flex gap-2">
        {location.pathname === "/stage6" && (
          <button
            type="button"
            className="text-2xl font-bold ml-auto flex items-center gap-2 border border-primary bg-primary hover:bg-grey-100 hover:text-[#2C9608] text-white px-3 py-4 rounded-md cursor-pointer select-none"
            onClick={handleNext}
          >
            인터뷰 종료
            <Icon
              icon="arrowRight"
              width={24}
              height={24}
              className="max-w-6"
            />
          </button>
        )}
        {location.pathname === "/ending" && (
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
        {location.pathname === "/result" && (
          <>
            <button
              type="button"
              className="text-2xl font-bold flex items-center gap-2 border border-primary bg-primary hover:bg-grey-100 hover:text-[#2C9608] text-white px-3 py-4 rounded-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none"
              onClick={handlePDFDownload}
              disabled={isGeneratingPDF}
            >
              {isGeneratingPDF ? "PDF 생성 중..." : "PDF로 저장"}
              <Icon icon="download" width={24} height={24} className="max-w-6" />
            </button>
            <button
              type="button"
              className="text-2xl font-bold flex items-center gap-2 border border-primary bg-primary hover:bg-grey-100 hover:text-[#2C9608] text-white px-3 py-4 rounded-md cursor-pointer select-none"
              onClick={handleDownload}
            >
              상담 결과 다운로드
              <Icon icon="download" width={24} height={24} className="max-w-6" />
            </button>
          </>
        )}
      </div>
    </>
  );
};

// PDF 보고서 HTML 생성 함수
const generateReportHTML = (data: any): string => {
  const kidName = data.kid?.name || "";
  const age = data.kid?.birth ? calculateAge(data.kid.birth) : "-";
  const sex = data.kid?.sex === "Female" ? "여" : data.kid?.sex === "Male" ? "남" : "-";
  const testDate = formatDate(data.date);

  const meFigures = data.figures?.["1"] || [];
  const wishFigures = data.figures?.["2"] || [];
  const familyFigures = (data.figures?.["3"] || []).filter(
    (f: any) => f.relation !== "나" && f.relation !== kidName && !f.relation.includes("나")
  );
  const myFamilyFigure = (data.figures?.["3"] || []).find(
    (f: any) => f.relation === "나" || f.relation === kidName || f.relation.includes(kidName)
  );
  const wishedFamilyFigures = data.figures?.["5"] || [];
  const familyThinkOfMe = data.figures?.["6"] || [];

  const formatFigures = (figures: any[]) => {
    if (!figures || figures.length === 0) return "-";
    return figures.map((f) => `${f.figure}(${f.message || "이유 없음"})`).join(", ");
  };

  const llmConversations = formatLLMConversation(data.llmCompletion, data.chatHistory);

  const llmHTML = llmConversations
    .map(({ relation, conversations }) => {
      const rows = conversations
        .map(
          (conv) => `
          <tr>
            <td style="border: 1px solid #ccc; padding: 8px;">${conv.question}</td>
            <td style="border: 1px solid #ccc; padding: 8px;">${conv.answer || "-"}</td>
          </tr>
        `
        )
        .join("");

      return `
        <h4 style="font-size: 12px; font-weight: bold; margin: 10px 0 5px;">[${relation}]에 대한 대화</h4>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
          <thead>
            <tr>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; width: 60%;">상담사 질문</th>
              <th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; width: 40%;">아동 응답</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      `;
    })
    .join("");

  return `
    <div style="width: 210mm; min-height: 297mm; padding: 15mm; background: #fff; font-family: 'Noto Sans KR', sans-serif; font-size: 11px; line-height: 1.6; color: #333;">
      <h1 style="text-align: center; font-size: 20px; font-weight: bold; margin-bottom: 20px; border-bottom: 2px solid #333; padding-bottom: 10px;">
        부모-자녀 관계 진단 보고서
      </h1>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 15px;">
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">검사일</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${testDate}</td>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">관리번호</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${data.receiptNo}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">상담기관</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${data.counselor?.organization || "-"}</td>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">상담사</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${data.counselor?.name || "-"}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">아동 이름</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${kidName}</td>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">성별 / 나이</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${sex} / 만 ${age}세</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">진단 결과</td>
          <td style="border: 1px solid #ccc; padding: 8px; font-weight: bold; color: #d32f2f;" colspan="3">${data.report || "-"}</td>
        </tr>
      </table>

      <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">1. 나 (Me)</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">나를 표현하는 동물</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${formatFigures(meFigures)}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">되고 싶은 동물 (소망)</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${formatFigures(wishFigures)}</td>
        </tr>
      </table>

      <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">2. 가족 (Family)</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <thead>
          <tr>
            <th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">가족 관계</th>
            <th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">선택한 동물</th>
            <th style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">선택 이유</th>
          </tr>
        </thead>
        <tbody>
          ${familyFigures.length > 0
      ? familyFigures
        .map(
          (f: any) => `
                <tr>
                  <td style="border: 1px solid #ccc; padding: 8px;">${f.relation}</td>
                  <td style="border: 1px solid #ccc; padding: 8px;">${f.figure}</td>
                  <td style="border: 1px solid #ccc; padding: 8px;">${f.message || "-"}</td>
                </tr>
              `
        )
        .join("")
      : '<tr><td style="border: 1px solid #ccc; padding: 8px;" colspan="3">-</td></tr>'
    }
          ${myFamilyFigure
      ? `
            <tr>
              <td style="border: 1px solid #ccc; padding: 8px;">${myFamilyFigure.relation} (나)</td>
              <td style="border: 1px solid #ccc; padding: 8px;">${myFamilyFigure.figure}</td>
              <td style="border: 1px solid #ccc; padding: 8px;">${myFamilyFigure.message || "-"}</td>
            </tr>
          `
      : ""
    }
        </tbody>
      </table>

      <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">3. 나와 가족 관계</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">친한 가족끼리 동물 세우기</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${data.friendly_message || "-"}</td>
        </tr>
      </table>

      <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">4. 심층 분석</h2>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 10px;">
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold; width: 25%;">내가 바라는 가족의 동물상징</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${wishedFamilyFigures.length > 0
      ? wishedFamilyFigures.map((f: any) => `${f.relation}: ${f.figure}(${f.message})`).join(", ")
      : "-"
    }</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ccc; padding: 8px; background: #f0f0f0; font-weight: bold;">가족이 생각하는 나</td>
          <td style="border: 1px solid #ccc; padding: 8px;">${familyThinkOfMe.length > 0
      ? familyThinkOfMe.map((f: any) => `${f.relation}이 생각하는 나: ${f.figure}(${f.message})`).join(", ")
      : "-"
    }</td>
        </tr>
      </table>

      <h2 style="font-size: 14px; font-weight: bold; margin: 15px 0 8px; color: #1976d2; border-left: 4px solid #1976d2; padding-left: 8px;">5. 종합 소견 (상담 대화 내용)</h2>
      ${llmHTML || '<p style="color: #666;">대화 기록이 없습니다.</p>'}

      <div style="margin-top: 20px; padding: 10px; background: #f5f5f5; border-radius: 5px; text-align: center;">
        <strong>종합 점수:</strong> ${data.score || 0}점
      </div>
    </div>
  `;
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
