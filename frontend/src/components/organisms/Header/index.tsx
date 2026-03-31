import { useState, useEffect } from "react";
import Icon from "../../atoms/Icon";
import { useLocation, useNavigate } from "react-router-dom";
import useStore from "../../../store";

const stageOrder = ["/stage0", "/stage1", "/stage2", "/stage3", "/stage4", "/stage5", "/stage6"];

const Header = () => {
  const [currentPage, setCurrentPage] = useState("");
  const location = useLocation();
  const navigator = useNavigate();
  const setCurrentStep = useStore((state: any) => state.setCurrentStep);
  const currentStep = useStore((state: any) => state.currentStep);
  const setCurrentIndex = useStore((state: any) => state.setCurrentIndex);
  const setSelectedCards = useStore((state: any) => state.setSelectedCards);
  const setSelectedCardsNew = useStore((state: any) => state.setSelectedCardsNew);
  const setSelectedCardsNew6 = useStore((state: any) => state.setSelectedCardsNew6);
  const setFigure = useStore((state: any) => state.setFigure);

  useEffect(() => {
    setCurrentPage(location.pathname);
  }, [location]);

  const handleBack = () => {
    const idx = stageOrder.findIndex(s => location.pathname.endsWith(s));
    if (idx > 0) {
      const prevStep = currentStep > 0 ? currentStep - 1 : 0;
      setCurrentStep(prevStep);
      setCurrentIndex(0);
      setFigure([]);
      navigator(stageOrder[idx - 1]);
    } else {
      navigator("/");
    }
  };

  return (
    <div className="relative bg-gray-100 py-8">
      <div className="container-xl mx-auto flex justify-between items-center py-8">
        <div className="flex items-center">
          <button
            className="font-heading flex items-center gap-2 font-bold text-lg text-grey-700 hover:text-greenDark transition-all duration-300 ease-in-out no-underline"
            onClick={handleBack}
          >
            <Icon icon="return" width={22} height={25} className="max-w-6" />
            뒤로가기
          </button>
        </div>

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="75"
            height="9"
            viewBox="0 0 75 9"
            fill="none"
            className="max-w-[4.6875rem]"
          >
            <circle
              cx="4.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 4.5 4.5)"
              fill={
                currentPage.endsWith("/stage1") || currentPage === "/"
                  ? "#2EB500"
                  : "#DDDDDD"
              }
            />
            <circle
              cx="17.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 17.5 4.5)"
              fill={currentPage.endsWith("/stage2") ? "#2EB500" : "#DDDDDD"}
            />
            <circle
              cx="31.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 31.5 4.5)"
              fill={currentPage.endsWith("/stage3") ? "#2EB500" : "#DDDDDD"}
            />
            <circle
              cx="44.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 44.5 4.5)"
              fill={currentPage.endsWith("/stage4") ? "#2EB500" : "#DDDDDD"}
            />
            <circle
              cx="57.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 57.5 4.5)"
              fill={currentPage.endsWith("/stage5") ? "#2EB500" : "#DDDDDD"}
            />
            <circle
              cx="70.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 70.5 4.5)"
              fill={currentPage.endsWith("/stage6") ? "#2EB500" : "#DDDDDD"}
            />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default Header;
