/**
 * Telegram Error Reporter
 * 콘솔 에러 발생 시 자동으로 텔레그램으로 리포트
 */

const TELEGRAM_BOT_TOKEN = "8606552846:AAHz7IMu1FCo6q2FlanesaTl2hFO2bXshlE";
const TELEGRAM_CHAT_ID = "7238843322";

// 중복 전송 방지 (같은 에러 5분 내 재전송 안 함)
const sentErrors = new Map<string, number>();
const THROTTLE_MS = 5 * 60 * 1000;

function getErrorKey(message: string): string {
  return message.slice(0, 200);
}

async function sendToTelegram(text: string): Promise<void> {
  try {
    await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: TELEGRAM_CHAT_ID,
        text: text.slice(0, 4000), // Telegram 메시지 길이 제한
        parse_mode: "HTML",
      }),
    });
  } catch {
    // 텔레그램 전송 실패는 무시 (무한 루프 방지)
  }
}

function formatError(type: string, message: string, source?: string, line?: number): string {
  const url = window.location.href;
  const time = new Date().toLocaleString("ko-KR", { timeZone: "Asia/Seoul" });
  const userInfo = sessionStorage.getItem("USER");
  let kidName = "";
  try {
    const parsed = JSON.parse(userInfo || "{}");
    kidName = parsed.kidname || "";
  } catch {}

  return [
    `🚨 <b>AI 가족평가 에러</b>`,
    ``,
    `<b>유형:</b> ${type}`,
    `<b>시각:</b> ${time}`,
    `<b>URL:</b> ${url}`,
    kidName ? `<b>내담자:</b> ${kidName}` : "",
    source ? `<b>파일:</b> ${source}:${line || "?"}` : "",
    ``,
    `<b>내용:</b>`,
    `<code>${message.slice(0, 2000)}</code>`,
  ].filter(Boolean).join("\n");
}

function shouldSend(key: string): boolean {
  const now = Date.now();
  const lastSent = sentErrors.get(key);
  if (lastSent && now - lastSent < THROTTLE_MS) return false;
  sentErrors.set(key, now);
  // 오래된 항목 정리
  if (sentErrors.size > 100) {
    for (const [k, v] of sentErrors) {
      if (now - v > THROTTLE_MS) sentErrors.delete(k);
    }
  }
  return true;
}

/**
 * 전역 에러 핸들러 등록.
 * main.tsx에서 한 번 호출하면 됨.
 */
export function initErrorReporter(): void {
  // 1) window.onerror — JS 런타임 에러
  const originalOnError = window.onerror;
  window.onerror = (message, source, lineno, colno, error) => {
    const msg = String(message);
    const key = getErrorKey(msg);
    if (shouldSend(key)) {
      const text = formatError("JS Error", msg, source?.toString(), lineno || undefined);
      sendToTelegram(text);
    }
    if (originalOnError) originalOnError(message, source, lineno, colno, error);
  };

  // 2) unhandledrejection — Promise 에러
  window.addEventListener("unhandledrejection", (event) => {
    const msg = event.reason?.message || event.reason?.toString() || "Unknown Promise rejection";
    const key = getErrorKey(msg);
    if (shouldSend(key)) {
      const stack = event.reason?.stack?.slice(0, 500) || "";
      const text = formatError("Unhandled Promise", `${msg}\n${stack}`);
      sendToTelegram(text);
    }
  });

  // 3) console.error 후킹
  const originalConsoleError = console.error;
  console.error = (...args: any[]) => {
    originalConsoleError.apply(console, args);
    const msg = args.map((a) => (typeof a === "object" ? JSON.stringify(a) : String(a))).join(" ");
    // 노이즈 필터: React 경고, 비치명적 API 에러 등
    if (msg.includes("Warning:") || msg.includes("React does not recognize")) return;
    if (msg.includes("fetchProgress error")) return;  // Layout hydrate 실패 (비치명적, 폴백 있음)
    if (msg.includes("Method Not Allowed")) return;   // 잘못된 HTTP method (비치명적)
    const key = getErrorKey(msg);
    if (shouldSend(key)) {
      const text = formatError("console.error", msg);
      sendToTelegram(text);
    }
  };
}
