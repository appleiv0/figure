import * as XLSX from "xlsx";

interface SessionData {
  kid?: { name?: string; sex?: string; birth?: string };
  report?: string;
  figures?: Record<string, any[]>;
  [key: string]: any;
}

const calculateAge = (birthDate: string): number => {
  if (!birthDate) return 0;
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) age--;
  return age;
};

const formatSex = (sex?: string): string => {
  if (sex === "Female") return "여";
  if (sex === "Male") return "남";
  return "-";
};

export const exportSessionsToExcel = (sessions: SessionData[], filename?: string) => {
  if (sessions.length === 0) return;

  // 1. Find max counts across all selected sessions
  let maxFamilyCount = 0;
  let maxWishedFamilyCount = 0;
  let maxDollCount = 0;

  sessions.forEach((session) => {
    const familyFigures = session.figures?.["3"] || [];
    const wishedFamilyFigures = session.figures?.["5"] || [];
    const dollInstances = session.dollInstances || [];
    if (familyFigures.length > maxFamilyCount) maxFamilyCount = familyFigures.length;
    if (wishedFamilyFigures.length > maxWishedFamilyCount) maxWishedFamilyCount = wishedFamilyFigures.length;
    if (dollInstances.length > maxDollCount) maxDollCount = dollInstances.length;
  });

  // Ensure at least 1 column for dynamic fields
  maxFamilyCount = Math.max(maxFamilyCount, 1);
  maxWishedFamilyCount = Math.max(maxWishedFamilyCount, 1);
  maxDollCount = Math.max(maxDollCount, 1);

  // 2. Build headers
  const headers: string[] = [
    "이름",
    "결과",
    "가족유형",
    "판정내용",
    "진단(자기상)", "진단(소망상)", "진단(가족상)", "배치점수", "가족소망긴장", "자기인식긴장", "긴장/갈등",
    "성별",
    "나이",
    "나1", "나2", "나3", "나4",
    "소망상징1", "소망상징2", "소망상징3", "소망상징4",
  ];

  for (let i = 1; i <= maxFamilyCount; i++) {
    headers.push(`가족상징${i}`);
  }
  for (let i = 1; i <= maxWishedFamilyCount; i++) {
    headers.push(`가족소망상징${i}`);
  }

  // 3D 인형 배치 데이터 헤더
  for (let i = 1; i <= maxDollCount; i++) {
    headers.push(`인형${i}_역할`, `인형${i}_모델`, `인형${i}_자세`, `인형${i}_회전`, `인형${i}_X`, `인형${i}_Y`, `인형${i}_Z`, `인형${i}_크기`);
  }

  // 3. Build rows
  const rows: string[][] = sessions.map((session) => {
    const meFigures = session.figures?.["1"] || [];
    const wishFigures = session.figures?.["2"] || [];
    const familyFigures = session.figures?.["3"] || [];
    const wishedFamilyFigures = session.figures?.["5"] || [];

    const abuse = session.abuse || {};
    const row: string[] = [
      session.kid?.name || "-",
      session.report || "-",
      session.familyType || "-",
      session.aiEvaluation || "-",
      abuse["1"] ? "해당" : "정상",
      abuse["2"] ? "해당" : "정상",
      abuse["3"] ? "해당" : "정상",
      `${abuse["4"] || 0}`,
      abuse["5"] ? "해당" : "정상",
      abuse["6"] ? "해당" : "정상",
      session.tension || "-",
      formatSex(session.kid?.sex),
      session.kid?.birth ? `${calculateAge(session.kid.birth)}` : "-",
    ];

    // 나1~나4 (me figures)
    for (let i = 0; i < 4; i++) {
      row.push(meFigures[i]?.figure || meFigures[i]?.name || "");
    }

    // 소망상징1~소망상징4 (wish figures)
    for (let i = 0; i < 4; i++) {
      row.push(wishFigures[i]?.figure || wishFigures[i]?.name || "");
    }

    // 가족상징1~N (family figures)
    for (let i = 0; i < maxFamilyCount; i++) {
      const fig = familyFigures[i];
      row.push(fig ? `${fig.relation}:${fig.figure || fig.name || ""}` : "");
    }

    // 가족소망상징1~N (wished family figures)
    for (let i = 0; i < maxWishedFamilyCount; i++) {
      const fig = wishedFamilyFigures[i];
      row.push(fig ? `${fig.relation}:${fig.figure || fig.name || ""}` : "");
    }

    // 3D 인형 배치 데이터
    const dollInstances = session.dollInstances || [];
    for (let i = 0; i < maxDollCount; i++) {
      const doll = dollInstances[i];
      if (doll) {
        row.push(
          doll.label || "",
          doll.dollModel || "",
          doll.pose || "",
          `${doll.rotation ?? ""}`,
          `${doll.position?.x ?? ""}`,
          `${doll.position?.y ?? ""}`,
          `${doll.position?.z ?? ""}`,
          `${doll.size ?? ""}`,
        );
      } else {
        row.push("", "", "", "", "", "", "", "");
      }
    }

    return row;
  });

  // 4. Create worksheet and workbook
  const wsData = [headers, ...rows];
  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Auto-fit column widths
  const colWidths = headers.map((header, idx) => {
    let maxLen = header.length;
    rows.forEach((row) => {
      const cellLen = (row[idx] || "").length;
      if (cellLen > maxLen) maxLen = cellLen;
    });
    return { wch: Math.min(maxLen + 2, 30) };
  });
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "세션 데이터");

  // 5. Download via base64 data URL (avoids Chrome HTTP blocking)
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const fname = filename || `세션데이터_${date}.xlsx`;
  const wbout = XLSX.write(wb, { bookType: "xlsx", type: "base64" });
  const a = document.createElement("a");
  a.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${wbout}`;
  a.download = fname;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};
