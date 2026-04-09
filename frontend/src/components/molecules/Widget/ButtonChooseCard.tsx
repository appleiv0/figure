import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";
import { USER } from "../../../constants/common.constant";
import { useSetFigure } from "../../../services/hooks/hookFigures";
import useStore from "../../../store";
import { getItemLocalStorage } from "../../../utils/helper";
import Icon from "../../atoms/Icon";

const ButtonStart = () => {
  const btnRef = useRef<HTMLDivElement>(null);

  // 이 버튼이 보일 때 텍스트 입력창 숨기기
  useEffect(() => {
    const chatContainer = btnRef.current?.closest(".react-chatbot-kit-chat-container");
    const inputContainer = chatContainer?.querySelector(
      ".react-chatbot-kit-chat-input-container"
    ) as HTMLElement;
    if (inputContainer) inputContainer.style.display = "none";
    return () => {
      if (inputContainer) inputContainer.style.display = "";
    };
  }, []);

  const navigator = useNavigate();
  const location = useLocation();
  const setSelectedCards = useStore((state: any) => state.setSelectedCards);
  const setCurrentIndex = useStore((state: any) => state.setCurrentIndex);
  const setCurrentStep = useStore((state: any) => state.setCurrentStep);
  const currentStep = useStore((state: any) => state.currentStep);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);
  const setSelectedFamily = useStore((state: any) => state.setSelectedFamily);
  const setSelectedFamilyJosa = useStore((state: any) => state.setSelectedFamilyJosa);

  const figure = useStore((state: any) => state.figure);
  const setFigure = useStore((state: any) => state.setFigure);

  const { fetchFigure } = useSetFigure();
  const userInfo = getItemLocalStorage(USER);

  const saveStep = async (step: number) => {
    try {
      if (userInfo?.receiptNo) {
        const apiBase = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || '/api';
        await axios.post(`${apiBase}/public/save-step`, { receiptNo: userInfo.receiptNo, currentStep: step });
      }
    } catch {}
  };

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
    saveStep(currentStep + 1);
    if (location.pathname === "/" || location.pathname.endsWith("/family") || location.pathname.endsWith("/family/") || location.pathname.endsWith("/stage0")) {
      navigator("/stage1");
      setSelectedCards([]);
    } else if (location.pathname.endsWith("/stage1")) {
      navigator("/stage2");
      setSelectedCards([]);
    } else if (location.pathname.endsWith("/stage3")) {
      navigator("/stage4");
      setCurrentIndex(0);
      setSelectedCards([]);
    } else if (location.pathname.endsWith("/stage4")) {
      navigator("/stage5");
      setCurrentIndex(0);
      if (selectedFamily.length > 0 && userInfo?.kidname) {
        const kidname = userInfo.kidname;
        setSelectedFamily(selectedFamily.filter((name: string) => name !== kidname));
        setSelectedFamilyJosa(selectedFamilyJosa.filter((_: any, i: number) => selectedFamily[i] !== kidname));
      }
    } else if (location.pathname.endsWith("/stage5")) {
      navigator("/stage6");
    }
  };

  const handleStartChat = async () => {
    if (location.pathname.endsWith("/stage1") || location.pathname.endsWith("/stage2")) {
      try {
        const response = await fetchFigure({
          kidName: userInfo.kidname,
          receiptNo: `${userInfo.receiptNo}`,
          stage: `${currentStep}`,
          figures: figure,
        });

        if (!response) {
          console.error("API Error: No response received");
        } else {
          setCurrentStep(currentStep + 1);
          saveStep(currentStep + 1);
          if (location.pathname.endsWith("/stage1")) {
            navigator("/stage2");
            setSelectedCards([]);
            setFigure([]);
          } else if (location.pathname.endsWith("/stage2")) {
            navigator("/stage3");
          }
        }
      } catch (error: any) {
        console.error("Error:", error.message);
      }
    } else if (
      location.pathname.endsWith("/stage3") ||
      location.pathname.endsWith("/stage4")
    ) {
      try {
        // 백엔드 데이터 스테이지: /stage3→"3", /stage4(소망동물)→"5"
        const dataStage = location.pathname.endsWith("/stage4") ? "5" : `${currentStep}`;
        const response = await fetchFigure({
          kidName: userInfo.kidname,
          receiptNo: `${userInfo.receiptNo}`,
          stage: dataStage,
          figures: figure,
        });

        if (!response) {
          console.error("API Error: No response received");
        } else {
          setCurrentStep(currentStep + 1);
          saveStep(currentStep + 1);
          if (location.pathname.endsWith("/stage3")) {
            setCurrentIndex(0);
            if (selectedFamily.length > 0 && userInfo?.kidname) {
              const kidname = userInfo.kidname;
              setSelectedFamily(selectedFamily.filter((name: string) => name !== kidname));
              setSelectedFamilyJosa(selectedFamilyJosa.filter((_: any, i: number) => selectedFamily[i] !== kidname));
            }
            navigator("/stage4");
          } else if (location.pathname.endsWith("/stage4")) {
            navigator("/stage5");
            setFigure([]);
            setCurrentIndex(0);
          }
        }
      } catch (error: any) {
        console.error("Error:", error.message);
      }
    }
  };

  return (
    <>
      <div ref={btnRef} className="react-chatbot-kit-chat-bot-message-container flex gap-2">
        <button
          type="button"
          className="text-2xl font-bold ml-auto flex gap-2 items-center border border-primary bg-primary hover:bg-grey-100 hover:text-greenDark text-white px-3 py-4 rounded-md cursor-pointer select-none"
          onClick={() => {
            if (
              location.pathname.endsWith("/stage1") ||
              location.pathname.endsWith("/stage2") ||
              location.pathname.endsWith("/stage3") ||
              location.pathname.endsWith("/stage4")
            ) {
              handleStartChat();
            } else {
              handleNext();
              setFigure([]);
            }
          }}
        >
          동물 선택하러 가기
          <Icon icon="arrowRight" width={24} height={24} className="max-w-6" />
        </button>
      </div>
    </>
  );
};

export default ButtonStart;
