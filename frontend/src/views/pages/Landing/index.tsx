import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { GoogleLogin } from "@react-oauth/google";
import { jwtDecode } from "jwt-decode";
import { adminApi } from "../../../services/adminApi";
import { setItemLocalStorage } from "../../../utils/helper";
import { USER } from "../../../constants/common.constant";
import useStore from "../../../store";

const Landing = () => {
  const [agreed, setAgreed] = useState(false);
  const [showCodeInput, setShowCodeInput] = useState(false);
  const [loginCode, setLoginCode] = useState("");
  const [codeValidating, setCodeValidating] = useState(false);
  const [codeError, setCodeError] = useState("");

  // 신규 사용자 모달 상태
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [modalEmail, setModalEmail] = useState("");
  const [modalPicture, setModalPicture] = useState("");
  const [modalIsAdmin, setModalIsAdmin] = useState(false);
  const [modalName, setModalName] = useState("");
  const [modalOrg, setModalOrg] = useState("");
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const navigate = useNavigate();

  const adminEmails = (import.meta.env.VITE_ADMIN_EMAILS || "").split(",").map((e: string) => e.trim().toLowerCase());

  const handleGoogleSuccess = async (credentialResponse: any) => {
    try {
      const decoded: any = jwtDecode(credentialResponse.credential);
      const email: string = decoded.email || "";
      const isAdmin = adminEmails.includes(email.toLowerCase());

      let userInfo: any = null;
      try {
        userInfo = await adminApi.getUserInfo(email);
      } catch {
        // API 실패 시 기존 사용자로 간주하고 진행
      }

      if (userInfo && userInfo.exists) {
        sessionStorage.setItem("counselorAuth", JSON.stringify({
          email,
          name: decoded.name,
          picture: decoded.picture,
          isAdmin,
          userName: userInfo.name,
          userOrganization: userInfo.organization,
        }));
        if (isAdmin) {
          sessionStorage.setItem("adminAuth", "true");
        }
        navigate("/register");
      } else if (userInfo && !userInfo.exists) {
        // 신규 사용자 → 이름/소속 입력 모달 표시
        setModalEmail(email);
        setModalPicture(decoded.picture || "");
        setModalIsAdmin(isAdmin);
        setModalName(decoded.name || "");
        setModalOrg("");
        setShowRegisterModal(true);
      } else {
        // API 실패 fallback → 바로 진행
        sessionStorage.setItem("counselorAuth", JSON.stringify({
          email,
          name: decoded.name,
          picture: decoded.picture,
          isAdmin,
        }));
        if (isAdmin) {
          sessionStorage.setItem("adminAuth", "true");
        }
        navigate("/register");
      }
    } catch (error) {
      console.error("Google login error:", error);
      alert("Google 로그인에 실패했습니다. 다시 시도해주세요.");
    }
  };

  const handleModalSubmit = async () => {
    if (!modalName.trim() || !modalOrg.trim()) return;
    setModalSubmitting(true);
    try {
      const result = await adminApi.registerUser(modalEmail, modalName.trim(), modalOrg.trim());
      sessionStorage.setItem("counselorAuth", JSON.stringify({
        email: modalEmail,
        name: result.name,
        picture: modalPicture,
        isAdmin: modalIsAdmin,
        userName: result.name,
        userOrganization: result.organization,
      }));
      if (modalIsAdmin) {
        sessionStorage.setItem("adminAuth", "true");
      }
      setShowRegisterModal(false);
      navigate("/register");
    } catch (error) {
      console.error("Register user error:", error);
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleCodeSubmit = async () => {
    if (!loginCode || loginCode.length < 6) {
      setCodeError("6자리 코드를 입력해주세요.");
      return;
    }
    setCodeValidating(true);
    setCodeError("");
    try {
      const result = await adminApi.validateCode(loginCode);
      if (result.valid) {
        // counselorAuth 저장
        sessionStorage.setItem("counselorAuth", JSON.stringify({
          email: result.counselorEmail,
          name: result.counselorName,
          organization: result.organization,
          loginCode: loginCode,
        }));

        // 이미 사용된 코드이고 세션이 있으면 → 이어하기
        if (result.used && result.sessionReceiptNo) {
          try {
            const sessionData = await adminApi.getSession(result.sessionReceiptNo);
            const session = sessionData.session;

            if (session && session.status !== "completed") {
              // 세션 정보 저장
              setItemLocalStorage(USER, {
                kidname: session.kid?.name || "",
                selectedDate: session.kid?.birth || "",
                receiptNo: session.receiptNo,
              });

              // currentStep 설정 및 해당 스테이지로 이동
              const step = session.currentStep ?? 0;
              useStore.getState().setCurrentStep(step);

              if (step === 0) {
                navigate("/information");
              } else {
                navigate(`/stage${step}`);
              }
              return;
            }
          } catch (sessionErr) {
            console.error("Failed to fetch session for resume:", sessionErr);
            // 세션 조회 실패 시 새로 시작
          }
        }

        // 미사용 코드 또는 세션 조회 실패 → 신규 등록
        navigate("/register");
      } else {
        setCodeError(result.message || "유효하지 않은 코드입니다.");
      }
    } catch (err: any) {
      console.error("Code validation error:", err);
      setCodeError("코드 검증에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setCodeValidating(false);
    }
  };

  return (
    <div className="min-h-screen bg-grey-100 flex flex-col">
      {/* Top header bar */}
      <div className="w-full bg-[#00838F] py-3 px-6">
        <h1 className="text-white text-lg md:text-xl font-semibold tracking-wide text-left">
          AI 가족평가
        </h1>
      </div>

      {/* Tab label */}
      <div className="w-full bg-white border-b border-grey-300">
        <div className="max-w-4xl mx-auto px-4">
          <div className="inline-block border-t-2 border-[#00838F] bg-white px-6 py-2 mt-0">
            <span className="text-[#00838F] font-semibold text-sm">Information</span>
            <span className="text-grey-500 text-sm ml-2">검사소개 및 유의사항</span>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex-1 flex items-start justify-center px-4 py-8">
        <div className="w-full max-w-4xl bg-white rounded shadow-md overflow-hidden">

          {/* Two-column content area */}
          <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x divide-grey-300">

            {/* Left column - 푸름이 말풍선 */}
            <div className="flex-1 p-8 flex flex-col items-center justify-center">
              <div className="relative bg-[#E8F5E9] rounded-2xl px-5 py-4 mb-3 w-full">
                <h2 className="text-xl md:text-2xl font-bold text-grey-800 leading-tight mb-2">
                  AI 가족평가
                </h2>
                <p className="text-grey-700 text-sm leading-relaxed">
                  본 검사는 AI 기술을 활용하여 동물과 사람 이미지를 통해
                  가족 관계를 종합적으로 평가하는 검사입니다.
                </p>
                {/* 말풍선 꼬리 */}
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-[#E8F5E9] rotate-45" />
              </div>
              <img
                src="/assets/images/01.png"
                alt="푸름이"
                className="w-24 h-24 md:w-32 md:h-32 rounded-full"
              />
            </div>

            {/* Right column */}
            <div className="flex-1 p-8 space-y-6">

              {/* 검사구성 */}
              <div>
                <h4 className="text-sm font-bold text-grey-800 uppercase tracking-wider mb-3 pb-1 border-b border-grey-300">
                  검사구성
                </h4>
                <table className="w-full text-sm">
                  <tbody>
                    <tr className="border-b border-grey-100">
                      <td className="py-2 pr-4 text-grey-600 font-medium whitespace-nowrap w-28">검사단계</td>
                      <td className="py-2 text-grey-800">총 7단계</td>
                    </tr>
                    <tr className="border-b border-grey-100">
                      <td className="py-2 pr-4 text-grey-600 font-medium whitespace-nowrap">검사방식</td>
                      <td className="py-2 text-grey-800">동물카드 선택, 인형 배치, AI 대화</td>
                    </tr>
                    <tr>
                      <td className="py-2 pr-4 text-grey-600 font-medium whitespace-nowrap">소요시간</td>
                      <td className="py-2 text-grey-800">약 20~30분</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* 유의사항 */}
              <div>
                <h4 className="text-sm font-bold text-grey-800 uppercase tracking-wider mb-3 pb-1 border-b border-grey-300">
                  유의사항
                </h4>
                <ul className="space-y-2 text-sm text-grey-700">
<li className="flex items-start gap-2">
                    <span className="mt-1 text-[#00838F] font-bold flex-shrink-0">·</span>
                    <span>검사 중 브라우저를 닫으면 처음부터 다시 시작해야 합니다.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="mt-1 text-[#00838F] font-bold flex-shrink-0">·</span>
                    <span>최종 결과는 검사 완료 후 다운로드로 확인할 수 있습니다.</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Privacy / agreement box */}
          <div className="mx-6 mb-6 mt-2 border border-dashed border-[#E91E63] rounded p-4">
            <h5 className="text-sm font-bold text-[#E91E63] mb-2">개인정보 보호</h5>
            <p className="text-grey-700 text-sm leading-relaxed mb-4">
              본 검사의 모든 응답 데이터는 상담 목적으로만 사용되며,
              개인정보 보호법에 따라 안전하게 관리됩니다.
            </p>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
                className="w-4 h-4 accent-[#E91E63] cursor-pointer"
              />
              <span className="text-sm text-grey-800 font-medium">동의합니다</span>
            </label>
          </div>

          {/* Google Login */}
          <div className="flex flex-col items-center pb-8 gap-4">
            {agreed ? (
              <GoogleLogin
                onSuccess={handleGoogleSuccess}
                onError={() => console.error("Google login failed")}
                text="signin_with"
                shape="rectangular"
                size="large"
                width={280}
              />
            ) : (
              <button
                disabled
                className="px-12 py-3 rounded text-white font-semibold text-base bg-grey-400 cursor-not-allowed opacity-60"
              >
                동의 후 Google 로그인
              </button>
            )}

            {/* Divider */}
            {agreed && (
              <div className="flex items-center gap-3 w-full max-w-[280px]">
                <div className="flex-1 h-px bg-grey-300" />
                <span className="text-grey-500 text-xs">또는</span>
                <div className="flex-1 h-px bg-grey-300" />
              </div>
            )}

            {/* One-time code login */}
            {agreed && !showCodeInput && (
              <button
                onClick={() => setShowCodeInput(true)}
                style={{
                  padding: "10px 24px",
                  backgroundColor: "transparent",
                  color: "#00838F",
                  border: "1px solid #00838F",
                  borderRadius: "6px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  width: "280px",
                }}
              >
                일회용 코드로 시작
              </button>
            )}

            {agreed && showCodeInput && (
              <div style={{ width: "280px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <input
                  type="text"
                  value={loginCode}
                  onChange={(e) => {
                    setLoginCode(e.target.value.toUpperCase().slice(0, 6));
                    setCodeError("");
                  }}
                  onKeyDown={(e) => e.key === "Enter" && handleCodeSubmit()}
                  placeholder="6자리 코드 입력"
                  maxLength={6}
                  autoFocus
                  style={{
                    width: "100%",
                    padding: "12px 16px",
                    border: codeError ? "2px solid #dc2626" : "2px solid #00838F",
                    borderRadius: "8px",
                    fontSize: "20px",
                    fontWeight: 700,
                    textAlign: "center",
                    letterSpacing: "0.3em",
                    fontFamily: "monospace",
                    outline: "none",
                  }}
                />
                {codeError && (
                  <p style={{ color: "#dc2626", fontSize: "13px", margin: 0, textAlign: "center" }}>
                    {codeError}
                  </p>
                )}
                <div style={{ display: "flex", gap: "8px" }}>
                  <button
                    onClick={() => { setShowCodeInput(false); setLoginCode(""); setCodeError(""); }}
                    style={{
                      flex: 1,
                      padding: "10px",
                      backgroundColor: "transparent",
                      color: "#6b7280",
                      border: "1px solid #d1d5db",
                      borderRadius: "6px",
                      fontSize: "14px",
                      cursor: "pointer",
                    }}
                  >
                    취소
                  </button>
                  <button
                    onClick={handleCodeSubmit}
                    disabled={codeValidating || loginCode.length < 6}
                    style={{
                      flex: 1,
                      padding: "10px",
                      backgroundColor: codeValidating || loginCode.length < 6 ? "#9ca3af" : "#00838F",
                      color: "white",
                      border: "none",
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 600,
                      cursor: codeValidating || loginCode.length < 6 ? "not-allowed" : "pointer",
                    }}
                  >
                    {codeValidating ? "확인 중..." : "확인"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 신규 사용자 등록 모달 */}
      {showRegisterModal && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
          onClick={() => setShowRegisterModal(false)}
        >
          <div
            style={{ background: "white", borderRadius: "12px", padding: "28px", minWidth: "320px", maxWidth: "400px", width: "100%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontSize: "18px", fontWeight: 700, marginBottom: "20px", color: "#111827" }}>상담사 정보 등록</h3>

            <div style={{ marginBottom: "14px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>이름</label>
              <input
                type="text"
                value={modalName}
                onChange={(e) => setModalName(e.target.value)}
                placeholder="이름을 입력해주세요"
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <div style={{ marginBottom: "24px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "#374151", marginBottom: "6px" }}>소속(상담기관)</label>
              <input
                type="text"
                value={modalOrg}
                onChange={(e) => setModalOrg(e.target.value)}
                placeholder="소속 기관명을 입력해주세요"
                onKeyDown={(e) => e.key === "Enter" && !modalSubmitting && modalName.trim() && modalOrg.trim() && handleModalSubmit()}
                style={{ width: "100%", padding: "10px 12px", border: "1px solid #d1d5db", borderRadius: "8px", fontSize: "14px", boxSizing: "border-box" }}
              />
            </div>

            <button
              onClick={handleModalSubmit}
              disabled={!modalName.trim() || !modalOrg.trim() || modalSubmitting}
              style={{
                width: "100%",
                padding: "12px",
                backgroundColor: !modalName.trim() || !modalOrg.trim() || modalSubmitting ? "#9ca3af" : "#00838F",
                color: "white",
                border: "none",
                borderRadius: "8px",
                fontSize: "15px",
                fontWeight: 600,
                cursor: !modalName.trim() || !modalOrg.trim() || modalSubmitting ? "not-allowed" : "pointer",
              }}
            >
              {modalSubmitting ? "등록 중..." : "확인"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Landing;
