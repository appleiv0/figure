import { forwardRef } from "react";
import {
  ReportData,
  calculateAge,
  convertSex,
  formatDate,
  formatFigureMessages,
  getFamilyMembers,
  formatLLMConversation,
} from "../../../utils/pdfReport";

interface PdfReportProps {
  data: ReportData;
}

const PdfReport = forwardRef<HTMLDivElement, PdfReportProps>(({ data }, ref) => {
  const kidName = data.kid?.name || "";
  const age = data.kid?.birth ? calculateAge(data.kid.birth) : "-";
  const sex = data.kid?.sex ? convertSex(data.kid.sex) : "-";
  const testDate = formatDate(data.date);

  // 섹션별 동물 데이터
  const meFigures = data.figures?.["1"] || [];
  const wishFigures = data.figures?.["2"] || [];
  const familyFigures = getFamilyMembers(data.figures?.["3"] || [], kidName);
  const myFamilyFigure = (data.figures?.["3"] || []).find(
    (f) => f.relation === "나" || f.relation === kidName || f.relation.includes(kidName)
  );
  const wishedFamilyFigures = data.figures?.["5"] || [];
  const familyThinkOfMe = data.figures?.["6"] || [];

  // LLM 대화
  const llmConversations = formatLLMConversation(data.llmCompletion);

  return (
    <div
      ref={ref}
      id="pdf-report"
      style={{
        width: "210mm",
        minHeight: "297mm",
        padding: "15mm",
        backgroundColor: "#fff",
        fontFamily: "'Noto Sans KR', sans-serif",
        fontSize: "11px",
        lineHeight: "1.6",
        color: "#333",
      }}
    >
      {/* 제목 */}
      <h1
        style={{
          textAlign: "center",
          fontSize: "20px",
          fontWeight: "bold",
          marginBottom: "20px",
          borderBottom: "2px solid #333",
          paddingBottom: "10px",
        }}
      >
        부모-자녀 관계 진단 보고서
      </h1>

      {/* 기본 정보 */}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          marginBottom: "15px",
        }}
      >
        <tbody>
          <tr>
            <td style={styles.headerCell}>검사일</td>
            <td style={styles.dataCell}>{testDate}</td>
            <td style={styles.headerCell}>관리번호</td>
            <td style={styles.dataCell}>{data.receiptNo}</td>
          </tr>
          <tr>
            <td style={styles.headerCell}>상담기관</td>
            <td style={styles.dataCell}>{data.counselor?.organization || "-"}</td>
            <td style={styles.headerCell}>상담사</td>
            <td style={styles.dataCell}>{data.counselor?.name || "-"}</td>
          </tr>
          <tr>
            <td style={styles.headerCell}>아동 이름</td>
            <td style={styles.dataCell}>{kidName}</td>
            <td style={styles.headerCell}>성별 / 나이</td>
            <td style={styles.dataCell}>
              {sex} / 만 {age}세
            </td>
          </tr>
          <tr>
            <td style={styles.headerCell}>진단 결과</td>
            <td style={{ ...styles.dataCell, fontWeight: "bold", color: "#d32f2f" }} colSpan={3}>
              {data.report || "-"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 나 섹션 */}
      <h2 style={styles.sectionTitle}>1. 나 (Me)</h2>
      <table style={styles.table}>
        <tbody>
          <tr>
            <td style={styles.headerCell}>나를 표현하는 동물</td>
            <td style={styles.dataCell}>{formatFigureMessages(meFigures)}</td>
          </tr>
          <tr>
            <td style={styles.headerCell}>되고 싶은 동물 (소망)</td>
            <td style={styles.dataCell}>{formatFigureMessages(wishFigures)}</td>
          </tr>
        </tbody>
      </table>

      {/* 가족 섹션 */}
      <h2 style={styles.sectionTitle}>2. 가족 (Family)</h2>
      <table style={styles.table}>
        <thead>
          <tr>
            <th style={styles.headerCell}>가족 관계</th>
            <th style={styles.headerCell}>선택한 동물</th>
            <th style={styles.headerCell}>선택 이유</th>
          </tr>
        </thead>
        <tbody>
          {familyFigures.length > 0 ? (
            familyFigures.map((f, idx) => (
              <tr key={idx}>
                <td style={styles.dataCell}>{f.relation}</td>
                <td style={styles.dataCell}>{f.figure}</td>
                <td style={styles.dataCell}>{f.message || "-"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td style={styles.dataCell} colSpan={3}>
                -
              </td>
            </tr>
          )}
          {myFamilyFigure && (
            <tr>
              <td style={styles.dataCell}>{myFamilyFigure.relation} (나)</td>
              <td style={styles.dataCell}>{myFamilyFigure.figure}</td>
              <td style={styles.dataCell}>{myFamilyFigure.message || "-"}</td>
            </tr>
          )}
        </tbody>
      </table>

      {/* 관계성 */}
      <h2 style={styles.sectionTitle}>3. 나와 가족 관계</h2>
      <table style={styles.table}>
        <tbody>
          <tr>
            <td style={styles.headerCell}>친한 가족끼리 동물 세우기</td>
            <td style={styles.dataCell}>{data.friendly_message || "-"}</td>
          </tr>
        </tbody>
      </table>

      {/* 심층 분석 */}
      <h2 style={styles.sectionTitle}>4. 심층 분석</h2>
      <table style={styles.table}>
        <tbody>
          <tr>
            <td style={styles.headerCell}>내가 바라는 가족의 동물상징</td>
            <td style={styles.dataCell}>
              {wishedFamilyFigures.length > 0
                ? wishedFamilyFigures.map((f) => `${f.relation}: ${f.figure}(${f.message})`).join(", ")
                : "-"}
            </td>
          </tr>
          <tr>
            <td style={styles.headerCell}>가족이 생각하는 나</td>
            <td style={styles.dataCell}>
              {familyThinkOfMe.length > 0
                ? familyThinkOfMe
                    .map((f) => `${f.relation}이 생각하는 나: ${f.figure}(${f.message})`)
                    .join(", ")
                : "-"}
            </td>
          </tr>
        </tbody>
      </table>

      {/* 종합 소견 */}
      <h2 style={styles.sectionTitle}>5. 종합 소견 (상담 대화 내용)</h2>
      {llmConversations.length > 0 ? (
        llmConversations.map((conv, idx) => (
          <div key={idx} style={{ marginBottom: "10px" }}>
            <h4 style={{ fontSize: "12px", fontWeight: "bold", marginBottom: "5px" }}>
              [{conv.relation}]에 대한 대화
            </h4>
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={{ ...styles.headerCell, width: "60%" }}>상담사 질문</th>
                  <th style={{ ...styles.headerCell, width: "40%" }}>아동 응답</th>
                </tr>
              </thead>
              <tbody>
                {conv.conversations.map((c, cIdx) => (
                  <tr key={cIdx}>
                    <td style={styles.dataCell}>{c.question}</td>
                    <td style={styles.dataCell}>{c.answer || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))
      ) : (
        <p style={{ color: "#666" }}>대화 기록이 없습니다.</p>
      )}

      {/* 점수 */}
      <div
        style={{
          marginTop: "20px",
          padding: "10px",
          backgroundColor: "#f5f5f5",
          borderRadius: "5px",
          textAlign: "center",
        }}
      >
        <strong>종합 점수:</strong> {data.score || 0}점
      </div>
    </div>
  );
});

const styles: { [key: string]: React.CSSProperties } = {
  sectionTitle: {
    fontSize: "14px",
    fontWeight: "bold",
    marginTop: "15px",
    marginBottom: "8px",
    color: "#1976d2",
    borderLeft: "4px solid #1976d2",
    paddingLeft: "8px",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    marginBottom: "10px",
  },
  headerCell: {
    border: "1px solid #ccc",
    padding: "8px",
    backgroundColor: "#f0f0f0",
    fontWeight: "bold",
    textAlign: "left" as const,
    width: "25%",
  },
  dataCell: {
    border: "1px solid #ccc",
    padding: "8px",
    textAlign: "left" as const,
  },
};

PdfReport.displayName = "PdfReport";

export default PdfReport;
