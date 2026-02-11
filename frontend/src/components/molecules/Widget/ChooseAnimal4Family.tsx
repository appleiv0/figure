import { useState } from "react";
import Icon from "../../atoms/Icon";
import Modal from "../../atoms/Modal";
import useStore from "../../../store";
import { Animal } from "../../../data";
import { useLocation } from "react-router-dom";

const ChooseAnimal4Family = (props: any) => {
  const selectedCards = useStore((state: any) => state.selectedCards);
  const setSelectedCards = useStore((state: any) => state.setSelectedCards);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const currentIndex = useStore((state: any) => state.currentIndex);
  const selectedCardsNew = useStore((state: any) => state.selectedCardsNew);
  const setSelectedCardsNew = useStore(
    (state: any) => state.setSelectedCardsNew
  );
  const selectedCardsNew6 = useStore((state: any) => state.selectedCardsNew6);
  const setSelectedCardsNew6 = useStore(
    (state: any) => state.setSelectedCardsNew6
  );

  const [currentFigure, setCurrentFigure] = useState<any>();
  const location = useLocation();
  const [isShow, setIsShow] = useState<boolean>(false);
  const openModal = () => {
    setIsShow(!isShow);
  };

  const [checkedState, setCheckedState] = useState(() =>
    Animal.map(() => false)
  );

  const handleCircleClick = (index: number, name: string, img: string, josa: number) => {
    setCheckedState(checkedState.map((_bool, j) => j === index));
    setCurrentFigure({
      figure: name,
      index,
      img,
      josa,
      relation: selectedFamily[currentIndex],
    });
  };
  const initialAction = () => {
    if (location.pathname === "/stage3") {
      props.actions.initialAction([...selectedCards, currentFigure]);
      setSelectedCards([...selectedCards, currentFigure]);
    } else if (location.pathname === "/stage5") {
      props.actions.initialAction5([...selectedCardsNew, currentFigure]);
      setSelectedCardsNew([...selectedCardsNew, currentFigure]);
    } else if (location.pathname === "/stage6") {
      props.actions.initialAction6([...selectedCardsNew6, currentFigure]);
      setSelectedCardsNew6([...selectedCardsNew6, currentFigure]);
    }
    setIsShow(false);
  };

  return (
    <>
      <div className="react-chatbot-kit-chat-bot-message-container flex gap-2">
        <button
          className="text-2xl font-bold ml-auto flex gap-2 items-center border border-primary bg-primary hover:bg-grey-100 hover:text-greenDark text-white px-3 py-4 rounded-md"
          onClick={() => openModal()}
        >
          동물 선택하러 가기
          <Icon icon="arrowRight" width={24} height={24} className="max-w-6" />
        </button>
      </div>
      <Modal
        isShowing={isShow}
        hide={openModal}
        children={
          <div className="background-container">
            <div className="w-full mx-auto px-3 py-4 md:px-5 flex flex-col max-h-[80vh]">
              {/* Scrollable animal grid */}
              <div className="overflow-y-auto flex-1">
                <div className="grid grid-cols-6 sm:grid-cols-6 md:grid-cols-8 gap-1">
                  {Animal.map((animal) => {
                    return (
                      <div key={animal.index} className={`animal-card`}>
                        <button
                          className={`animal-card-content h-[4.5rem] md:h-[5rem] w-full rounded-xl p-0.5 text-center flex flex-col items-center justify-center gap-0.5 ${
                            checkedState[animal.index]
                              ? "bg-primary text-white"
                              : "bg-white text-black"
                          }`}
                          onClick={() =>
                            handleCircleClick(
                              animal.index,
                              animal.name,
                              animal.img,
                              animal.josa
                            )
                          }
                        >
                          <img src={animal.img} alt={animal.name} className="h-[2rem] md:h-[2.5rem] object-contain" />
                          <span className="text-[0.6rem] md:text-xs font-bold leading-tight">{animal.name}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
              {/* Fixed bottom area with button */}
              <div className="flex justify-end pt-3 border-t border-gray-200 mt-3">
                <button
                  className="text-base font-extrabold flex items-center gap-2 border border-primary bg-primary hover:bg-grey-100 hover:text-greenDark text-white px-6 py-3 rounded-full cursor-pointer select-none"
                  onClick={() => initialAction()}
                >
                  <Icon
                    icon="check"
                    width={20}
                    height={20}
                    className="max-w-5"
                  />
                  선택 완료
                </button>
              </div>
            </div>
          </div>
        }
      />
    </>
  );
};

export default ChooseAnimal4Family;
