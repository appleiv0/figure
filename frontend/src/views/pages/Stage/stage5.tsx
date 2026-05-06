import { useState, useEffect } from "react";
import { createChatBotMessage } from "react-chatbot-kit";
import { useLocation } from "react-router-dom";
import ChatbotWrapper from "../../../components/molecules/Chatbot/ChatbotWrapper";
import ActionProvider from "../../../components/molecules/Chatbot/ActionProvider";
import MessageParser from "../../../components/molecules/Chatbot/MessageParser";
import Intro from "../../../components/molecules/Intro/Intro";
import ButtonChooseCard from "../../../components/molecules/Widget/ButtonChooseCard";
import ChooseAnimal4Family from "../../../components/molecules/Widget/ChooseAnimal4Family";
import SelectedCard4Family from "../../../components/molecules/Widget/SelectedCard4Family";
import Header from "../../../components/organisms/Header";
import useStore from "../../../store";
import { getItemLocalStorage } from "../../../utils/helper";
import { USER } from "../../../constants/common.constant";

const Stage5 = () => {
  const location = useLocation();
  const [showContent, setShowContent] = useState(false);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const selectedCards = useStore((state: any) => state.selectedCards);
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);
  const setSelectedFamily = useStore((state: any) => state.setSelectedFamily);
  const setSelectedFamilyJosa = useStore((state: any) => state.setSelectedFamilyJosa);
  const setFigure = useStore((state: any) => state.setFigure);
  const userInfo = getItemLocalStorage(USER) || { kidname: '', receiptNo: '' };

  // Restore selectedFamily from backend if empty (session resume case)
  useEffect(() => {
    if (selectedFamily.length === 0 && userInfo.receiptNo) {
      const apiBase = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || '/api';
      fetch(`${apiBase}/admin/sessions/${userInfo.receiptNo}`, {
        headers: { "X-Admin-Key": "change-this-in-production" }
      })
        .then(r => r.json())
        .then(data => {
          const figs3 = data?.session?.figures?.["3"] || [];
          if (figs3.length > 0) {
            const names = figs3.map((f: any) => f.relation).filter((r: string) => r !== '나' && r !== userInfo.kidname);
            setSelectedFamily(names);
            setSelectedFamilyJosa(names.map((name: string) => {
              const last = name.charAt(name.length - 1);
              if (last >= "\uAC00" && last <= "\uD7A3") {
                return (last.charCodeAt(0) - 0xAC00) % 28 > 0 ? 1 : 0;
              }
              return 1;
            }));
          }
        })
        .catch(() => {});
    }
  }, []);

  // figure store에서 stage3 동물 정보 가져오기 (selectedCards가 비었을 때 fallback)
  const figureStore = useStore((state: any) => state.figure) as any[];
  const botName = selectedFamily?.[0] || "";
  const prevFigure = selectedCards?.[0]?.figure
    || figureStore?.find((f: any) => f.relation === selectedFamily?.[0])?.figure
    || "";

  const setCurrentIndex = useStore((state: any) => state.setCurrentIndex);
  const setSelectedCardsNew = useStore((state: any) => state.setSelectedCardsNew);
  const selectedCardsNew = useStore((state: any) => state.selectedCardsNew);
  useEffect(() => {
    if (selectedCardsNew.length === 0) {
      setFigure([]);
      setSelectedCardsNew([]);
      // 이미 완료된 가족 수만큼 currentIndex 설정 (이어하기)
      if (userInfo.receiptNo) {
        const apiBase = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || '/api';
        fetch(`${apiBase}/admin/sessions/${userInfo.receiptNo}`, {
          headers: { "X-Admin-Key": "change-this-in-production" }
        }).then(r => r.json()).then(data => {
          const done = data?.session?.figures?.["5"]?.length || 0;
          setCurrentIndex(done > 0 ? done : 0);
        }).catch(() => setCurrentIndex(0));
      } else {
        setCurrentIndex(0);
      }
    }
  }, []);

  const handleChooseAnimal = () => {
    setShowContent(true);
  };

  const selectedFamilyWidgets = selectedFamily.map(
    (family: any, index: number) => ({
      widgetName: `SelectedCard4Family_${family}`,
      widgetFunc: (props: any) => {
        const currentCardsNew = (useStore.getState() as any).selectedCardsNew;
        return <SelectedCard4Family {...props} selected={currentCardsNew[index]} />;
      },
    })
  );

  const config5 = {
    initialMessages: [
      createChatBotMessage(
        `먼저 ${botName}${
          selectedFamilyJosa[0] === 1 ? "은" : "는"
        } ${prevFigure}${
          selectedCards?.[0]?.josa === 1 ? "이었" : "였"
        }는데, 이번에는 ${botName}${
          selectedFamilyJosa[0] === 1 ? "이" : "가"
        } 어떤 동물이 되었으면 좋겠는지 골라보자.`,
        {
          widget: `ChooseAnimal4Family`,
        }
      ),
    ],
    widgets: [
      {
        widgetName: "ChooseAnimal4Family",
        widgetFunc: (props: any) => <ChooseAnimal4Family {...props} />,
      },
      ...selectedFamilyWidgets,
      {
        widgetName: "ButtonChooseCard",
        widgetFunc: (props: any) => <ButtonChooseCard {...props} />,
      },
    ],
  };

  return (
    <>
      <Header />
      {!showContent && (
        <Intro
          children={
            <>
              다음 화면에서 나오는 동물들 중에서
              <br />
              <span className="text-greenDark">우리 가족이 어떤 동물이었으면 좋겠는지</span> 골라보자.
              <p> </p>
              <br />
              <br />
              <p><span className="text-greenDark">확인 버튼</span>을 누르면 다음 화면으로 이동할 거야.</p>
            </>
          }
          handleChooseAnimal={handleChooseAnimal}
        />
      )}
      {showContent && (
        <>
          <div className="container mx-auto">
            {location.pathname.endsWith("/stage4") && (
              <ChatbotWrapper
                config={config5 as any}
                actionProvider={ActionProvider}
                messageParser={MessageParser}
                placeholderText="여기를 클릭해 입력하세요."
              />
            )}
          </div>
        </>
      )}
    </>
  );
};
export default Stage5;
