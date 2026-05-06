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

const Stage3 = () => {
  const location = useLocation();
  const [showContent, setShowContent] = useState(false);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);
  const setFigure = useStore((state: any) => state.setFigure);
  const userInfo = getItemLocalStorage(USER) || {};
  const botName = selectedFamily[0];

  const setCurrentIndex = useStore((state: any) => state.setCurrentIndex);
  const setSelectedCards = useStore((state: any) => state.setSelectedCards);
  const selectedCards = useStore((state: any) => state.selectedCards);
  useEffect(() => {
    if (selectedCards.length === 0) {
      setFigure([]);
      setSelectedCards([]);
      // 이미 완료된 가족 수만큼 currentIndex 설정 (이어하기)
      if (userInfo.receiptNo) {
        const apiBase = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || '/api';
        fetch(`${apiBase}/admin/sessions/${userInfo.receiptNo}`, {
          headers: { "X-Admin-Key": "change-this-in-production" }
        }).then(r => r.json()).then(data => {
          const done = data?.session?.figures?.["3"]?.length || 0;
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
        const currentCards = (useStore.getState() as any).selectedCards;
        return <SelectedCard4Family {...props} selected={currentCards[index]} />;
      },
    })
  );

  const config3 = {
    initialMessages: [
      createChatBotMessage(
        // ` 먼저 ${botName}라고 어떤 동물이 되었으면 좋겠는지 골라보자.`,
        ` 먼저 ${botName}${
          selectedFamilyJosa[0] === 1 ? "이라고" : "라고"
        } 생각되는 동물을 선택해보자.`,
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
              <span className="text-greenDark">우리 가족 동물을</span> 골라보자.
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
            {location.pathname.endsWith("/stage3") && (
              <ChatbotWrapper
                config={config3 as any}
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
export default Stage3;
