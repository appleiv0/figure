import { useEffect, useState } from "react";
import Chatbot from "react-chatbot-kit";
import { Animal } from "../../../data";
import useStore from "../../../store";
import Icon from "../../atoms/Icon";
import ActionProvider from "../../molecules/Chatbot/ActionProvider";
import config1 from "../../molecules/Chatbot/Config/config1";
import config2 from "../../molecules/Chatbot/Config/config2";
import MessageParser from "../../molecules/Chatbot/MessageParser";

const ChooseAnimal = () => {
  const selectedCards = useStore((state: any) => state.selectedCards);
  const setSelectedCards = useStore((state: any) => state.setSelectedCards);

  const [selectChatbot, setSelectChatbot] = useState(false);
  const [currentStepChoose, setCurrentStepChoose] = useState(0);
  const [checkedState, setCheckedState] = useState(() =>
    Animal.map(() => false)
  );

  const handleCircleClick = (index: number, name: string, img: string, josa: number) => {
    if (selectedCards.length === 4 && !checkedState[index]) {
      return;
    }
    setCheckedState(
      checkedState.map((bool, j) => {
        if (j === index) {
          if (checkedState[index] === true) {
            const updatedSelectedCards = selectedCards.filter(
              (card: { index: number }) => card.index !== index
            );
            setSelectedCards(updatedSelectedCards);
            return false;
          }
          const updatedSelectedCards = [...selectedCards, { name, index, img, josa }];
          setSelectedCards(updatedSelectedCards);
          return true;
        } else {
          return bool;
        }
      })
    );
  };

  const handleStartChat = () => {
    setSelectChatbot(true);
  };

  useEffect(() => {
    setCurrentStepChoose(selectedCards.length);
  }, [selectedCards]);

  return (
    <>
      {!selectChatbot && (
        <div className="container-lg mx-auto">
          <div className="flex justify-center items-center mb-14 mr-10 ">
            <img
              className="w-[3rem] justify-start items-start mr-2 mt-[2rem]"
              src="/assets/images/01.png"
              alt="Intro Image"
            />{" "}
            {selectedCards.length === 0 && location.pathname === "/stage1" && (
              <div className=" relative top-5 border border-white w-full max-w-[43rem] bg-[#FFFBE3] rounded-lg">
                <h1 className="text-center text-2xl font-bold p-2">
                  여기 있는 동물들 중에서{" "}
                  <span className="text-greenDark">나라고 생각하는 동물</span>을
                  골라보자.{" "}
                  <p>고르는게 힘들다면, 어떤 동물이 나와 닮았는지 찾아보자.</p>
                </h1>
              </div>
            )}
            {selectedCards.length === 0 && location.pathname === "/stage2" && (
              <div className=" relative top-5 border border-white w-full max-w-[43rem] bg-[#FFFBE3] rounded-lg">
                <h1 className="text-center text-2xl font-bold p-2">
                  여기 있는 동물들 중에서{" "}
                  <span className="text-greenDark">내가 되고싶은 동물</span>을
                  골라보자.{" "}
                  <p>고르는게 힘들다면, 어떤 동물이 나와 닮았는지 찾아보자.</p>
                </h1>
              </div>
            )}
            {selectedCards.length === 1 && (
              <div className="relative top-5 border border-white w-full max-w-[43rem] bg-[#FFFFFF] rounded-lg">
                <h1 className="text-start text-2xl font-bold ml-2 p-2">
                  {`${selectedCards[0].name}${selectedCards[0].josa === 1 ? "을" : "를"
                    } 골랐구나. 나라고 생각되는 동물이 또 있는지 골라보자`}
                </h1>
              </div>
            )}
            {selectedCards.length === 2 && (
              <div className="relative top-5 border border-white w-full max-w-[43rem] bg-[#FFFFFF] rounded-lg">
                <h1 className="text-start text-2xl font-bold ml-2 p-2">
                  {`이번엔 ${selectedCards[1].name}${selectedCards[1].josa === 1 ? "을" : "를"
                    } 골랐구나. 2개 더 골라보자`}
                </h1>
              </div>
            )}
            {selectedCards.length === 3 && (
              <div className="relative top-5 border border-white w-full max-w-[43rem] bg-[#FFFFFF] rounded-lg">
                <h1 className="text-start text-2xl font-bold ml-2 p-2">
                  {`이번엔 ${selectedCards[2].name}${selectedCards[2].josa === 1 ? "을" : "를"
                    } 골랐구나. 1개 더 골라보자`}
                </h1>
              </div>
            )}
            {selectedCards.length === 4 && (
              <div className=" relative top-5 border border-white w-full max-w-[43rem] bg-[#FFFFFF] rounded-lg">
                <h1 className="text-start text-2xl font-bold  ml-2 p-2 ">
                  4가지 모두 선택했구나! 선택 완료 버튼을 눌러줘.
                </h1>
              </div>
            )}
          </div>
          <div className="background-container flex flex-col mb-4 md:mb-20">
            <div className="grid grid-cols-12 gap-1 md:gap-8">
              <div className="grid grid-cols-6 sm:grid-cols-5 md:grid-cols-6 lg:grid-cols-8 col-span-11 gap-1 md:gap-8">
                {Animal.map((animal) => {
                  return (
                    <div key={animal.index} className={`animal-card`}>
                      <button
                        className={`animal-card-content h-[4.5rem] w-full rounded-lg p-0.5 text-center flex flex-col items-center justify-center gap-1 ${checkedState[animal.index]
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
                        <img
                          src={animal.img}
                          alt={animal.name}
                          className="h-[2.5rem] object-contain"
                        />
                        <span className="text-[0.6rem] md:text-xs font-bold leading-tight">
                          {animal.name}
                        </span>
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="col-span-1 z-20 text-center font-bold relative">
                <ul className="progress-steps absolute top-0 left-1/2 -translate-x-1/2">
                  <li
                    className={
                      currentStepChoose >= 1
                        ? "active"
                        : currentStepChoose === 0
                          ? "current"
                          : ""
                    }
                  ></li>
                  <li
                    className={
                      currentStepChoose >= 2
                        ? "active"
                        : currentStepChoose === 1
                          ? "current"
                          : ""
                    }
                  ></li>
                  <li
                    className={
                      currentStepChoose >= 3
                        ? "active"
                        : currentStepChoose === 2
                          ? "current"
                          : ""
                    }
                  ></li>
                  <li
                    className={
                      currentStepChoose >= 4
                        ? "active"
                        : currentStepChoose === 3
                          ? "current"
                          : ""
                    }
                  ></li>
                </ul>
                {selectedCards.length === 4 && (
                  <button
                    type="button"
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[0.9375rem] font-extrabold flex flex-col justify-center items-center gap-1 border border-primary bg-primary hover:bg-grey-100 hover:text-greenDark text-white h-[5.75rem] w-[5.75rem] p-2 rounded-full cursor-pointer select-none"
                    onClick={handleStartChat}
                  >
                    <Icon
                      icon="check"
                      width={16}
                      height={18}
                      className="max-w-4"
                    />
                    선택 완료
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {selectChatbot && (
        <div className="container mx-auto">
          {location.pathname === "/stage1" && (
            <Chatbot
              config={config1 as any}
              actionProvider={ActionProvider}
              messageParser={MessageParser}
              placeholderText="여기를 클릭해 입력하세요."
            />
          )}
          {location.pathname === "/stage2" && (
            <Chatbot
              config={config2 as any}
              actionProvider={ActionProvider}
              messageParser={MessageParser}
              placeholderText="여기를 클릭해 입력하세요."
            />
          )}
        </div>
      )}
    </>
  );
};

export default ChooseAnimal;
