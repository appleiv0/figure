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

const Stage3FamilyAnimal = () => {
  const location = useLocation();
  const [showContent, setShowContent] = useState(false);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);
  const setFigure = useStore((state: any) => state.setFigure);
  const userInfo = getItemLocalStorage(USER) || {};

  // Filter out self ("나" or legacy kidname) from the family list for stage3
  const familyForStage3 = selectedFamily.filter((name: string) => name !== '나' && name !== userInfo.kidname);
  const familyJosaForStage3 = selectedFamilyJosa.filter((_: any, i: number) => selectedFamily[i] !== '나' && selectedFamily[i] !== userInfo.kidname);
  const botName = familyForStage3[0];

  const setCurrentIndex = useStore((state: any) => state.setCurrentIndex);
  const setSelectedCards = useStore((state: any) => state.setSelectedCards);
  const selectedCards = useStore((state: any) => state.selectedCards);
  const currentMemberIndex = useStore((state: any) => state.currentMemberIndex);

  useEffect(() => {
    if (selectedCards.length === 0) {
      setFigure([]);
      setSelectedCards([]);
      // store.currentMemberIndex는 Layout의 자동 hydrate에서 백엔드 _infer_progress 결과로 설정됨
      setCurrentIndex(currentMemberIndex || 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChooseAnimal = () => {
    setShowContent(true);
  };

  const selectedFamilyWidgets = familyForStage3.map(
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
          familyJosaForStage3[0] === 1 ? "이라고" : "라고"
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
export default Stage3FamilyAnimal;
