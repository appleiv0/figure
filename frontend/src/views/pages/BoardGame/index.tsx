import { useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

const BASE = import.meta.env.BASE_URL;

const NAV_LINKS = [
  { label: "게임 소개", href: "#about" },
  { label: "놀이치료 효과", href: "#effect" },
  { label: "게임 방법", href: "#howto" },
  { label: "구매하기", href: "#purchase" },
];

const EVAL_SECTIONS = [
  {
    key: "A", reverse: false,
    scenario: "양치기가 없는 틈을 타서 늑대 무리가 양을 잡아 먹으러 오고 있습니다. 당신이 양치기 개라면 늑대의 공격을 받은 당신은 어떻게 해야 할까요?",
    options: [
      "모르겠다.",
      "늑대의 수가 많아 이길 승산이 없으니 도망가서 목숨을 지킨다.",
      "늑대로부터 양을 지키기 위해 싸운다.",
      "주변에 도움을 얻을 수 있는 방법을 찾거나 다른 개들과 협상을 한다.",
    ],
  },
  {
    key: "B", reverse: true,
    scenario: "늑대 무리수가 너무 많아서 막아낼 수 없습니다. 이 상황에서 당신은 위기를 극복하기 위해 구체적으로 어떻게 할 것인가?",
    options: [
      "주변의 다른 개들과 협상을 하여 도움을 요청하고, 숫양들과 힘을 합쳐 최대한 시간을 벌며 버텨낸다.",
      "어떻게든 막아내기 위해 끝까지 최선을 다해 싸운다.",
      "막아낼 방법을 찾을 때까지 안전한 곳에 숨어있겠다.",
      "더 이상 막아낼 방법이 없을 것이다. 빠르게 도망간다.",
    ],
  },
  {
    key: "C", reverse: false,
    scenario: "주변의 다른 개들에게 도움을 받기 위해 당신은 구체적으로 어떻게 할 것인가?",
    options: [
      "다른 개들이 도와주려고 하지 않을 것이다. 나도 도움은 필요 없다.",
      "도와달라고 요청하지만 도와주지 않는다면 도망가겠다.",
      "너희가 같이 싸워준다면 보상을 받을 수 있을 거라 설득해본다.",
      "먼저, 사료를 나눠주고, 뒤에서 우리를 지원해주면 큰 보상을 받을 수 있게 돕겠다고 설득한다.",
    ],
  },
  {
    key: "D", reverse: false,
    scenario: "다른 개들이 도와주는 것을 거절한다면 당신은 어떻게 할 것인가? 이 문제를 해결할 방법이 있나요?",
    options: [
      "할 수 없다. 다른 방법이 없으니 도망가겠다.",
      "도와달라고 계속 설득하지만 안 되면 도망갈 것이다. 가장 중요한 것은 내 목숨이다.",
      "너희가 하고 싶은 방법으로 뭐든지 해준다면 우리의 사료와 일자리를 양보하겠다고 계속 설득한다.",
      "너희가 도와주면 사료와 일자리를 양보하겠다고 설득하면서, 동시에 다른 해결의 자원이 있는지를 찾아본다. 최대한 늑대와 협상을 오래 끌면서 늑대들의 공격을 늦출 것이다.",
    ],
  },
  {
    key: "E", reverse: true,
    scenario: "늑대가 양 몇 마리만 넘기면 물러갈 것이라고 협상을 제안합니다. 당신은 어떻게 하겠는가?",
    options: [
      "늑대의 제안을 받아들이는 척 하면서 양치기가 올 때까지 시간을 끌겠다.",
      "늑대의 말을 믿지 못하겠다. 줘도 물러가지 않을 테니 절대 주지 않겠다.",
      "다른 양들이라도 구할 수 있다면 주겠다.",
      "모르겠다.",
    ],
  },
  {
    key: "F", reverse: true,
    scenario: "양치기가 돌아왔을 때 늑대들은 물러나고 대신 멀리서 지켜보다 다른 개들이 다가와서 \"양치기 개들은 양을 잘 지키지 못하고 도망만 다니고 우리가 양들을 지켰다\" 라고 거짓말을 했습니다. 양치기는 다른 개들의 말을 믿고 화를 낸다면 당신은 어떻게 하겠는가?",
    options: [
      "양들에게 사실을 있는 그대로 말해달라고 하고 양치기가 오해를 풀게 할 것이다.",
      "다른 개들이 거짓말을 하는 것이라며 설명을 하지만 양치기가 믿지 않는다면 속상한 마음을 표현할 것이다.",
      "양치기와 다른 개들에게 화를 낼 것이다.",
      "나를 믿지 않는 곳에서는 더 이상 일하지 않겠다.",
    ],
  },
  {
    key: "G", reverse: false,
    scenario: "양치기와 다시 잘 지내기 위해 당신은 어떻게 할 것인가?",
    options: [
      "양치기에게 실망했다. 잘 지내고 싶지 않다.",
      "양치기와 신뢰가 깨져서 어떤 식으로든 복수할 것이다.",
      "양치기가 오해를 풀 수 있도록 더 열심히 나름의 보람을 가지고 일하겠다.",
      "양치기가 오해를 풀고 다른 개들에게도 일할 기회를 얻게 해서 다음에 늑대가 왔을 때를 대비할 방법을 찾아보겠다.",
    ],
  },
];

const BoardGame = () => {
  const navigate = useNavigate();
  const [showTheoryModal, setShowTheoryModal] = useState(false);
  const [showQuestionsModal, setShowQuestionsModal] = useState(false);
  const [showEvalModal, setShowEvalModal] = useState(false);
  const [showPuppetModal, setShowPuppetModal] = useState(false);
  const [showGameTherapyModal, setShowGameTherapyModal] = useState(false);
  const [evalAnswers, setEvalAnswers] = useState<Record<string, number>>({});
  const [showEvalResult, setShowEvalResult] = useState(false);
  const evalContentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    document.documentElement.style.scrollBehavior = "smooth";
    return () => {
      document.documentElement.style.scrollBehavior = "";
    };
  }, []);

  const scrollTo = (href: string) => {
    const el = document.querySelector(href);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const evalAllAnswered = Object.keys(evalAnswers).length === 7;
  const evalScore = EVAL_SECTIONS.reduce((sum, s) => {
    const ans = evalAnswers[s.key];
    if (ans == null) return sum;
    return sum + (s.reverse ? 5 - ans : ans);
  }, 0);
  const evalLevel = evalScore <= 8
    ? { level: "1단계", label: "낮음", color: "#ef5350", bg: "#ffebee" }
    : evalScore <= 16
    ? { level: "2단계", label: "중간", color: "#ff9800", bg: "#fff3e0" }
    : evalScore <= 24
    ? { level: "3단계", label: "높음", color: "#42a5f5", bg: "#e3f2fd" }
    : { level: "4단계", label: "매우 높음", color: "#66bb6a", bg: "#e8f5e9" };

  const saveEvalPdf = async () => {
    if (!evalContentRef.current) return;
    const container = evalContentRef.current;
    const scrollParent = container.parentElement;

    // 스크롤 맨 위로
    if (scrollParent) scrollParent.scrollTop = 0;

    // 버튼 숨기기
    const hiddenEls = container.querySelectorAll<HTMLElement>("[data-pdf-hide]");
    hiddenEls.forEach((el) => { el.dataset.prevDisplay = el.style.display; el.style.display = "none"; });

    // PDF 전용 요소 표시
    const pdfOnlyEls = container.querySelectorAll<HTMLElement>("[data-pdf-only]");
    pdfOnlyEls.forEach((el) => { el.style.display = ""; });

    // 레이아웃 안정화 대기
    await new Promise((r) => setTimeout(r, 150));

    // 섹션별 위치 수집 - getBoundingClientRect 사용으로 정확도 향상
    const containerRect = container.getBoundingClientRect();
    const sectionPositions: { top: number; bottom: number; forceBreak: boolean }[] = [];
    Array.from(container.children).forEach((child) => {
      const el = child as HTMLElement;
      if (el.offsetHeight > 0 && getComputedStyle(el).display !== "none") {
        const r = el.getBoundingClientRect();
        sectionPositions.push({
          top: r.top - containerRect.top,
          bottom: r.bottom - containerRect.top,
          forceBreak: el.hasAttribute("data-pdf-pagebreak"),
        });
      }
    });

    // 전체 캡처 - windowWidth 제거하여 실제 DOM 크기와 일치
    const canvas = await html2canvas(container, {
      scale: 2, useCORS: true, backgroundColor: "#ffffff",
    });

    // 버튼 복원, PDF 전용 요소 숨기기
    hiddenEls.forEach((el) => { el.style.display = el.dataset.prevDisplay || ""; delete el.dataset.prevDisplay; });
    pdfOnlyEls.forEach((el) => { el.style.display = "none"; });

    // PDF 생성 - 섹션 경계에서만 페이지 분할
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const m = 10;
    const usableW = pageW - m * 2;
    const usableH = pageH - m * 2;
    const cssScale = 2;
    const contentPxW = canvas.width / cssScale;
    const mmPerPx = usableW / contentPxW;
    const usableHPx = usableH / mmPerPx;
    const totalHPx = canvas.height / cssScale;

    const pages: { start: number; end: number }[] = [];
    let pageStart = 0;

    for (let i = 0; i < sectionPositions.length; i++) {
      const sec = sectionPositions[i];
      // 강제 페이지 넘김
      if (sec.forceBreak && sec.top > pageStart) {
        pages.push({ start: pageStart, end: sec.top });
        pageStart = sec.top;
        continue;
      }
      // 섹션이 현재 페이지를 넘어가면 새 페이지 시작
      if (sec.bottom > pageStart + usableHPx && sec.top > pageStart) {
        pages.push({ start: pageStart, end: sec.top });
        pageStart = sec.top;
        if (sec.bottom > pageStart + usableHPx) continue;
      }
    }
    pages.push({ start: pageStart, end: totalHPx });

    for (let p = 0; p < pages.length; p++) {
      if (p > 0) pdf.addPage();
      const { start, end } = pages[p];
      const sliceH = end - start;
      const cropCanvas = document.createElement("canvas");
      cropCanvas.width = canvas.width;
      cropCanvas.height = Math.ceil(sliceH * cssScale);
      cropCanvas.getContext("2d")!.drawImage(
        canvas,
        0, Math.floor(start * cssScale), canvas.width, Math.ceil(sliceH * cssScale),
        0, 0, canvas.width, Math.ceil(sliceH * cssScale),
      );
      pdf.addImage(cropCanvas.toDataURL("image/png"), "PNG", m, m, usableW, sliceH * mmPerPx);
    }

    pdf.save("EIPS_평가결과.pdf");
  };

  return (
    <div className="min-h-screen bg-white" style={{ fontFamily: "'Pretendard', 'Noto Sans KR', sans-serif" }}>
      {/* ─── Navigation Bar ─── */}
      <nav className="sticky top-0 z-50 bg-white border-b border-grey-300" style={{ borderColor: "#e5e7eb" }}>
        <div className="max-w-[1200px] mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-3">
            <img src={`${BASE}assets/images/kaft-logo.png`} alt="한국인형치료연구회" className="h-10" />
            <div className="hidden sm:flex flex-col leading-tight">
              <span className="text-grey-700 text-[11px] font-semibold">(사)한국인형치료학회</span>
              <span className="text-grey-700 text-[11px] font-semibold">한국인형치료연구회</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => scrollTo(link.href)}
                className="text-grey-700 text-sm font-medium hover:opacity-70 transition-opacity hidden sm:block"
              >
                {link.label}
              </button>
            ))}
            <button
              onClick={() => navigate("/login")}
              className="text-sm font-semibold text-white px-4 py-2 rounded-lg transition-transform hover:scale-105"
              style={{ backgroundColor: "#E8734A" }}
            >
              AI 가족평가
            </button>
          </div>
        </div>
      </nav>

      {/* ─── Hero Section ─── */}
      <section className="relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `radial-gradient(circle at 20% 50%, #00838F 0%, transparent 50%),
                              radial-gradient(circle at 80% 20%, #E8734A 0%, transparent 50%)`,
          }}
        />

        <div className="relative max-w-[1200px] mx-auto px-6 pt-20 pb-16 md:pt-28 md:pb-24">
          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Left: Text */}
            <div className="flex-1 text-center md:text-left">
              <div
                className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide mb-6"
                style={{ backgroundColor: "#E8F6F7", color: "#00838F" }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "#00838F" }} />
                문제해결 보드게임
              </div>

              <h1
                className="text-4xl md:text-6xl font-extrabold tracking-tight mb-5"
                style={{ color: "#111827" }}
              >
                양떼를 지켜라!
              </h1>

              <p className="text-grey-600 text-sm md:text-base max-w-2xl mb-4 leading-relaxed text-left">
                양치기 개, 양과 늑대라는 동물상징을 경쟁, 도전, 문제해결, 그리고 보상이라는 은유적 스토리텔링으로 구조화한 문제해결 인형치료를 이론적 기반으로 개발하였습니다.
                신화 속 영웅 이야기처럼 플레이어는 양치기 개가 되어 양을 지키는 모험의 여정을 떠나게 됩니다.
                양치기 개는 양 떼를 늑대로부터 안전하게 지켜서 목초지까지 무사히 데리고 가야 합니다.
                양치기를 대신해서 늑대로부터 양을 안전하게 목초지까지 가장 많이 데리고 온 양치기 개가 승리하는 게임입니다.
              </p>
              <p className="text-grey-600 text-sm md:text-base max-w-2xl mb-8 leading-relaxed text-left">
                이 게임을 통해 모든 플레이어는 학교 및 또래관계에서 갈등이 생겼을 때 문제를 해결하고 협력하는 다양한 방법을 배울 수 있습니다.
                또한 부모와 자녀 간 긍정적 관계를 맺을 수 있는 상호작용 증진의 효과가 있습니다.
              </p>

              {/* Badges */}
              <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-10">
                {[
                  { icon: "👥", text: "2~4인" },
                  { icon: "⏱", text: "30분~1시간" },
                  { icon: "🎯", text: "전 연령 가능" },
                ].map((badge) => (
                  <span
                    key={badge.text}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium border"
                    style={{ borderColor: "#e5e7eb", color: "#374151", backgroundColor: "#fafafa" }}
                  >
                    <span>{badge.icon}</span>
                    {badge.text}
                  </span>
                ))}
              </div>

              <button
                onClick={() => scrollTo("#purchase")}
                className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-white text-lg font-bold shadow-lg transition-all hover:scale-105 hover:shadow-xl"
                style={{ backgroundColor: "#E8734A" }}
              >
                구매하기
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </button>
            </div>

            {/* Right: Box front image */}
            <div className="flex-1 flex justify-center">
              <img
                src={`${BASE}assets/images/boardgame/box-3d.jpg`}
                alt="양떼를 지켜라 박스"
                className="w-full max-w-[420px] rounded-2xl"
                style={{ objectFit: "contain" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 게임 소개 Section ─── */}
      <section id="about" className="py-20 md:py-28" style={{ backgroundColor: "#f9fafb" }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-14">
            <span
              className="text-xs font-bold tracking-widest uppercase mb-3 block"
              style={{ color: "#00838F" }}
            >
              About
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-grey-900 mb-4">게임 소개</h2>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Left: Feature cards */}
            <div className="flex-1">
              <div className="grid grid-cols-1 gap-5">
                {/* 이론적 배경 카드 - 클릭 시 모달 */}
                <div
                  onClick={() => setShowTheoryModal(true)}
                  className="bg-white rounded-2xl p-6 shadow-sm border transition-all hover:shadow-lg cursor-pointer"
                  style={{ borderColor: "#00838F", borderWidth: 2 }}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0"
                      style={{ backgroundColor: "#E8734A" }}
                    >
                      📖
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-1" style={{ color: "#00838F" }}>
                        양떼를 지켜라 문제해결 인형치료의 이론적 배경
                      </h3>
                      <p className="text-sm text-grey-600 leading-relaxed">클릭하여 자세히 보기 →</p>
                    </div>
                  </div>
                </div>

                {/* 구조화 질문 카드 */}
                <div
                  onClick={() => setShowQuestionsModal(true)}
                  className="bg-white rounded-2xl p-6 shadow-sm border transition-all hover:shadow-lg cursor-pointer"
                  style={{ borderColor: "#E8734A", borderWidth: 2 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: "#E8734A" }}>
                      📝
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-1" style={{ color: "#E8734A" }}>양떼를 지켜라 문제해결 인형치료 구조화 질문</h3>
                      <p className="text-sm text-grey-600 leading-relaxed">클릭하여 자세히 보기 →</p>
                    </div>
                  </div>
                </div>

                {/* 대인간 문제 해결 평가 카드 */}
                <div
                  onClick={() => { setEvalAnswers({}); setShowEvalResult(false); setShowEvalModal(true); }}
                  className="bg-white rounded-2xl p-6 shadow-sm border transition-all hover:shadow-lg cursor-pointer"
                  style={{ borderColor: "#5c6bc0", borderWidth: 2 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: "#5c6bc0" }}>
                      📊
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-1" style={{ color: "#5c6bc0" }}>대인 간 문제해결력 평가 : EIPS (체점 가능)</h3>
                      <p className="text-sm text-grey-600 leading-relaxed">클릭하여 평가 시작하기 →</p>
                    </div>
                  </div>
                </div>

                {/* 퍼펫 놀이 카드 */}
                <div
                  onClick={() => setShowPuppetModal(true)}
                  className="bg-white rounded-2xl p-6 shadow-sm border transition-all hover:shadow-lg cursor-pointer"
                  style={{ borderColor: "#43a047", borderWidth: 2 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: "#43a047" }}>
                      🧸
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-1" style={{ color: "#43a047" }}>양떼를 지켜라 퍼펫 놀이</h3>
                      <p className="text-sm text-grey-600 leading-relaxed">클릭하여 자세히 보기 →</p>
                    </div>
                  </div>
                </div>

                {/* 게임 놀이치료의 중요성 카드 */}
                <div
                  onClick={() => setShowGameTherapyModal(true)}
                  className="bg-white rounded-2xl p-6 shadow-sm border transition-all hover:shadow-lg cursor-pointer"
                  style={{ borderColor: "#f9a825", borderWidth: 2 }}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-lg font-bold flex-shrink-0" style={{ backgroundColor: "#f9a825" }}>
                      🎮
                    </div>
                    <div>
                      <h3 className="text-base font-bold mb-1" style={{ color: "#f9a825" }}>게임 놀이치료의 중요성</h3>
                      <p className="text-sm text-grey-600 leading-relaxed">클릭하여 자세히 보기 →</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Box back image */}
            <div className="flex-1 flex justify-center">
              <img
                src={`${BASE}assets/images/boardgame/box-back.jpg`}
                alt="양떼를 지켜라 박스 후면"
                className="w-full max-w-[400px] rounded-2xl shadow-lg"
                style={{ objectFit: "cover" }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* ─── 놀이치료 효과 Section ─── */}
      <section id="effect" className="py-20 md:py-28 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-14">
            <span
              className="text-xs font-bold tracking-widest uppercase mb-3 block"
              style={{ color: "#00838F" }}
            >
              Therapeutic Effect
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-grey-900 mb-4">놀이치료적 효과</h2>
            <p className="text-grey-600 max-w-2xl mx-auto leading-relaxed">
              '양떼를 지켜라'는 문제해결력 향상, 협력능력 증진, 정서 및 신체적 교류 촉진,
              대인 간 사회적 욕구 활성화, 타인과 협력하는 방법 학습을 목표로 합니다.
            </p>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-12">
            {/* Left: effect image */}
            <div className="flex-1 flex justify-center">
              <img
                src={`${BASE}assets/images/boardgame/effect.jpg`}
                alt="놀이치료적 효과"
                className="w-full max-w-[500px] rounded-2xl shadow-lg"
                style={{ objectFit: "cover" }}
              />
            </div>

            {/* Right: description */}
            <div className="flex-1">
              <div
                className="rounded-2xl border p-8"
                style={{ borderColor: "#f0f0f0", backgroundColor: "#f9fafb" }}
              >
                <h3 className="text-lg font-bold text-grey-900 mb-4">문제해결의 5단계</h3>
                <p className="text-sm text-grey-600 leading-relaxed mb-6">
                  Nezu et al. (2009)의 문제해결 모델을 기반으로 설계되었습니다.
                </p>
                <div className="space-y-3">
                  {[
                    { step: "1", label: "긍정적 태도" },
                    { step: "2", label: "정의" },
                    { step: "3", label: "대안" },
                    { step: "4", label: "예측" },
                    { step: "5", label: "실행" },
                  ].map((item, i, arr) => (
                    <div key={item.step} className="flex items-center gap-4">
                      <div className="flex flex-col items-center">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold"
                          style={{ backgroundColor: "#00838F" }}
                        >
                          {item.step}
                        </div>
                        {i < arr.length - 1 && (
                          <div className="w-0.5 h-4 mt-1" style={{ backgroundColor: "#d1e7e9" }} />
                        )}
                      </div>
                      <span className="text-sm font-semibold text-grey-800">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Q&A: 보드게임이 문제해결력을 키워주는 방법 */}
          <div className="mt-16">
            <div
              className="rounded-2xl border p-8 md:p-10"
              style={{ borderColor: "#d1e7e9", backgroundColor: "#f0fafa" }}
            >
              <h3 className="text-xl font-bold mb-8" style={{ color: "#00838F" }}>
                Q. 보드게임의 어떤 부분이 문제해결력을 키워주는지 궁금해요?
              </h3>

              <div className="space-y-8">
                {/* Step 1 */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: "#00838F" }}
                    >
                      1
                    </div>
                    <h4 className="text-lg font-bold text-grey-900">문제 만나기</h4>
                  </div>
                  <div
                    className="ml-11 rounded-xl p-5"
                    style={{ backgroundColor: "white", border: "1px solid #e8e8e8" }}
                  >
                    <p className="text-sm text-grey-700 leading-relaxed mb-3">
                      신화 속 영웅 이야기처럼 플레이어는 양치기 개가 되어 양을 지키는 모험의 여정을 떠나게 됩니다. 양치기 개는 양 떼를 늑대로부터 안전하게 지켜서 목초지까지 무사히 데리고 가야 합니다. 양치기를 대신해서 늑대로부터 양을 안전하게 목초지까지 가장 많이 데리고 온 양치기 개가 승리하는 게임입니다.
                    </p>
                    <p className="text-sm text-grey-700 leading-relaxed">
                      게임 안에서는 "양을 늑대로부터 지켜야 한다"는 목표가 있잖아요. "아, 해결해야 할 문제가 있구나"를 시작부터 느끼게 돼요. 현실에서는 "친구가 나를 놀렸어", "화가 났어" 같은 문제를 바로 말하면 부담스러울 수 있는데, 게임에서는 그걸 양을 지키는 상황으로 바꿔서 조금 더 안전하게 다룰 수 있어요.
                    </p>
                  </div>
                </div>

                {/* Step 2 */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: "#00838F" }}
                    >
                      2
                    </div>
                    <h4 className="text-lg font-bold text-grey-900">지금 무슨 상황인지 알 수 있어요.</h4>
                  </div>
                  <div
                    className="ml-11 rounded-xl p-5"
                    style={{ backgroundColor: "white", border: "1px solid #e8e8e8" }}
                  >
                    <p className="text-sm text-grey-700 leading-relaxed">
                      아이들은 자기 차례가 오면 그냥 움직이기만 하는 게 아니라, 지금 내가 어디에 있는지, 양이 몇 개인지, 클로버가 몇 개인지 어떤 칸에 도착했는지, 미션이 뭔지 이런 걸 계속 봐야 해요. "지금 내 상황이 어떤지 파악하는 연습"을 하게 되는 거예요. 이게 문제해결에서 되게 중요해요. 문제를 제대로 알아야 해결도 하니까요.
                    </p>
                  </div>
                </div>

                {/* Step 3 */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: "#00838F" }}
                    >
                      3
                    </div>
                    <h4 className="text-lg font-bold text-grey-900">여러 방법을 생각하게 만들어줘요</h4>
                  </div>
                  <div
                    className="ml-11 rounded-xl p-5"
                    style={{ backgroundColor: "white", border: "1px solid #e8e8e8" }}
                  >
                    <p className="text-sm text-grey-700 leading-relaxed">
                      이 게임에서는 무조건 한 가지 행동만 하는 게 아니라, 지금 바로 양을 얻는 게 나은지, 클로버를 모으는 게 나은지 행동카드를 쓸지, 미션에서 어떤 답을 고를지, 계속 선택해야 해요. 이건 아이가 "방법은 하나만 있는 게 아니구나"를 배우게 도와줘요. 현실에서도 친구랑 갈등이 생기면 바로 화내거나 피하는 것 말고 다른 방법을 생각할 수 있게 되는 거죠.
                    </p>
                  </div>
                </div>

                {/* Step 4 */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: "#00838F" }}
                    >
                      4
                    </div>
                    <h4 className="text-lg font-bold text-grey-900">결과를 미리 생각하게 해줘요.</h4>
                  </div>
                  <div
                    className="ml-11 rounded-xl p-5"
                    style={{ backgroundColor: "white", border: "1px solid #e8e8e8" }}
                  >
                    <p className="text-sm text-grey-700 leading-relaxed">
                      이 게임은 선택하면 바로 결과가 생겨요. 양을 얻을 수도 있고 양을 잃을 수도 있고, 클로버를 써야 할 수도 있고 마지막에 더 유리해질 수도 있어요. 그래서 아이는 자연스럽게 "이걸 하면 어떻게 될까?"를 생각하게 돼요. 이게 바로 문제해결에서 중요한 결과 예측이에요. 현실에서도 "이 말을 하면 친구가 더 화날까?", "이렇게 하면 해결될까?"를 생각하는 힘이 필요하잖아요.
                    </p>
                  </div>
                </div>

                {/* Step 5 */}
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                      style={{ backgroundColor: "#00838F" }}
                    >
                      5
                    </div>
                    <h4 className="text-lg font-bold text-grey-900">안전한 방식으로 선택 해보고, 다시 고칠 수 있어요.</h4>
                  </div>
                  <div
                    className="ml-11 rounded-xl p-5"
                    style={{ backgroundColor: "white", border: "1px solid #e8e8e8" }}
                  >
                    <p className="text-sm text-grey-700 leading-relaxed">
                      그리고 그 결과를 보고 다음 차례에 다시 바꿔요. 보드게임 안에서 해보고, 결과를 보고 다음엔 다르게 해보는 연습을 반복하는 거예요. 이게 문제해결 훈련에서 제일 중요해요. 좋은 방법은 그냥 듣는다고 생기는 게 아니라, 해보고 수정하면서 배우는 것이기 때문이에요.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 개발자 Section ─── */}
      <section className="py-20 md:py-28" style={{ backgroundColor: "#f9fafb" }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-14">
            <span
              className="text-xs font-bold tracking-widest uppercase mb-3 block"
              style={{ color: "#00838F" }}
            >
              Developer
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-grey-900 mb-4">개발자</h2>
          </div>

          <div className="max-w-2xl mx-auto">
            <div
              className="bg-white rounded-2xl border p-8 shadow-sm"
              style={{ borderColor: "#f0f0f0" }}
            >
              <h3 className="text-xl font-bold text-grey-900 mb-2">선우현 교수</h3>
              <p className="text-sm font-semibold mb-5" style={{ color: "#00838F" }}>
                명지대학교 통합치료대학원
              </p>
              <ul className="space-y-2.5 text-sm text-grey-700 leading-relaxed">
                {[
                  "명지대학교 통합치료대학원 아동심리치료학과 주임교수",
                  "(사)한국인형치료학회 이사 및 슈퍼바이저",
                  "한국기독교상담심리학회 놀이아동상담 감독 및 자격위원장",
                  "한국트라우마가족치료학회 슈퍼바이저",
                  "한국 PCTI 협회 이사 및 국제 PCIT Level 1 Trainer",
                  "EBS 다큐프라임 <놀이의 반란> <놀이의 힘>",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span
                      className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                      style={{ backgroundColor: "#00838F" }}
                    />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ─── 게임 방법 Section ─── */}
      <section id="howto" className="py-20 md:py-28 bg-white">
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-14">
            <span
              className="text-xs font-bold tracking-widest uppercase mb-3 block"
              style={{ color: "#00838F" }}
            >
              How to Play
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-grey-900 mb-4">게임 방법</h2>
            <p className="text-grey-600 max-w-2xl mx-auto leading-relaxed">
              영상을 통해 게임 방법과 구연동화를 확인하세요.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            {[
              {
                videoId: "wBvaksF6HBM",
                label: "게임 하는법 영상",
              },
              {
                videoId: "fZlKmU1I2hQ",
                label: "구연동화 영상",
              },
            ].map((item) => (
              <div
                key={item.label}
                className="bg-white rounded-2xl border overflow-hidden shadow-sm transition-shadow hover:shadow-md"
                style={{ borderColor: "#f0f0f0" }}
              >
                <div style={{ position: "relative", paddingBottom: "56.25%", height: 0 }}>
                  <iframe
                    src={`https://www.youtube.com/embed/${item.videoId}`}
                    title={item.label}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    style={{ position: "absolute", top: 0, left: 0, width: "100%", height: "100%", border: "none" }}
                  />
                </div>
                <div className="p-5 text-center">
                  <h3 className="text-base font-bold text-grey-900">{item.label}</h3>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 구매하기 Section ─── */}
      <section id="purchase" className="py-20 md:py-28" style={{ backgroundColor: "#f9fafb" }}>
        <div className="max-w-[1200px] mx-auto px-6">
          <div className="text-center mb-14">
            <span
              className="text-xs font-bold tracking-widest uppercase mb-3 block"
              style={{ color: "#00838F" }}
            >
              Purchase
            </span>
            <h2 className="text-3xl md:text-4xl font-extrabold text-grey-900 mb-4">구매하기</h2>
          </div>

          <div className="flex flex-col md:flex-row items-center gap-12 max-w-4xl mx-auto">
            {/* Left: Promo image */}
            <div className="flex-1 flex justify-center">
              <img
                src={`${BASE}assets/images/boardgame/promo.jpg`}
                alt="양떼를 지켜라 프로모션"
                className="w-full max-w-[400px] rounded-2xl shadow-lg"
                style={{ objectFit: "cover" }}
              />
            </div>

            {/* Right: Price info */}
            <div className="flex-1">
              <div
                className="rounded-2xl border p-8 bg-white shadow-sm"
                style={{ borderColor: "#f0f0f0" }}
              >
                {/* Price badge */}
                <div
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold mb-6"
                  style={{ backgroundColor: "#FFF3E0", color: "#E65100" }}
                >
                  4월 말까지 20% 할인
                </div>

                <div className="mb-6">
                  <div className="flex items-baseline gap-3 mb-2">
                    <span className="text-3xl font-extrabold" style={{ color: "#E8734A" }}>
                      44,000원
                    </span>
                    <span className="text-lg text-grey-400 line-through">55,000원</span>
                  </div>
                  <p className="text-sm text-grey-600">배송비 포함 (제주도는 별도 배송비)</p>
                </div>

                <div className="space-y-3 mb-8">
                  {[
                    "배송비 포함 가격",
                    "제주도는 별도 배송비 발생",
                    "구매자 중 10명 추첨 → 퍼펫세트 증정",
                  ].map((note) => (
                    <div key={note} className="flex items-start gap-3">
                      <span
                        className="w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0"
                        style={{ backgroundColor: "#00838F" }}
                      />
                      <span className="text-sm text-grey-700">{note}</span>
                    </div>
                  ))}
                </div>

                <a
                  href="https://www.figuretherapy.org/bbs/board.php?bo_table=store&wr_id=46"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block w-full text-center py-4 rounded-xl text-white text-lg font-bold transition-all hover:scale-105 hover:shadow-lg"
                  style={{ backgroundColor: "#E8734A" }}
                >
                  구매 페이지로 이동
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── CTA Banner ─── */}
      <section className="py-16 md:py-20" style={{ backgroundColor: "#00838F" }}>
        <div className="max-w-[1200px] mx-auto px-6 text-center">
          <button
            onClick={() => navigate("/login")}
            className="inline-flex items-center gap-2 px-10 py-4 rounded-xl text-lg font-bold shadow-lg transition-all hover:scale-105"
            style={{ backgroundColor: "#E8734A", color: "#ffffff" }}
          >
            AI 가족평가 시작하기
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </button>
        </div>
      </section>

      {/* ─── 이론적 배경 모달 ─── */}
      {showTheoryModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
          onClick={() => setShowTheoryModal(false)}
        >
          <div
            style={{ background: "white", borderRadius: 16, maxWidth: 800, width: "100%", maxHeight: "90vh", overflow: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{ background: "linear-gradient(135deg, #00838F, #00695C)", padding: "28px 32px", borderRadius: "16px 16px 0 0" }}>
              <h2 style={{ color: "white", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                양떼를 지켜라 문제해결 인형치료
              </h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>이론적 배경</p>
              <button
                onClick={() => setShowTheoryModal(false)}
                style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
            </div>

            {/* 컨텐츠 */}
            <div style={{ padding: "28px 32px" }}>
              {/* 책 이미지 */}
              <div style={{ display: "flex", gap: 20, marginBottom: 28, justifyContent: "center", flexWrap: "wrap" }}>
                <img
                  src={`${BASE}assets/images/boardgame/book-main.jpeg`}
                  alt="양떼를 지켜라 문제해결 인형치료"
                  style={{ width: 200, borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                />
                <img
                  src={`${BASE}assets/images/boardgame/book-card.jpg`}
                  alt="양떼를 지켜라 인형치료카드"
                  style={{ width: 200, borderRadius: 8, boxShadow: "0 4px 20px rgba(0,0,0,0.15)" }}
                />
              </div>

              {/* 핵심 내용 카드들 */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ background: "#f0f7f7", borderRadius: 12, padding: "20px 24px", borderLeft: "4px solid #00838F" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>🐑</span>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: "#00838F", marginBottom: 6 }}>상징체계를 통한 문제 이해</h4>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333" }}>
                        양, 양치기개, 늑대라는 상징체계를 통해 구조화된 스토리텔링 방식 속에서 내담자의 문제를 손쉽게 이해
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#fff8f0", borderRadius: 12, padding: "20px 24px", borderLeft: "4px solid #E8734A" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>💭</span>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: "#E8734A", marginBottom: 6 }}>자연스러운 자기 표현</h4>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333" }}>
                        내담자가 거부감 없이 자신의 생각과 감정, 관계성과 가치관을 드러내기 쉬운 장점
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ background: "#f0f0ff", borderRadius: 12, padding: "20px 24px", borderLeft: "4px solid #5c6bc0" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                    <span style={{ fontSize: 24, flexShrink: 0 }}>🦸</span>
                    <div>
                      <h4 style={{ fontSize: 15, fontWeight: 700, color: "#5c6bc0", marginBottom: 6 }}>영웅 동일시를 통한 문제 해결</h4>
                      <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333" }}>
                        신화 속 영웅이야기처럼 내담자가 마치 양치기가 된 것처럼 동일시 되는 과정에서 자신에게 직면한 문제를 인식하고 해결
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 이야기 구조 */}
              <div style={{ marginTop: 28, background: "linear-gradient(135deg, #e8f5e9, #f1f8e9)", borderRadius: 16, padding: "28px 24px", border: "1px solid #c8e6c9" }}>
                <h3 style={{ fontSize: 18, fontWeight: 800, color: "#2e7d32", textAlign: "center", marginBottom: 24 }}>
                  '양떼를 지켜라'의 이야기 구조
                </h3>

                {/* 다이어그램 */}
                <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
                  <div style={{ position: "relative", width: 220, height: 220 }}>
                    {/* 중앙 원 */}
                    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 80, height: 80, borderRadius: "50%", background: "white", border: "3px solid #00838F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700, color: "#00838F", textAlign: "center", lineHeight: 1.3 }}>
                      양떼<br/>이야기
                    </div>
                    {/* 경쟁 (상) */}
                    <div style={{ position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)", width: 64, height: 64, borderRadius: "50%", background: "#00838F", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>
                      경쟁
                    </div>
                    {/* 도전 (우) */}
                    <div style={{ position: "absolute", top: "50%", right: 0, transform: "translateY(-50%)", width: 64, height: 64, borderRadius: "50%", background: "#E8734A", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>
                      도전
                    </div>
                    {/* 문제해결 (하) */}
                    <div style={{ position: "absolute", bottom: 0, left: "50%", transform: "translateX(-50%)", width: 64, height: 64, borderRadius: "50%", background: "#5c6bc0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white", textAlign: "center", lineHeight: 1.2 }}>
                      문제<br/>해결
                    </div>
                    {/* 보상 (좌) */}
                    <div style={{ position: "absolute", top: "50%", left: 0, transform: "translateY(-50%)", width: 64, height: 64, borderRadius: "50%", background: "#43a047", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "white" }}>
                      보상
                    </div>
                    {/* 연결선 */}
                    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }} viewBox="0 0 220 220">
                      <path d="M 110 64 L 156 110" stroke="#ccc" strokeWidth="1.5" fill="none" />
                      <path d="M 156 110 L 110 156" stroke="#ccc" strokeWidth="1.5" fill="none" />
                      <path d="M 110 156 L 64 110" stroke="#ccc" strokeWidth="1.5" fill="none" />
                      <path d="M 64 110 L 110 64" stroke="#ccc" strokeWidth="1.5" fill="none" />
                    </svg>
                  </div>
                </div>

                {/* 설명 카드들 */}
                <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                  <div style={{ background: "white", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#00838F", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>1</div>
                    <div>
                      <span style={{ fontWeight: 700, color: "#00838F", fontSize: 13 }}>경쟁</span>
                      <p style={{ fontSize: 13, color: "#333", lineHeight: 1.6, marginTop: 2 }}>첫번째 구조인 경쟁은 산에 있던 세 무리의 개들이 양치기 개가 되기 위한 경쟁의 과정을 갖는다.</p>
                    </div>
                  </div>
                  <div style={{ background: "white", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#E8734A", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>2</div>
                    <div>
                      <span style={{ fontWeight: 700, color: "#E8734A", fontSize: 13 }}>도전과 문제해결</span>
                      <p style={{ fontSize: 13, color: "#333", lineHeight: 1.6, marginTop: 2 }}>두번째 구조인 도전과 문제해결의 단계는 임무를 수행해야 하는 영웅 이야기처럼 입문, 시련, 통과의 과정을 갖는다.</p>
                    </div>
                  </div>
                  <div style={{ background: "white", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 10, alignItems: "flex-start" }}>
                    <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#43a047", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 12, fontWeight: 700, flexShrink: 0 }}>3</div>
                    <div>
                      <span style={{ fontWeight: 700, color: "#43a047", fontSize: 13 }}>보상</span>
                      <p style={{ fontSize: 13, color: "#333", lineHeight: 1.6, marginTop: 2 }}>세번째 구조인 보상은 양치기 개가 마땅히 받아야 할 보상을 받지 못하며 겪는 어려움을 해결해 나가는 과정입니다.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* 저자 정보 */}
              <div style={{ marginTop: 24, padding: "16px 20px", background: "#f9fafb", borderRadius: 8, textAlign: "center" }}>
                <p style={{ fontSize: 13, color: "#666" }}>
                  <strong style={{ color: "#333" }}>최광현</strong> 지음 · 인형치료연구회 출판
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 구조화 질문 모달 ─── */}
      {showQuestionsModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
          onClick={() => setShowQuestionsModal(false)}
        >
          <div
            style={{ background: "white", borderRadius: 16, maxWidth: 700, width: "100%", maxHeight: "90vh", overflow: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: "linear-gradient(135deg, #E8734A, #d84315)", padding: "28px 32px", borderRadius: "16px 16px 0 0" }}>
              <h2 style={{ color: "white", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>양떼를 지켜라 구조화된 질문</h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>문제해결 인형치료</p>
              <button onClick={() => setShowQuestionsModal(false)} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "24px 28px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr>
                    <th style={{ background: "#E8734A", color: "white", padding: "10px 12px", textAlign: "center", width: 40, borderRadius: "8px 0 0 0" }}>No</th>
                    <th style={{ background: "#E8734A", color: "white", padding: "10px 16px", textAlign: "left", borderRadius: "0 8px 0 0" }}>질문내용</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    "만약 네가 양치기라면 양치기 개를 어떻게 선택할까?",
                    "양치기가 산입으로 내려가자마자 늑대들이 쳐들어왔다. 늑대들의 공격을 받은 양치기 개는 어떻게 할까?",
                    "주변에 다른 개들이 있다. 다른 개들과 협력하기 위해서 어떻게 할 것 인가?",
                    "다른 개들과 협력을 하면 늑대들과의 싸움에서 이길 가능성이 있다. 협력하기 위해서 어떻게 할 것인가?",
                    "다른 개들이 협력을 거부하면 어떻게 할 것인가?",
                    "늑대가 양치기 개에게 양 떼 마리만 넘기면 물러가겠 것이라고 협상을 제안한다. 내가 양치기 개라면 어떻게 하겠냐?",
                    "양치기가 다시 산으로 올라오자 늑대 무리가 도망을 갔다. 양치기에게 어떤 보상 받고 싶은가?",
                    "양치기가 양들을 지킨 보상을 주지도 않고 오히려 양을 잘 지켜내지 못했다고 야단을 쳤다. 이건잘못된 거야. 다른 개들을 믿고 양치기가 화를 내면 어떻게 하겠느냐?",
                    "양치기, 양치기개, 늑대, 다른 개들 중 내가 되고 싶은 역할이 있다면 무엇인가?",
                  ].map((q, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff8f5" : "white" }}>
                      <td style={{ padding: "12px", textAlign: "center", fontWeight: 700, color: "#E8734A", borderBottom: "1px solid #f0e0d8" }}>{i + 1}</td>
                      <td style={{ padding: "12px 16px", lineHeight: 1.7, color: "#333", borderBottom: "1px solid #f0e0d8" }}>{q}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── 대인간 문제해결력 평가 모달 (EIPS) ─── */}
      {showEvalModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
          onClick={() => setShowEvalModal(false)}
        >
          <div
            style={{ background: "white", borderRadius: 16, maxWidth: 800, width: "100%", maxHeight: "90vh", overflow: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* 헤더 */}
            <div style={{ background: "linear-gradient(135deg, #5c6bc0, #3949ab)", padding: "28px 32px", borderRadius: "16px 16px 0 0" }}>
              <h2 style={{ color: "white", fontSize: 22, fontWeight: 800, marginBottom: 4 }}>
                대인 간 문제해결력 평가
              </h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>
                Evaluation of Interpersonal Problem-Solving (EIPS)
              </p>
              <button
                onClick={() => setShowEvalModal(false)}
                style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                ✕
              </button>
            </div>

            <div ref={evalContentRef} style={{ padding: "28px 32px" }}>
              {/* PDF 전용 - 제목 */}
              <div data-pdf-only style={{ display: "none", textAlign: "center", marginBottom: 24, paddingBottom: 16, borderBottom: "2px solid #5c6bc0" }}>
                <h2 style={{ fontSize: 22, fontWeight: 800, color: "#333", marginBottom: 4 }}>대인 간 문제해결력 평가</h2>
                <p style={{ fontSize: 14, color: "#5c6bc0", fontWeight: 600 }}>Evaluation of Interpersonal Problem-Solving (EIPS)</p>
              </div>

              {/* 스토리 소개 */}
              <div style={{ background: "#f8f9ff", borderRadius: 12, padding: "20px 24px", marginBottom: 24, borderLeft: "4px solid #5c6bc0" }}>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: "#333" }}>
                  "어느 산 밑에 살던 한 양치기가 목초지가 넓게 있는 산 중턱으로 양을 데리고 올라왔다.
                  산 중턱에는 3종류의 개들이 자유롭게 살고 있었다.
                  양치기는 산 위에는 늑대가 살기 때문에 양치기 개가 필요했고 3종류의 개 무리 중에서 양치기 개를 선택하게 되었다.
                  양치기는 선택된 개에게 사료를 제공하였고 개는 양들을 안전하게 보호하였다.
                  어느 날 양치기는 급한 일이 생겨 잠깐 산 밑 마을로 내려가게 되었다.
                  양치기는 개에게 양들을 잘 보호할 것을 당부하고 내려갔다.
                  하필 그때 먼 산에 살던 늑대 떼가 양 떼가 있는 산으로 몰려왔다.
                  양 떼를 보호해야 하는 개에게는 위기의 순간이 닥친 것이다.
                  어떻게 양들을 지킬 것인가? 양치기 개는 양 떼를 늑대로부터 안전하게 지켜야 한다."
                </p>
              </div>

              {/* 안내 문구 */}
              <div style={{ textAlign: "center", marginBottom: 24 }}>
                <p style={{ fontSize: 14, color: "#666" }}>
                  각 질문에서 당신의 생각과 가장 일치하는 항목을 선택하세요.
                </p>
              </div>

              {/* 질문 항목 A~G */}
              {EVAL_SECTIONS.map((section) => {
                const selected = evalAnswers[section.key];
                return (
                  <div
                    key={section.key}
                    style={{
                      marginBottom: 16,
                      borderRadius: 12,
                      overflow: "hidden",
                      border: selected ? "2px solid #5c6bc0" : "1px solid #e8eaf6",
                      background: "#f8f9ff",
                    }}
                  >
                    {/* 질문 헤더 */}
                    <div style={{ background: "#5c6bc0", color: "white", padding: "12px 16px", display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{
                        width: 30, height: 30, borderRadius: "50%", background: "rgba(255,255,255,0.2)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: 15, flexShrink: 0,
                      }}>
                        {section.key}
                      </span>
                      <span style={{ fontSize: 13, lineHeight: 1.5 }}>
                        {section.scenario}
                      </span>
                    </div>

                    {/* 선택지 */}
                    <div style={{ padding: "8px 12px" }}>
                      {section.options.map((opt, i) => {
                        const optNum = i + 1;
                        const isSelected = selected === optNum;
                        return (
                          <label
                            key={i}
                            style={{
                              display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer",
                              padding: "10px 12px", borderRadius: 8, marginBottom: 4,
                              background: isSelected ? "#e8eaf6" : "transparent",
                              border: isSelected ? "1px solid #5c6bc0" : "1px solid transparent",
                              transition: "all 0.15s ease",
                            }}
                            onClick={() => setEvalAnswers((prev) => ({ ...prev, [section.key]: optNum }))}
                          >
                            <input
                              type="radio"
                              name={`eval-${section.key}`}
                              checked={isSelected}
                              onChange={() => {}}
                              style={{ marginTop: 3, accentColor: "#5c6bc0", flexShrink: 0 }}
                            />
                            <span style={{ fontSize: 13, lineHeight: 1.6, color: "#333", flex: 1 }}>{opt}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* 버튼 영역 */}
              <div data-pdf-hide style={{ display: "flex", justifyContent: "center", gap: 16, marginTop: 28, flexWrap: "wrap" }}>
                <button
                  onClick={saveEvalPdf}
                  style={{
                    padding: "14px 32px", borderRadius: 12, border: "none", fontSize: 16, fontWeight: 700,
                    color: "white", cursor: "pointer",
                    background: "linear-gradient(135deg, #E8734A, #d84315)",
                    boxShadow: "0 4px 15px rgba(232,115,74,0.4)",
                    transition: "all 0.2s ease",
                    display: "inline-flex", alignItems: "center", gap: 8,
                  }}
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                  </svg>
                  PDF 저장
                </button>
                <button
                  onClick={() => setShowEvalResult(true)}
                  disabled={!evalAllAnswered}
                  style={{
                    padding: "14px 48px", borderRadius: 12, border: "none", fontSize: 16, fontWeight: 700,
                    color: "white", cursor: evalAllAnswered ? "pointer" : "not-allowed",
                    background: evalAllAnswered ? "linear-gradient(135deg, #5c6bc0, #3949ab)" : "#ccc",
                    transition: "all 0.2s ease",
                    boxShadow: evalAllAnswered ? "0 4px 15px rgba(92,107,192,0.4)" : "none",
                  }}
                >
                  {evalAllAnswered ? "결과 보기" : `${Object.keys(evalAnswers).length}/7 문항 응답 완료`}
                </button>
              </div>

              {/* 결과 표시 */}
              {showEvalResult && evalAllAnswered && (
                <div style={{ marginTop: 28 }}>
                  {/* 총점 카드 */}
                  <div style={{
                    background: `linear-gradient(135deg, ${evalLevel.bg}, white)`,
                    borderRadius: 16, padding: "28px 24px", border: `2px solid ${evalLevel.color}`,
                    textAlign: "center", marginBottom: 20,
                  }}>
                    <h4 style={{ fontSize: 18, fontWeight: 800, color: "#333", marginBottom: 16 }}>
                      대인 간 문제해결력 평가 결과
                    </h4>
                    <div style={{ fontSize: 48, fontWeight: 900, color: evalLevel.color, marginBottom: 4 }}>
                      {evalScore}<span style={{ fontSize: 20, color: "#999" }}>/28</span>
                    </div>
                    <div style={{
                      display: "inline-block", padding: "6px 20px", borderRadius: 20,
                      background: evalLevel.color, color: "white", fontSize: 16, fontWeight: 700, marginTop: 8,
                    }}>
                      {evalLevel.level} ({evalLevel.label})
                    </div>

                    {/* 프로그레스 바 */}
                    <div style={{ marginTop: 20, background: "#e0e0e0", borderRadius: 10, height: 12, overflow: "hidden" }}>
                      <div style={{
                        width: `${(evalScore / 28) * 100}%`, height: "100%", borderRadius: 10,
                        background: `linear-gradient(90deg, #ef5350, #ff9800, #42a5f5, #66bb6a)`,
                        transition: "width 0.5s ease",
                      }} />
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10, color: "#999" }}>
                      <span>1</span><span>8</span><span>16</span><span>24</span><span>28</span>
                    </div>
                  </div>

                  {/* 문항별 점수 */}
                  <div style={{ background: "#f8f9ff", borderRadius: 12, padding: "20px 24px", border: "1px solid #e8eaf6" }}>
                    <h4 style={{ fontSize: 15, fontWeight: 700, color: "#5c6bc0", marginBottom: 16 }}>문항별 점수</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }}>
                      {EVAL_SECTIONS.map((s) => {
                        const ans = evalAnswers[s.key];
                        const score = ans != null ? (s.reverse ? 5 - ans : ans) : 0;
                        const scoreColors = ["#ccc", "#ef5350", "#ff9800", "#42a5f5", "#66bb6a"];
                        return (
                          <div key={s.key} style={{ textAlign: "center" }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: "#666", marginBottom: 4 }}>
                              {s.key}
                            </div>
                            <div style={{
                              width: 36, height: 36, borderRadius: "50%", margin: "0 auto",
                              background: scoreColors[score], color: "white",
                              display: "flex", alignItems: "center", justifyContent: "center",
                              fontSize: 16, fontWeight: 800,
                            }}>
                              {score}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* 단계 기준표 */}
                  <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 10 }}>
                    {[
                      { level: "1단계", range: "1~8점", label: "낮음", color: "#ef5350" },
                      { level: "2단계", range: "9~16점", label: "중간", color: "#ff9800" },
                      { level: "3단계", range: "17~24점", label: "높음", color: "#42a5f5" },
                      { level: "4단계", range: "25~28점", label: "매우 높음", color: "#66bb6a" },
                    ].map((l) => (
                      <div key={l.level} style={{
                        background: evalLevel.level === l.level ? l.color : "white",
                        borderRadius: 8, padding: "12px 16px",
                        borderLeft: `4px solid ${l.color}`,
                        border: evalLevel.level === l.level ? `2px solid ${l.color}` : `1px solid #eee`,
                      }}>
                        <div style={{ fontWeight: 700, fontSize: 14, color: evalLevel.level === l.level ? "white" : l.color }}>
                          {l.level} ({l.label})
                        </div>
                        <div style={{ fontSize: 13, color: evalLevel.level === l.level ? "rgba(255,255,255,0.9)" : "#666" }}>{l.range}</div>
                      </div>
                    ))}
                  </div>

                  {/* 욕구 척도 설명 */}
                  <div style={{ marginTop: 16, background: "#fafafa", borderRadius: 12, padding: "16px 20px" }}>
                    <div style={{ display: "flex", justifyContent: "center", gap: 16, flexWrap: "wrap" }}>
                      {[
                        { score: 1, label: "욕구부족", color: "#ef5350" },
                        { score: 2, label: "생존욕구", color: "#ff9800" },
                        { score: 3, label: "사회적 욕구", color: "#42a5f5" },
                        { score: 4, label: "협력욕구", color: "#66bb6a" },
                      ].map((s) => (
                        <span key={s.score} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 13 }}>
                          <span style={{
                            width: 24, height: 24, borderRadius: "50%", background: s.color, color: "white",
                            display: "inline-flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700,
                          }}>{s.score}</span>
                          <span style={{ color: "#555", fontWeight: 600 }}>{s.label}</span>
                        </span>
                      ))}
                    </div>
                  </div>

                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── 퍼펫 놀이 모달 ─── */}
      {showPuppetModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
          onClick={() => setShowPuppetModal(false)}
        >
          <div
            style={{ background: "white", borderRadius: 16, maxWidth: 650, width: "100%", maxHeight: "90vh", overflow: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: "linear-gradient(135deg, #43a047, #2e7d32)", padding: "28px 32px", borderRadius: "16px 16px 0 0" }}>
              <h2 style={{ color: "white", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>양떼를 지켜라 퍼펫놀이</h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>인형치료 카드 활용</p>
              <button onClick={() => setShowPuppetModal(false)} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "28px 32px" }}>
              <div style={{ background: "#e8f5e9", borderRadius: 12, padding: "20px 24px", marginBottom: 24 }}>
                <p style={{ fontSize: 14, lineHeight: 1.8, color: "#333" }}>
                  양, 개, 늑대 퍼펫 중 하나의 퍼펫을 선택해주세요.<br/>
                  늑대가 양을 잡아먹기 위해 등장하는 장면에서부터 각자 자신이 선택한 퍼펫을 가지고 즉흥연기를 합니다.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                {[
                  { num: "1", text: "양치기 개, 늑대, 양을 선택하였는지 말씀해보세요", color: "#43a047" },
                  { num: "2", text: "양치기 개 퍼펫을 선택한 사람은 직면한 문제를 해결하기 위해 어떻게 할 것인지 생각해보세요", color: "#2e7d32" },
                  { num: "3", text: "양치기 개, 양, 늑대의 역할을 하면서 경험한 것은 무엇이었나요?", color: "#1b5e20" },
                  { num: "4", text: "양, 양치기 개, 늑대 중 어떤 역할이 가장 좋았나요? 이유는 무엇인가요?", color: "#004d40" },
                ].map((item) => (
                  <div key={item.num} style={{ background: "white", border: "1px solid #c8e6c9", borderRadius: 10, padding: "14px 18px", display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <div style={{ width: 30, height: 30, borderRadius: "50%", background: item.color, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>{item.num}</div>
                    <p style={{ fontSize: 14, lineHeight: 1.7, color: "#333" }}>{item.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── 게임 놀이치료 중요성 모달 ─── */}
      {showGameTherapyModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, padding: 20 }}
          onClick={() => setShowGameTherapyModal(false)}
        >
          <div
            style={{ background: "white", borderRadius: 16, maxWidth: 650, width: "100%", maxHeight: "90vh", overflow: "auto", position: "relative" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ background: "linear-gradient(135deg, #f9a825, #f57f17)", padding: "28px 32px", borderRadius: "16px 16px 0 0" }}>
              <h2 style={{ color: "white", fontSize: 20, fontWeight: 800, marginBottom: 4 }}>게임놀이치료의 중요성</h2>
              <p style={{ color: "rgba(255,255,255,0.8)", fontSize: 13 }}>보드게임을 통한 또래와의 상호작용</p>
              <button onClick={() => setShowGameTherapyModal(false)} style={{ position: "absolute", top: 16, right: 16, background: "rgba(255,255,255,0.2)", border: "none", color: "white", width: 36, height: 36, borderRadius: "50%", fontSize: 20, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>✕</button>
            </div>
            <div style={{ padding: "28px 32px" }}>
              <div style={{ background: "#fff8e1", borderRadius: 12, padding: "16px 20px", marginBottom: 24, textAlign: "center" }}>
                <p style={{ fontSize: 14, fontWeight: 600, color: "#f57f17", lineHeight: 1.6 }}>
                  보드게임을 통한 또래와의 상호작용은 <strong>행동</strong>과 <strong>정서</strong> 및 <strong>사회 발달</strong>에 중요한 영향
                </p>
              </div>

              {/* 다이어그램 */}
              <div style={{ display: "flex", justifyContent: "center", marginBottom: 28 }}>
                <div style={{ position: "relative", width: 280, height: 280 }}>
                  {/* 중앙 */}
                  <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: 100, height: 100, borderRadius: "50%", background: "linear-gradient(135deg, #43a047, #2e7d32)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 800, color: "white", textAlign: "center", lineHeight: 1.3, boxShadow: "0 4px 15px rgba(46,125,50,0.3)" }}>
                    문제해결<br/>전략게임
                  </div>
                  {/* 주변 요소들 */}
                  {[
                    { label: "문제해결력", angle: 0, color: "#1565c0" },
                    { label: "주의력", angle: 45, color: "#00838F" },
                    { label: "사회적\n상호작용", angle: 90, color: "#43a047" },
                    { label: "학습동기", angle: 135, color: "#f9a825" },
                    { label: "긍정적 정서", angle: 180, color: "#E8734A" },
                    { label: "즐거움", angle: 225, color: "#e91e63" },
                    { label: "좌망수용\n능력", angle: 270, color: "#7b1fa2" },
                    { label: "실행능력", angle: 315, color: "#5c6bc0" },
                  ].map((item) => {
                    const rad = (item.angle * Math.PI) / 180;
                    const r = 110;
                    const x = 140 + r * Math.cos(rad) - 32;
                    const y = 140 + r * Math.sin(rad) - 32;
                    return (
                      <div
                        key={item.label}
                        style={{
                          position: "absolute",
                          left: x,
                          top: y,
                          width: 64,
                          height: 64,
                          borderRadius: "50%",
                          background: item.color,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: 10,
                          fontWeight: 700,
                          color: "white",
                          textAlign: "center",
                          lineHeight: 1.2,
                          whiteSpace: "pre-line",
                          boxShadow: `0 2px 8px ${item.color}44`,
                        }}
                      >
                        {item.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Footer ─── */}
      <footer className="py-8 border-t" style={{ borderColor: "#e5e7eb", backgroundColor: "#f9fafb" }}>
        <div className="max-w-[1200px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img src={`${BASE}assets/images/kaft-logo.png`} alt="한국인형치료연구회" className="h-6 opacity-70" />
            <span className="text-grey-500 text-xs">한국인형치료연구회</span>
          </div>
          <p className="text-grey-500 text-xs">
            &copy; {new Date().getFullYear()} 한국인형치료연구회. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default BoardGame;
