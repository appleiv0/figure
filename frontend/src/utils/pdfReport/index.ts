import jsPDF from "jspdf";
import html2canvas from "html2canvas";

interface ReportData {
  date: string;
  receiptNo: number;
  counselor: {
    organization: string;
    name: string;
  };
  kid: {
    name: string;
    sex: string;
    birth: string;
    [key: string]: string;
  };
  figures: {
    [key: string]: Array<{
      figure: string;
      message: string;
      relation: string;
    }>;
  };
  friendly_message: string;
  llmCompletion: {
    [key: string]: {
      bot: string[];
      user: string[];
    };
  };
  chatHistory?: Array<{
    role: "user" | "bot";
    relation: string;
    content: string;
    timestamp: string;
  }>;
  report: string;
  score: number;
  canvasImage?: string;
}

// 나이 계산
export const calculateAge = (birthDate: string): number => {
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// 성별 변환
export const convertSex = (sex: string): string => {
  if (sex === "Female") return "여";
  if (sex === "Male") return "남";
  return sex;
};

// 날짜 포맷
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return "";
  if (dateStr.length === 14) {
    return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
  }
  const date = new Date(dateStr);
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, "0")}.${String(date.getDate()).padStart(2, "0")}`;
};

// 동물 이름과 이유를 문장으로 합치기
export const formatFigureMessages = (
  figures: Array<{ figure: string; message: string; relation: string }>
): string => {
  if (!figures || figures.length === 0) return "-";
  return figures
    .map((f) => `${f.figure}(${f.message || "이유 없음"})`)
    .join(", ");
};

// 가족 구성원 필터링 (나 제외)
export const getFamilyMembers = (
  figures: Array<{ figure: string; message: string; relation: string }>,
  kidName: string
): Array<{ figure: string; message: string; relation: string }> => {
  if (!figures) return [];
  return figures.filter(
    (f) => f.relation !== "나" && f.relation !== kidName && !f.relation.includes("나")
  );
};

// LLM 대화 정리
export const formatLLMConversation = (
  llmCompletion: ReportData["llmCompletion"],
  chatHistory: ReportData["chatHistory"] = []
): Array<{ relation: string; conversations: Array<{ question: string; answer: string }> }> => {
  const result: Record<string, Array<{ question: string; answer: string }>> = {};

  // 1. Try to use structured llmCompletion first
  if (llmCompletion) {
    Object.entries(llmCompletion).forEach(([relation, data]) => {
      result[relation] = data.bot.map((question, idx) => ({
        question,
        answer: data.user[idx] || "",
      }));
    });
  }

  // 2. If chatHistory exists, use it to fill in missing gaps or override if needed
  if (chatHistory && chatHistory.length > 0) {
    // Group by relation
    const historyByRelation: Record<string, Array<{ role: string; content: string }>> = {};
    chatHistory.forEach((item) => {
      if (!historyByRelation[item.relation]) historyByRelation[item.relation] = [];
      historyByRelation[item.relation].push(item);
    });

    Object.entries(historyByRelation).forEach(([relation, messages]) => {
      const userMsgs = messages.filter(m => m.role === 'user').map(m => m.content);
      const botMsgs = messages.filter(m => m.role === 'bot').map(m => m.content);

      // Merge into pairs
      const len = Math.max(userMsgs.length, botMsgs.length);
      const pairsForRel = [];
      for (let i = 0; i < len; i++) {
        pairsForRel.push({
          question: botMsgs[i] || "",
          answer: userMsgs[i] || ""
        });
      }

      // Update result if currently empty or has missing questions
      const current = result[relation] || [];
      const currentHasEmptyBot = current.some(c => !c.question);

      if (current.length === 0 || currentHasEmptyBot) {
        result[relation] = pairsForRel;
      }
    });
  }

  return Object.entries(result)
    .map(([relation, conversations]) => ({
      relation,
      conversations: conversations.filter(c => c.answer && c.answer.trim() !== ""),
    }))
    .filter(item => item.conversations.length > 0);
};

// PDF 생성
export const generatePDF = async (elementId: string, filename: string): Promise<void> => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error("Element not found");
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      logging: false,
      backgroundColor: "#ffffff",
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    // 여러 페이지 처리
    const pageHeight = pdfHeight * (imgWidth / pdfWidth);
    let heightLeft = imgHeight;
    let position = 0;

    pdf.addImage(imgData, "PNG", imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    heightLeft -= pageHeight;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", imgX, position * ratio, imgWidth * ratio, imgHeight * ratio);
      heightLeft -= pageHeight;
    }

    pdf.save(filename);
  } catch (error) {
    console.error("PDF generation failed:", error);
  }
};

export type { ReportData };
