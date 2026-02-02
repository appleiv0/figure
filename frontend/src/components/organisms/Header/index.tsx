import React, { useState, useEffect } from "react";
import Icon from "../../atoms/Icon";
import { useLocation, useNavigate } from "react-router-dom";
import useStore from "../../../store";
import { USER } from "../../../constants/common.constant";
import { getItemLocalStorage } from "../../../utils/helper";

const Header = () => {
  const setCurrentStep = useStore((state: any) => state.setCurrentStep);
  const currentStep = useStore((state: any) => state.currentStep);
  const setSelectedCards = useStore((state: any) => state.setSelectedCards);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const setFigure = useStore((state: any) => state.setFigure);
  const setSelectedCardsNew = useStore(
    (state: any) => state.setSelectedCardsNew
  );
  const setCurrentIndex = useStore((state: any) => state.setCurrentIndex);
  const setSelectedFamily = useStore((state: any) => state.setSelectedFamily);
  const setSelectedFamilyJosa = useStore(
    (state: any) => state.setSelectedFamilyJosa
  );
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);

  const setSelectedCardsNew6 = useStore(
    (state: any) => state.setSelectedCardsNew6
  );

  const [remainingTime, setRemainingTime] = useState(60);
  const [isPaused, setIsPaused] = useState(false);
  const [currentPage, setCurrentPage] = useState("");
  const location = useLocation();
  const navigator = useNavigate();
  const userInfo = getItemLocalStorage(USER);

  useEffect(() => {
    setCurrentPage(location.pathname);
  }, [location]);

  const decreaseTime = () => {
    if (remainingTime > 0) {
      setRemainingTime((prevTime) => prevTime - 1);
    }
  };

  const handlePauseResume = () => {
    setIsPaused((prevIsPaused) => !prevIsPaused);
  };

  useEffect(() => {
    let timer: string | number | NodeJS.Timeout | undefined;
    if (!isPaused && remainingTime > 0) {
      timer = setInterval(decreaseTime, 1000);
    }
    return () => clearInterval(timer);
  }, [isPaused, remainingTime]);

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigator("/information");
    }

    if (currentStep < 5) {
      setSelectedCards([]);
      setSelectedCardsNew([]);
      setFigure([]);
      setCurrentIndex(0);
      if (currentStep === 3 || currentStep === 2) {
        setSelectedFamily([]);
        setSelectedFamilyJosa([]);
      }
    } else if (currentStep === 5) {
      setSelectedCardsNew([]);
      setSelectedFamily([...selectedFamily, userInfo.kidname]);
      setSelectedFamilyJosa([...selectedFamilyJosa, 0]);

      setCurrentIndex(0);
    } else if (currentStep === 6) {
      setSelectedCardsNew([]);
      setSelectedCardsNew6([]);
      setCurrentIndex(0);
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
            중단하기
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
                currentPage === "/stage1" || currentPage === "/"
                  ? "#2EB500"
                  : "#DDDDDD"
              }
            />
            <circle
              cx="17.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 17.5 4.5)"
              fill={currentPage === "/stage2" ? "#2EB500" : "#DDDDDD"}
            />
            <circle
              cx="31.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 31.5 4.5)"
              fill={currentPage === "/stage3" ? "#2EB500" : "#DDDDDD"}
            />
            <circle
              cx="44.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 44.5 4.5)"
              fill={currentPage === "/stage4" ? "#2EB500" : "#DDDDDD"}
            />
            <circle
              cx="57.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 57.5 4.5)"
              fill={currentPage === "/stage5" ? "#2EB500" : "#DDDDDD"}
            />
            <circle
              cx="70.5"
              cy="4.5"
              r="4.5"
              transform="rotate(-90 70.5 4.5)"
              fill={currentPage === "/stage6" ? "#2EB500" : "#DDDDDD"}
            />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          <button
            className={`flex gap-1 items-center rounded-md px-3 py-2.5 font-bold text-lg ${
              remainingTime > 0
                ? "bg-grey-500 text-white"
                : "bg-white text-grey-500"
            }`}
          >
            <Icon icon="countdown" width={20} height={20} className="max-w-5" />
            {remainingTime}
          </button>
          <button
            className="bg-white flex gap-2 items-center rounded-md px-3 py-2.5 font-bold text-lg text-grey-500"
            onClick={handlePauseResume}
          >
            {isPaused ? (
              <React.Fragment>
                <Icon icon="play" width={20} height={20} className="max-w-5" />
                계속하다
              </React.Fragment>
            ) : (
              <React.Fragment>
                <Icon icon="pause" width={20} height={20} className="max-w-5" />
                일시정지
              </React.Fragment>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default Header;
