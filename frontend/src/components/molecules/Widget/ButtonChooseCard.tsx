import { useLocation, useNavigate } from "react-router-dom";
import { USER } from "../../../constants/common.constant";
import { useSetFigure } from "../../../services/hooks/hookFigures";
import useStore from "../../../store";
import { getItemLocalStorage } from "../../../utils/helper";
import Icon from "../../atoms/Icon";

const ButtonStart = () => {
  const navigator = useNavigate();
  const location = useLocation();
  const setSelectedCards = useStore((state: any) => state.setSelectedCards);
  const setCurrentIndex = useStore((state: any) => state.setCurrentIndex);
  const setCurrentStep = useStore((state: any) => state.setCurrentStep);
  const currentStep = useStore((state: any) => state.currentStep);
  const selectedCards = useStore((state: any) => state.selectedCards);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);

  const message = useStore((state: any) => state.message);

  const figure = useStore((state: any) => state.figure);
  const setFigure = useStore((state: any) => state.setFigure);

  const { fetchFigure } = useSetFigure();
  const userInfo = getItemLocalStorage(USER);

  const handleNext = () => {
    setCurrentStep(currentStep + 1);
    if (location.pathname === "/" || location.pathname === "/stage0") {
      navigator("/stage1");
      setSelectedCards([]);
    } else if (location.pathname === "/stage1") {
      navigator("/stage2");
      setSelectedCards([]);
    } else if (location.pathname === "/stage3") {
      navigator("/stage4");
      setCurrentIndex(0);
      setSelectedCards([]);
    } else if (location.pathname === "/stage4") {
      navigator("/stage5");
      setCurrentIndex(0);
      if (selectedFamily.length > 0) {
        selectedFamily.pop();
        selectedFamilyJosa.pop();
      }
    } else if (location.pathname === "/stage5") {
      navigator("/stage6");
    }
  };

  const handleStartChat = async () => {
    if (location.pathname === "/stage1" || location.pathname === "/stage2") {
      try {
        const response = await fetchFigure({
          kidName: userInfo.kidname,
          receiptNo: `${userInfo.receiptNo}`,
          stage: `${currentStep}`,
          figures: selectedCards.map((card: { name: string }) => ({
            figure: card.name.toLowerCase(),
            message: `${message}`,
            relation: "나",
          })),
        });

        if (!response) {
          console.error("API Error:", response.statusText);
        } else {
          setCurrentStep(currentStep + 1);
          if (location.pathname === "/stage1") {
            navigator("/stage2");
            setSelectedCards([]);
          } else if (location.pathname === "/stage2") {
            navigator("/stage3");
          }
        }
      } catch (error: any) {
        console.error("Error:", error.message);
      }
    } else if (
      location.pathname === "/stage3" ||
      location.pathname === "/stage5"
    ) {
      try {
        const response = await fetchFigure({
          kidName: userInfo.kidname,
          receiptNo: `${userInfo.receiptNo}`,
          stage: `${currentStep}`,
          figures: figure,
        });

        if (!response) {
          console.error("API Error:", response.statusText);
        } else {
          setCurrentStep(currentStep + 1);
          if (location.pathname === "/stage3") {
            navigator("/stage4");
          } else if (location.pathname === "/stage5") {
            navigator("/stage6");
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
      <div className="react-chatbot-kit-chat-bot-message-container flex gap-2">
        <button
          type="button"
          className="text-2xl font-bold ml-auto flex gap-2 items-center border border-primary bg-primary hover:bg-grey-100 hover:text-greenDark text-white px-3 py-4 rounded-md cursor-pointer select-none"
          onClick={() => {
            if (
              location.pathname === "/stage1" ||
              location.pathname === "/stage2" ||
              location.pathname === "/stage3" ||
              location.pathname === "/stage5"
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
