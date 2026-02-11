import { forwardRef } from "react";
import {
  ReportData,
  calculateAge,
  convertSex,
  formatDate,
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

  // Data processing
  const meFigures = data.figures?.["1"] || [];
  const wishFigures = data.figures?.["2"] || [];
  const familyFigures = getFamilyMembers(data.figures?.["3"] || [], kidName);
  const myFamilyFigure = (data.figures?.["3"] || []).find(
    (f) => f.relation === "나" || f.relation === kidName || f.relation.includes(kidName)
  );
  if (myFamilyFigure) {
    // Treat 'Me' in family stage as just another family member for the table if needed,
    // or handle separately. The user image lists family members like Dad, Mom, Brother.
    // We will append 'Me' to familyFigures if it exists and isn't already there?
    // Actually the user image shows 'Family' section having 'Dad', 'Mom', 'Little Brother', 'Me'.
    // So let's ensure 'Me' is in familyFigures list for rendering.
    if (!familyFigures.find(f => f.relation === myFamilyFigure.relation)) {
      familyFigures.push(myFamilyFigure);
    }
  }

  const wishedFamilyFigures = data.figures?.["5"] || [];
  const familyThinkOfMe = data.figures?.["6"] || [];
  const llmConversations = formatLLMConversation(data.llmCompletion, data.chatHistory);



  // Helper for simple list: "Animal"
  const formatFigName = (list: any[]) => {
    if (!list || list.length === 0) return "-";
    return list.map(f => f.figure).join(", ");
  };

  // Helper for simple list: "Reason"
  const formatFigMsg = (list: any[]) => {
    if (!list || list.length === 0) return "-";
    return list.map(f => f.message).join(", ");
  };


  return (
    <div
      ref={ref}
      id="pdf-report"
      style={{
        width: "210mm",
        minHeight: "297mm",
        backgroundColor: "#fff",
        fontFamily: "'Noto Sans KR', sans-serif",
        color: "#000",
        boxSizing: "border-box",
      }}
    >
      {/* PAGE 1 */}
      <div style={{ padding: "15mm", height: "297mm", position: 'relative' }}>
        <h1 style={{ textAlign: "center", fontSize: "24px", fontWeight: "bold", marginBottom: "30px" }}>
          부모-자녀 관계 진단모델
        </h1>

        {/* 1. Header Data Table */}
        <table style={styles.table}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '25%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '20%' }} />
          </colgroup>
          <tbody>
            <tr>
              <td style={styles.headerCell} colSpan={6}>Data</td>
            </tr>
            <tr>
              <td style={styles.headerCell}>이름:</td>
              <td style={styles.dataCell}>{kidName}</td>
              <td style={styles.headerCell}>성별:</td>
              <td style={styles.dataCell}>{sex}</td>
              <td style={styles.headerCell}>연령:</td>
              <td style={styles.dataCell}>{age}세</td>
            </tr>
            <tr>
              <td style={styles.headerCell}>상담기관:</td>
              <td style={styles.dataCell}>{data.counselor?.organization || "-"}</td>
              <td style={styles.headerCell}>상담일시:</td>
              <td style={styles.dataCell}>{testDate}</td>
              <td style={styles.headerCell}>진단결과:</td>
              <td style={styles.dataCell}>{data.report ? "완료" : "진행중"}</td>
            </tr>
          </tbody>
        </table>

        <div style={{ height: '10px' }}></div>

        {/* 2. Main Profile Table */}
        <table style={styles.table}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '55%' }} />
          </colgroup>
          <thead>
            <tr>
              <td style={styles.headerCell} colSpan={4}>프로파일</td>
            </tr>
          </thead>
          <tbody>
            {/* ME Section */}
            <tr>
              <td style={styles.headerCell} rowSpan={2}>나</td>
              <td style={styles.subHeaderCell}>나라고 생각되는 동물상징</td>
              <td style={styles.dataCell}>{formatFigName(meFigures)}</td>
              <td style={styles.dataCell}>{formatFigMsg(meFigures)}</td>
            </tr>
            <tr>
              <td style={styles.subHeaderCell}>내가 되고 싶은 동물상징</td>
              <td style={styles.dataCell}>{formatFigName(wishFigures)}</td>
              <td style={styles.dataCell}>{formatFigMsg(wishFigures)}</td>
            </tr>

            {/* FAMILY Section */}
            {/* Only render rows if familyFigures exist, else render one empty row */}
            {familyFigures.length > 0 ? (
              <>
                <tr>
                  <td style={styles.headerCell} rowSpan={familyFigures.length + 1}>가족</td>
                  <td style={styles.subHeaderCell} rowSpan={familyFigures.length}>가족을 상징하는 동물</td>
                  <td style={styles.dataCell}>{familyFigures[0].relation}</td>
                  <td style={styles.dataCell}>
                    {familyFigures[0].figure} ({familyFigures[0].message})
                  </td>
                </tr>
                {familyFigures.slice(1).map((f, i) => (
                  <tr key={i}>
                    <td style={styles.dataCell}>{f.relation}</td>
                    <td style={styles.dataCell}>
                      {f.figure} ({f.message})
                    </td>
                  </tr>
                ))}
              </>
            ) : (
              <tr>
                <td style={styles.headerCell} rowSpan={2}>가족</td>
                <td style={styles.subHeaderCell}>가족을 상징하는 동물</td>
                <td style={styles.dataCell}>-</td>
                <td style={styles.dataCell}>-</td>
              </tr>
            )}
            {/* Friendly Family Positioning */}
            <tr>
              {/* If familyFigures was 0, we need to handle rowSpan carefully. assuming > 0 for normal case */}
              {/* The rowSpan above covers the family members. This is the +1 row */}
              <td style={styles.subHeaderCell}>친한 가족끼리 동물 세우기</td>
              <td style={styles.dataCell} colSpan={2}>
                {data.friendly_message || "-"}
              </td>
            </tr>

            {/* RELATIONS Section */}
            <tr>
              <td style={styles.headerCell} rowSpan={4}>나와 가족 관계</td>
              <td style={styles.subHeaderCell} rowSpan={2}>내가 바라는 가족의 모습 상징</td>
              {/* We need to list items. If multiple, we might need multiple rows or join them.
                      User format implies separate rows for relations like 'Dad', 'Mom' etc.
                      Let's assume we list up to 2 items or join them.
                      For strict table structure matching the image, it splits 'Dad', 'Mom', 'Sister'.
                      Since dynamic, let's just render all in one cell with newlines or create rows dynamically?
                      Dynamic rows with rowSpan is complex. Let's use simple joined text for now or simple list.
                      The image shows: Relation | Meaning.
                   */}
              <td style={styles.dataCell} colSpan={2}>
                {wishedFamilyFigures.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {wishedFamilyFigures.map((f, i) => (
                      <div key={i}><strong>{f.relation}:</strong> {f.figure} - {f.message}</div>
                    ))}
                  </div>
                ) : "-"}
              </td>
            </tr>
            <tr /> {/* Placeholder to satisfy rowSpan=2 logic if we were strictly using rows, but handled by colSpan above for simplicity unless we want strict columns.
                         Let's keep it simple: The image has "Relation" column.
                         Let's try to split columns: [Relation] | [Content].
                         If we do that, we need dynamic rowSpan for "Me & Family Relations" based on count.
                         Let's stick to colSpan=2 for content to be safe against overflow.
                      */}

            <tr>
              <td style={styles.subHeaderCell} rowSpan={2}>가족이 생각하는 나를 상징하는 동물</td>
              <td style={styles.dataCell} colSpan={2}>
                {familyThinkOfMe.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                    {familyThinkOfMe.map((f, i) => (
                      <div key={i}><strong>{f.relation}:</strong> {f.figure} - {f.message}</div>
                    ))}
                  </div>
                ) : "-"}
              </td>
            </tr>
            <tr />
          </tbody>
        </table>

        <div style={{ height: '20px' }}></div>

        {/* 3. Evaluator Comments */}
        <table style={styles.table}>
          <tbody>
            <tr>
              <td style={{ ...styles.headerCell, height: '100px', verticalAlign: 'top' }}>평가자 종합소견 및 제언</td>
            </tr>
            <tr>
              <td style={{ padding: '10px', height: '150px', border: '1px solid #000', verticalAlign: 'top' }}>
                {/* Empty or pre-filled if logic exists */}
                {data.report || ""}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* PAGE 2 - Interview Details */}
      <div style={{ padding: "15mm", height: "297mm", pageBreakBefore: 'always' }}>
        <h2 style={{ textAlign: "center", fontSize: "18px", fontWeight: "bold", marginBottom: "20px" }}>
          상담 인터뷰 세부 내용
        </h2>
        <table style={styles.table}>
          <colgroup>
            <col style={{ width: '10%' }} />
            <col style={{ width: '45%' }} />
            <col style={{ width: '45%' }} />
          </colgroup>
          <thead>
            <tr>
              <th style={styles.headerCellCentered}>가족</th>
              <th style={styles.headerCellCentered}>추가 질문</th>
              <th style={styles.headerCellCentered}>답변내용</th>
            </tr>
          </thead>
          <tbody>
            {llmConversations.map((conv, i) => {
              const rowCount = conv.conversations.length;
              return conv.conversations.map((c, j) => (
                <tr key={`${i}-${j}`}>
                  {j === 0 && (
                    <td style={styles.dataCellCentered} rowSpan={rowCount}>
                      {conv.relation}
                    </td>
                  )}
                  <td style={styles.dataCell}>{c.question}</td>
                  <td style={styles.dataCell}>{c.answer}</td>
                </tr>
              ));
            })}
            {llmConversations.length === 0 && (
              <tr><td colSpan={3} style={styles.dataCellCentered}>대화 내용이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
});

const styles: { [key: string]: React.CSSProperties } = {
  table: {
    width: "100%",
    borderCollapse: "collapse",
    border: "1px solid #000",
    fontSize: "10px",
  },
  headerCell: {
    border: "1px solid #000",
    padding: "5px 8px",
    backgroundColor: "#f5f5f5",
    fontWeight: "bold",
    textAlign: "left",
    verticalAlign: "middle",
  },
  headerCellCentered: {
    border: "1px solid #000",
    padding: "5px 8px",
    backgroundColor: "#f5f5f5",
    fontWeight: "bold",
    textAlign: "center",
    verticalAlign: "middle",
  },
  subHeaderCell: {
    border: "1px solid #000",
    padding: "5px 8px",
    textAlign: "center",
    verticalAlign: "middle",
    fontWeight: "bold",
  },
  dataCell: {
    border: "1px solid #000",
    padding: "5px 8px",
    textAlign: "left",
    verticalAlign: "middle",
    whiteSpace: "pre-wrap",
  },
  dataCellCentered: {
    border: "1px solid #000",
    padding: "5px 8px",
    textAlign: "center",
    verticalAlign: "middle",
  },
};

PdfReport.displayName = "PdfReport";

export default PdfReport;
