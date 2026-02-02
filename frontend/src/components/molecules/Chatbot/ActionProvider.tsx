import React, { useState } from "react";
import useStore from "../../../store";
import { getItemLocalStorage } from "../../../utils/helper";
import { USER } from "../../../constants/common.constant";
import {
  useLlmCompletion,
  useSetFigure,
} from "../../../services/hooks/hookFigures";

const ActionProvider = ({ createChatBotMessage, setState, children }: any) => {
  const selectedCards = useStore((state: any) => state.selectedCards);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const currentIndex = useStore((state: any) => state.currentIndex);
  const selectedCardsNew = useStore((state: any) => state.selectedCardsNew);
  const selectedCardsNew6 = useStore((state: any) => state.selectedCardsNew6);
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);
  const setMessageUser = useStore((state: any) => state.setMessageUser);
  const currentStep = useStore((state: any) => state.currentStep);

  const [count, setCount] = useState(0);

  const userInfo = getItemLocalStorage(USER);
  const { fetchLlmCompletion } = useLlmCompletion();
  const { fetchFigure } = useSetFigure();

  const handleSendAPI = async (message: string) => {
    const response = await fetchLlmCompletion({
      kidName: userInfo.kidname,
      receiptNo: `${userInfo.receiptNo}`,
      relation: `${selectedFamily[currentIndex]}`,
      count: `${count}`,
      message: message,
    });

    if (!response) {
      console.error("API Error:", response.statusText);
    }
    return response.message;
  };

  const handleFigureSelected = () => {
    const botMessage = createChatBotMessage("이 동물들이 왜 나라고 생각했어?");
    const botMessage2 = createChatBotMessage(
      "어떤 부분이 나랑 닮았다고 생각이 들었는지 궁금해.",
      {
        widget: "SelectedCard",
      }
    );

    setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, botMessage],
    }));
    setTimeout(() => {
      setState((prev: any) => ({
        ...prev,
        messages: [...prev.messages, botMessage2],
      }));
    }, 500);
  };

  const initialAction = (selectedFigures: any) => {
    const message1 = createChatBotMessage(
      `${selectedFigures[currentIndex].figure}${
        selectedFigures[currentIndex].josa === 1 ? "을" : "를"
      } 골랐구나.`,
      {
        widget: `SelectedCard4Family_${selectedFamily[currentIndex]}`,
      }
    );

    const message = createChatBotMessage(
      `${selectedFamily[currentIndex]}${
        selectedFamilyJosa[currentIndex] === 1 ? "이" : "가"
      } 왜 ${selectedFigures[currentIndex].figure} 같다고 생각했을까?`
    );
    setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, message1],
    }));
    setTimeout(() => {
      updateState(message, "first");
    }, 500);
  };
  const afterInitMessage = (message: string) => {
    setMessageUser(message);
    const message1 = createChatBotMessage(
      `그렇구나. ${selectedCards[currentIndex].figure}의 모습이 ${
        selectedFamily[currentIndex]
      } 같구나.`
    );

    const nextIndex = currentIndex + 1;

    if (nextIndex < selectedFamily.length) {
      const botMessage2 = createChatBotMessage(
        `이번에는 ${selectedFamily[nextIndex]}${
          selectedFamilyJosa[nextIndex] === 1 ? "이라고" : "라고"
        } 생각되는 동물을 선택해보자.`,
        {
          widget: "ChooseAnimal4Family",
        }
      );

      updateState(message1);
      useStore.setState((state: any) => ({
        ...state,
        currentIndex: nextIndex,
      }));
      setTimeout(() => {
        setState((prev: any) => ({
          ...prev,
          messages: [...prev.messages, botMessage2],
        }));
      }, 500);
    } else {
      const finalWidget = createChatBotMessage(
        "이번에는 동물 중에서 누구 누구가 서로 친한지 친한 동물들끼리 세워보자.",
        {
          widget: "ButtonChooseCard",
        }
      );

      updateState(message1);
      setTimeout(() => {
        setState((prev: any) => ({
          ...prev,
          messages: [...prev.messages, finalWidget],
        }));
      }, 500);
    }
  };
  const initialAction5 = (selectedFigures: any) => {
    const message1 = createChatBotMessage(
      `${selectedFigures[currentIndex].figure}${
        selectedFigures[currentIndex].josa === 1 ? "을" : "를"
      } 골랐구나.`,
      {
        widget: `SelectedCard4Family_${selectedFamily[currentIndex]}`,
      }
    );
    const message = createChatBotMessage(
      `${selectedFamily[currentIndex]}${
        selectedFamilyJosa[currentIndex] === 1 ? "이" : "가"
      } ${selectedFigures[currentIndex].figure}${
        selectedFigures[currentIndex].josa === 1 ? "이" : "가"
      } 되었으면 좋겠는 이유가 있을까?`
    );

    setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, message1],
    }));
    setTimeout(() => {
      updateState(message, "second");
    }, 500);
  };

  const afterInitMessage5 = (message: string) => {
    setMessageUser(message);

    const message1 = createChatBotMessage(
      `그렇구나. 그래서 ${selectedFamily[currentIndex]}${
        selectedFamilyJosa[currentIndex] === 1 ? "이" : "가"
      } ${selectedCardsNew[currentIndex].figure}${
        selectedCardsNew[currentIndex].josa === 1 ? "이" : "가"
      } 되었으면 좋겠구나.`
    );

    const nextIndex = currentIndex + 1;

    if (nextIndex < selectedFamily.length) {
      const botMessage2 = createChatBotMessage(
        `${selectedFamily[currentIndex + 1]}${
          selectedFamilyJosa[currentIndex + 1] === 1 ? "은" : "는"
        } ${selectedCards[currentIndex + 1].figure}${
          selectedCards[currentIndex + 1].josa === 1 ? "이었" : "였"
        }는데, 어떤 동물이 되었으면 좋겠어?`,
        // }는데, ${selectedFamily[currentIndex + 1]}${
        //   selectedFamilyJosa[currentIndex + 1] === 1 ? "이" : "가"
        // } 어떤 동물이 되었으면 좋겠는지 골라보자.`,
        {
          widget: "ChooseAnimal4Family",
        }
      );

      updateState(message1);
      useStore.setState((state: any) => ({
        ...state,
        currentIndex: nextIndex,
      }));
      setTimeout(() => {
        setState((prev: any) => ({
          ...prev,
          messages: [...prev.messages, botMessage2],
        }));
      }, 500);
    } else {
      const finalWidget = createChatBotMessage(
        "이번에는 가족들이 나를 어떤 동물이라 생각할지 골라보자.",
        {
          widget: "ButtonChooseCard",
        }
      );

      updateState(message1);
      setTimeout(() => {
        setState((prev: any) => ({
          ...prev,
          messages: [...prev.messages, finalWidget],
        }));
      }, 500);
    }
  };

  const initialAction6 = (selectedFigures: any) => {
    const message1 = createChatBotMessage(
      ` ${selectedFigures[currentIndex].figure}${
        selectedFigures[currentIndex].josa === 1 ? "이라고" : "라고"
      } 고를 것 같구나.`,
      {
        widget: `SelectedCard4Family_${selectedFamily[currentIndex]}`,
      }
    );
    const message = createChatBotMessage(
      `왜 ${selectedFamily[currentIndex]}${
        selectedFamilyJosa[currentIndex] === 1 ? "이" : "가"
      } 너를 ${selectedFigures[currentIndex].figure}${
        selectedFigures[currentIndex].josa === 1 ? "이라고" : "라고"
      } 생각할 것 같은지 말해 보자.`
    );
    setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, message1],
    }));
    setTimeout(() => {
      updateState(message, "stage6_1");
    }, 500);
  };

  const afterInitMessage6_1 = async (message: string) => {
    const newFigure = [
      {
        figure: selectedCardsNew6[currentIndex].figure,
        message: message,
        relation: selectedFamily[currentIndex],
      },
    ];

    const response1 = await fetchFigure({
      kidName: userInfo.kidname,
      receiptNo: `${userInfo.receiptNo}`,
      stage: `${currentStep}`,
      figures: newFigure,
    });
    if (!response1) {
      console.error("API Error:", response1.statusText);
    }

    const messageAPIbot = await handleSendAPI(message);

    const botMessage2 = createChatBotMessage(`${messageAPIbot}`);

    setCount(count + 1);
    setTimeout(() => {
      updateState(botMessage2, "stage6_2");
    }, 500);
  };

  const afterInitMessage6_2 = async (message: string) => {
    const messageAPIbot = await handleSendAPI(message);
    const message1 = createChatBotMessage(`${messageAPIbot}`);
    setCount(count + 1);
    setTimeout(() => {
      updateState(message1, "stage6_3");
    }, 500);
  };
  
  const afterInitMessage6_3 = async (message: string) => {
    const messageAPIbot = await handleSendAPI(message);
    const messagebot = createChatBotMessage(`${messageAPIbot}`);
    // const messagebot = createChatBotMessage(
    //   `  그렇구나. ${selectedCardsNew6[currentIndex].figure}에게 그렇게 말해주고 싶구나.`
    // );
    // handleSendAPI(message);
    const nextIndex = currentIndex + 1;
    
    if (nextIndex < selectedFamily.length) {
      setCount(0);
      const botMessage2 = createChatBotMessage(
        `${selectedFamily[currentIndex + 1]}${
          selectedFamilyJosa[currentIndex + 1] === 1 ? "은" : "는"
        } 너를 무슨 동물로 세울지 골라보자.`,
        {
          widget: "ChooseAnimal4Family",
        }
        );
        
        updateState(messagebot);
        useStore.setState((state: any) => ({
          ...state,
          currentIndex: nextIndex,
        }));
        setTimeout(() => {
          setState((prev: any) => ({
            ...prev,
            messages: [...prev.messages, botMessage2],
          }));
        }, 500);
      } else {
        setCount(0);
        const finalWidget = createChatBotMessage(
          `${messageAPIbot}`,
          // `그렇구나. ${selectedCardsNew6[currentIndex].figure}에게 그렇게 말해주고 싶구나.`,
          {
            widget: "ButtonEnd",
          }
        );

      updateState(message);
      setTimeout(() => {
        setState((prev: any) => ({
          ...prev,
          messages: [...prev.messages, finalWidget],
        }));
      }, 500);
    }
  };

  const updateState = (message: any, checker = "") => {
    setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, message],
      checker,
    }));
  };

  const handleConfirmSelectCard = (message: string) => {
    setMessageUser(message);
    const botMessage = createChatBotMessage(
      `그랬구나, ${userInfo.kidname}${userInfo.endWord.eunVSneun} 그렇게 생각했구나.`
    );
    const botMessage2 = createChatBotMessage(
      `이번에는 ${userInfo.kidname}${userInfo.endWord.liVSka} 되고싶은 동물을 선택해보자.`,
      {
        widget: "ButtonChooseCard",
      }
    );

    setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, botMessage],
    }));
    setTimeout(() => {
      setState((prev: any) => ({
        ...prev,
        messages: [...prev.messages, botMessage2],
      }));
    }, 500);
  };
  const handleConfirmSelectCard2 = (message: string) => {
    setMessageUser(message);
    const botMessage = createChatBotMessage(
      `그랬구나, 그래서 ${userInfo.kidname}${userInfo.endWord.eunVSneun} ${
        selectedCards[0].name
      }, ${selectedCards[1].name}, ${selectedCards[2].name}, ${
        selectedCards[3].name
      }${selectedCards[3].josa === 1 ? "을" : "를"} 선택했구나.`
    );
    const botMessage1 = createChatBotMessage(
      `이번에는 ${userInfo.kidname}의 가족들을 동물로 선택해보자.`
    );
    const botMessage2 = createChatBotMessage(
      `${userInfo.kidname}의 가족들은 누구누구야?`,
      {
        widget: "ChooseFamily",
      }
    );

    setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, botMessage],
    }));
    setTimeout(() => {
      setState((prev: any) => ({
        ...prev,
        messages: [...prev.messages, botMessage1],
      }));
    }, 500);
    setTimeout(() => {
      setState((prev: any) => ({
        ...prev,
        messages: [...prev.messages, botMessage2],
      }));
    }, 500);
  };

  return (
    <div>
      {React.Children.map(children, (child) => {
        return React.cloneElement(child, {
          actions: {
            handleFigureSelected,
            handleConfirmSelectCard,
            handleConfirmSelectCard2,
            afterInitMessage,
            initialAction,
            initialAction5,
            afterInitMessage5,
            initialAction6,
            afterInitMessage6_1,
            afterInitMessage6_2,
            afterInitMessage6_3,
          },
        });
      })}
    </div>
  );
};

export default ActionProvider;
