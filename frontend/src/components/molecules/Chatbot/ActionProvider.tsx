import React, { useState, useRef } from "react";
import useStore from "../../../store";
import { getItemLocalStorage } from "../../../utils/helper";
import { USER } from "../../../constants/common.constant";
import {
  useLlmCompletion,
  useSetFigure,
} from "../../../services/hooks/hookFigures";
import { useSaveChat } from "../../../services/hooks/hookChatbot";

const ActionProvider = ({ createChatBotMessage, setState, children }: any) => {
  const selectedCards = useStore((state: any) => state.selectedCards);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const currentIndex = useStore((state: any) => state.currentIndex);
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);
  const setMessageUser = useStore((state: any) => state.setMessageUser);
  const currentStep = useStore((state: any) => state.currentStep); void currentStep;
  const figure = useStore((state: any) => state.figure);
  const setFigure = useStore((state: any) => state.setFigure);

  const [count, setCount] = useState(0);
  const countRef = useRef(0);
  const [stage1CardIndex, setStage1CardIndex] = useState(0);
  const [stage2CardIndex, setStage2CardIndex] = useState(0);

  const userInfo = getItemLocalStorage(USER) || { kidname: '', receiptNo: '', endWord: { liVSka: '이', eunVSneun: '은', kwaVSwa: '와' } };
  const { fetchLlmCompletion } = useLlmCompletion();
  const { fetchFigure } = useSetFigure();
  const { fetchSaveChat } = useSaveChat();

  const saveChatMessage = async (role: string, content: string, relation: string = "") => {
    try {
      if (!content) return;
      await fetchSaveChat({
        kidName: userInfo.kidname,
        receiptNo: `${userInfo.receiptNo}`,
        role,
        content,
        relation,
      });
    } catch (e: any) {
      console.error("Failed to save chat:", e.message);
    }
  };

  const showApiError = () => {
    const errorMsg = createChatBotMessage(
      "에러가 발생했습니다. 처음부터 검사를 다시 실시 해 주세요."
    );
    setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, errorMsg],
      checker: "",
    }));
  };

  const handleSendAPI = async (message: string) => {
    try {
      // Always read fresh state to avoid stale closures under concurrent load
      const state = useStore.getState() as any;
      const freshFamily = state.selectedFamily;
      const freshIndex = state.currentIndex;

      const response = await fetchLlmCompletion({
        kidName: userInfo.kidname,
        receiptNo: `${userInfo.receiptNo}`,
        relation: `${freshFamily[freshIndex]}`,
        count: `${countRef.current}`,
        message: message,
      });

      if (!response) {
        return null;
      }
      return response.message;
    } catch (e) {
      console.error("LLM API Error:", e);
      return null;
    }
  };

  const handleFigureSelected = () => {
    const botMessage = createChatBotMessage("이 동물들이 왜 나라고 생각했어?");
    const botMessage2 = createChatBotMessage(
      "어떤 부분이 나랑 닮았다고 생각이 들었는지 궁금해.",
      {
        widget: "SelectedCard",
      }
    );

    saveChatMessage("bot", "이 동물들이 왜 나라고 생각했어?", "나");
    saveChatMessage("bot", "어떤 부분이 나랑 닮았다고 생각이 들었는지 궁금해.", "나");

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

  const afterStage1Message = (message: string) => {
    try {
      const currentCard = selectedCards[stage1CardIndex];

      // Save figure to store
      const newFigure: any = {
        figure: currentCard.name,
        message: message,
        relation: "나",
      };
      if (currentCard.selectedAt) {
        newFigure.selectedAt = currentCard.selectedAt;
      }
      setFigure([...useStore.getState().figure, newFigure]);

      // Save chat messages
      saveChatMessage("user", message, "나");

      const confirmMsg = createChatBotMessage(
        `그렇구나. ${currentCard.name}${currentCard.josa === 1 ? "이" : "가"} 나랑 닮았다고 생각했구나.`
      );
      saveChatMessage("bot", `그렇구나. ${currentCard.name}${currentCard.josa === 1 ? "이" : "가"} 나랑 닮았다고 생각했구나.`, "나");

      const nextIndex = stage1CardIndex + 1;

      if (nextIndex < selectedCards.length) {
        // More animals to ask about
        const nextCard = selectedCards[nextIndex];
        const nextCardMsg = createChatBotMessage(
          `${nextCard.name}${nextCard.josa === 1 ? "을" : "를"} 골랐구나.`,
          { widget: `SelectedCardStage1_${nextIndex}` }
        );
        const nextQuestionMsg = createChatBotMessage(
          `${nextCard.name}의 어떤 부분이 나랑 닮았다고 생각했어?`
        );

        saveChatMessage("bot", `${nextCard.name}${nextCard.josa === 1 ? "을" : "를"} 골랐구나.`, "나");
        saveChatMessage("bot", `${nextCard.name}의 어떤 부분이 나랑 닮았다고 생각했어?`, "나");

        setState((prev: any) => ({
          ...prev,
          messages: [...prev.messages, confirmMsg],
        }));
        setTimeout(() => {
          setState((prev: any) => ({
            ...prev,
            messages: [...prev.messages, nextCardMsg],
          }));
        }, 500);
        setTimeout(() => {
          setState((prev: any) => ({
            ...prev,
            messages: [...prev.messages, nextQuestionMsg],
            checker: "stage1",
          }));
        }, 1000);

        setStage1CardIndex(nextIndex);
      } else {
        // All 4 animals done - transition to Stage 2
        const transitionMsg = createChatBotMessage(
          `이번에는 ${userInfo.kidname}${userInfo.endWord.liVSka} 되고싶은 동물을 선택해보자.`,
          { widget: "ButtonChooseCard" }
        );

        saveChatMessage("bot", `이번에는 ${userInfo.kidname}${userInfo.endWord.liVSka} 되고싶은 동물을 선택해보자.`, "나");

        setState((prev: any) => ({
          ...prev,
          messages: [...prev.messages, confirmMsg],
        }));
        setTimeout(() => {
          setState((prev: any) => ({
            ...prev,
            messages: [...prev.messages, transitionMsg],
            checker: "",
          }));
        }, 500);
      }
    } catch (e) {
      console.error("afterStage1Message error:", e);
      showApiError();
    }
  };

  const afterStage2Message = (message: string) => {
    try {
      const currentCard = selectedCards[stage2CardIndex];

      // Save figure to store
      const newFigure: any = {
        figure: currentCard.name,
        message: message,
        relation: "나(소망)",
      };
      if (currentCard.selectedAt) {
        newFigure.selectedAt = currentCard.selectedAt;
      }
      setFigure([...useStore.getState().figure, newFigure]);

      // Save chat messages
      saveChatMessage("user", message, "나(소망)");

      const confirmMsg = createChatBotMessage(
        `그렇구나. ${currentCard.name}${currentCard.josa === 1 ? "이" : "가"} 되고 싶구나.`
      );
      saveChatMessage("bot", `그렇구나. ${currentCard.name}${currentCard.josa === 1 ? "이" : "가"} 되고 싶구나.`, "나(소망)");

      const nextIndex = stage2CardIndex + 1;

      if (nextIndex < selectedCards.length) {
        // More animals to ask about
        const nextCard = selectedCards[nextIndex];
        const nextCardMsg = createChatBotMessage(
          `${nextCard.name}${nextCard.josa === 1 ? "을" : "를"} 골랐구나.`,
          { widget: `SelectedCardStage2_${nextIndex}` }
        );
        const nextQuestionMsg = createChatBotMessage(
          `왜 ${nextCard.name}${nextCard.josa === 1 ? "이" : "가"} 되고 싶어?`
        );

        saveChatMessage("bot", `${nextCard.name}${nextCard.josa === 1 ? "을" : "를"} 골랐구나.`, "나(소망)");
        saveChatMessage("bot", `왜 ${nextCard.name}${nextCard.josa === 1 ? "이" : "가"} 되고 싶어?`, "나(소망)");

        setState((prev: any) => ({
          ...prev,
          messages: [...prev.messages, confirmMsg],
        }));
        setTimeout(() => {
          setState((prev: any) => ({
            ...prev,
            messages: [...prev.messages, nextCardMsg],
          }));
        }, 500);
        setTimeout(() => {
          setState((prev: any) => ({
            ...prev,
            messages: [...prev.messages, nextQuestionMsg],
            checker: "stage2_wish",
          }));
        }, 1000);

        setStage2CardIndex(nextIndex);
      } else {
        // All 4 animals done - transition to family selection
        const familyIntroMsg = createChatBotMessage(
          `이번에는 ${userInfo.kidname}의 가족들을 동물로 선택해보자.`
        );
        const familyMsg = createChatBotMessage(
          `${userInfo.kidname}의 가족들은 누구누구야?`,
          { widget: "ChooseFamily" }
        );

        saveChatMessage("bot", `이번에는 ${userInfo.kidname}의 가족들을 동물로 선택해보자.`, "나(소망)");

        setState((prev: any) => ({
          ...prev,
          messages: [...prev.messages, confirmMsg],
        }));
        setTimeout(() => {
          setState((prev: any) => ({
            ...prev,
            messages: [...prev.messages, familyIntroMsg],
          }));
        }, 500);
        setTimeout(() => {
          setState((prev: any) => ({
            ...prev,
            messages: [...prev.messages, familyMsg],
            checker: "",
          }));
        }, 1000);
      }
    } catch (e) {
      console.error("afterStage2Message error:", e);
      showApiError();
    }
  };

  const initialAction = (selectedFigures: any) => {
    // 항상 마지막에 추가된 동물을 사용 (currentIndex 클로저 문제 방지)
    const latestFigure = selectedFigures[selectedFigures.length - 1];
    const idx = useStore.getState().currentIndex;
    const family = (useStore.getState().selectedFamily as string[])[idx];
    const familyJosa = (useStore.getState().selectedFamilyJosa as number[])[idx];

    const message1 = createChatBotMessage(
      `${latestFigure.figure}${latestFigure.josa === 1 ? "을" : "를"} 골랐구나.`,
      {
        widget: `SelectedCard4Family_${family}`,
      }
    );

    const message = createChatBotMessage(
      `${family}${familyJosa === 1 ? "이" : "가"} 왜 ${latestFigure.figure} 같다고 생각했을까?`
    );

    saveChatMessage("bot", `${latestFigure.figure}${latestFigure.josa === 1 ? "을" : "를"} 골랐구나.`, family);
    saveChatMessage("bot", `${family}${familyJosa === 1 ? "이" : "가"} 왜 ${latestFigure.figure} 같다고 생각했을까?`, family);

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
    const idx = useStore.getState().currentIndex;
    const currentCards = useStore.getState().selectedCards as any[];
    const currentFig = currentCards[idx] || currentCards[currentCards.length - 1];
    const family = (useStore.getState().selectedFamily as string[])[idx];

    const message1 = createChatBotMessage(
      `그렇구나. ${currentFig.figure}의 모습이 ${family} 같다고 생각했구나.`
    );

    saveChatMessage("user", message, family);
    saveChatMessage("bot", `그렇구나. ${currentFig.figure}의 모습이 ${family} 같다고 생각했구나.`, family);

    const nextIndex = idx + 1;

    const freshFam = useStore.getState().selectedFamily as string[];
    const freshJosa = useStore.getState().selectedFamilyJosa as number[];
    if (nextIndex < freshFam.length) {
      const botMessage2 = createChatBotMessage(
        `이번에는 ${freshFam[nextIndex]}${freshJosa[nextIndex] === 1 ? "이라고" : "라고"
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
        "이번에는 우리 가족이 어떤 동물이었으면 좋겠는지 바꾸어보자.",
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
    const latestFigure = selectedFigures[selectedFigures.length - 1];
    const idx = useStore.getState().currentIndex;
    const family = (useStore.getState().selectedFamily as string[])[idx];
    const familyJosa = (useStore.getState().selectedFamilyJosa as number[])[idx];

    const message1 = createChatBotMessage(
      `${latestFigure.figure}${latestFigure.josa === 1 ? "을" : "를"} 골랐구나.`,
      {
        widget: `SelectedCard4Family_${family}`,
      }
    );

    const message = createChatBotMessage(
      `${family}${familyJosa === 1 ? "이" : "가"} ${latestFigure.figure}${latestFigure.josa === 1 ? "이" : "가"} 되었으면 좋겠는 이유가 있을까?`
    );

    saveChatMessage("bot", `${latestFigure.figure}${latestFigure.josa === 1 ? "을" : "를"} 골랐구나.`, family);
    saveChatMessage("bot", `${family}${familyJosa === 1 ? "이" : "가"} ${latestFigure.figure}${latestFigure.josa === 1 ? "이" : "가"} 되었으면 좋겠는 이유가 있을까?`, family);

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
    const idx = useStore.getState().currentIndex;
    const currentCardsNew = useStore.getState().selectedCardsNew as any[];
    const currentFig = currentCardsNew[idx] || currentCardsNew[currentCardsNew.length - 1];
    const family = (useStore.getState().selectedFamily as string[])[idx];
    const familyJosa = (useStore.getState().selectedFamilyJosa as number[])[idx];

    const message1 = createChatBotMessage(
      `그렇구나. 그래서 ${family}${familyJosa === 1 ? "이" : "가"} ${currentFig.figure}${currentFig.josa === 1 ? "이" : "가"} 되었으면 좋겠구나.`
    );

    saveChatMessage("user", message, family);
    saveChatMessage("bot", `그렇구나. 그래서 ${family}${familyJosa === 1 ? "이" : "가"} ${currentFig.figure}${currentFig.josa === 1 ? "이" : "가"} 되었으면 좋겠구나.`, family);

    const nextIndex = idx + 1;

    const freshFam5 = useStore.getState().selectedFamily as string[];
    const freshJosa5 = useStore.getState().selectedFamilyJosa as number[];
    if (nextIndex < freshFam5.length) {
      const currentAllCards = useStore.getState().selectedCards as any[];
      const nextCard = currentAllCards[nextIndex];
      const botMessage2 = createChatBotMessage(
        `${freshFam5[nextIndex]}${freshJosa5[nextIndex] === 1 ? "은" : "는"
        } ${nextCard?.figure || ""}${nextCard?.josa === 1 ? "이었" : "였"
        }는데, 어떤 동물이 되었으면 좋겠어?`,
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
    const latestFigure = selectedFigures[selectedFigures.length - 1];
    const idx = useStore.getState().currentIndex;
    const family = (useStore.getState().selectedFamily as string[])[idx];
    const familyJosa = (useStore.getState().selectedFamilyJosa as number[])[idx];

    const message1 = createChatBotMessage(
      ` ${latestFigure.figure}${latestFigure.josa === 1 ? "이라고" : "라고"} 고를 것 같구나.`,
      {
        widget: `SelectedCard4Family_${family}`,
      }
    );

    const message = createChatBotMessage(
      `왜 ${family}${familyJosa === 1 ? "이" : "가"} 너를 ${latestFigure.figure}${latestFigure.josa === 1 ? "이라고" : "라고"} 생각할 것 같은지 말해 보자.`
    );

    saveChatMessage("bot", `${latestFigure.figure}${latestFigure.josa === 1 ? "이라고" : "라고"} 고를 것 같구나.`, family);
    saveChatMessage("bot", `왜 ${family}${familyJosa === 1 ? "이" : "가"} 너를 ${latestFigure.figure}${latestFigure.josa === 1 ? "이라고" : "라고"} 생각할 것 같은지 말해 보자.`, family);

    setState((prev: any) => ({
      ...prev,
      messages: [...prev.messages, message1],
    }));
    setTimeout(() => {
      updateState(message, "stage6_1");
    }, 500);
  };

  const afterInitMessage6_1 = async (message: string) => {
    try {
      const idx = useStore.getState().currentIndex;
      const currentCardsNew6 = useStore.getState().selectedCardsNew6 as any[];
      const currentFig = currentCardsNew6[idx] || currentCardsNew6[currentCardsNew6.length - 1];
      if (!currentFig) { showApiError(); return; }
      const family = (useStore.getState().selectedFamily as string[])[idx];

      const figureObj: any = {
        figure: currentFig.figure,
        message: message,
        relation: family,
      };
      if (currentFig.selectedAt) {
        figureObj.selectedAt = currentFig.selectedAt;
      }
      const newFigure = [figureObj];

      const response1 = await fetchFigure({
        kidName: userInfo.kidname,
        receiptNo: `${userInfo.receiptNo}`,
        stage: "6",
        figures: newFigure,
      });
      if (!response1) {
        console.error("API Error: No response received");
      }

      const messageAPIbot = await handleSendAPI(message);
      if (messageAPIbot === null) { showApiError(); return; }

      const botMessage2 = createChatBotMessage(`${messageAPIbot}`);

      countRef.current += 1;
      setCount(countRef.current);
      setTimeout(() => {
        updateState(botMessage2, "stage6_2");
      }, 500);
    } catch (e) {
      console.error("afterInitMessage6_1 error:", e);
      showApiError();
    }
  };

  const afterInitMessage6_2 = async (message: string) => {
    try {
      const messageAPIbot = await handleSendAPI(message);
      if (messageAPIbot === null) { showApiError(); return; }
      const message1 = createChatBotMessage(`${messageAPIbot}`);
      countRef.current += 1;
      setCount(countRef.current);
      setTimeout(() => {
        updateState(message1, "stage6_3");
      }, 500);
    } catch (e) {
      console.error("afterInitMessage6_2 error:", e);
      showApiError();
    }
  };

  const afterInitMessage6_3 = async (message: string) => {
    try {
    const messageAPIbot = await handleSendAPI(message);
    if (messageAPIbot === null) { showApiError(); return; }
    const messagebot = createChatBotMessage(`${messageAPIbot}`);
    const idx = useStore.getState().currentIndex;

    // Find next family member that is NOT the kid
    const freshFam6 = useStore.getState().selectedFamily as string[];
    const freshJosa6 = useStore.getState().selectedFamilyJosa as number[];
    let nextIndex = idx + 1;
    while (nextIndex < freshFam6.length && freshFam6[nextIndex] === userInfo.kidname) {
      nextIndex++;
    }

    if (nextIndex < freshFam6.length) {
      countRef.current = 0;
      setCount(0);
      const botMessage2 = createChatBotMessage(
        `${freshFam6[nextIndex]}${freshJosa6[nextIndex] === 1 ? "은" : "는"
        } 너를 무슨 동물로 고를 것 같니?`,
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
      countRef.current = 0;
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
    } catch (e) {
      console.error("afterInitMessage6_3 error:", e);
      showApiError();
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

    saveChatMessage("user", message, "나");
    saveChatMessage("bot", `그랬구나, ${userInfo.kidname}${userInfo.endWord.eunVSneun} 그렇게 생각했구나.`, "나");

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
    const names = selectedCards.map((c: any) => c.name).join(', ');
    const lastCard = selectedCards[selectedCards.length - 1];
    const josa = lastCard?.josa === 1 ? "을" : "를";
    const botMessage = createChatBotMessage(
      `그랬구나, 그래서 ${userInfo.kidname}${userInfo.endWord.eunVSneun} ${names}${josa} 선택했구나.`
    );

    const botMessage1 = createChatBotMessage(
      `이번에는 ${userInfo.kidname}의 가족들을 동물로 선택해보자.`
    );

    saveChatMessage("user", message, "나(소망)");
    saveChatMessage("bot", `그랬구나, 그래서 ${userInfo.kidname}${userInfo.endWord.eunVSneun} ${names}${josa} 선택했구나.`, "나(소망)");

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
            afterStage1Message,
            afterStage2Message,
          },
        });
      })}
    </div>
  );
};

export default ActionProvider;
