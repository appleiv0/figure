import { useLocation } from "react-router-dom";
import { createChatBotMessage } from "react-chatbot-kit";
import ChatbotWrapper from "../../../components/molecules/Chatbot/ChatbotWrapper";
import ActionProvider from "../../../components/molecules/Chatbot/ActionProvider";
import MessageParser from "../../../components/molecules/Chatbot/MessageParser";
import Intro from "../../../components/molecules/Intro/Intro";
import ButtonChooseCard from "../../../components/molecules/Widget/ButtonChooseCard";
import ChooseAnimal4Family from "../../../components/molecules/Widget/ChooseAnimal4Family";
import SelectedCard4Family from "../../../components/molecules/Widget/SelectedCard4Family";
import Header from "../../../components/organisms/Header";
import useStore from "../../../store";
import ButtonEnd from "../../../components/molecules/Widget/ButtonEnd";
import { getItemLocalStorage } from "../../../utils/helper";
import { USER } from "../../../constants/common.constant";
import { useState, useEffect } from "react";

const Stage6 = () => {
  const location = useLocation();
  const [showContent, setShowContent] = useState(false);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);
  const setCurrentIndex = useStore((state: any) => state.setCurrentIndex);

  const userInfo = getItemLocalStorage(USER) || { kidname: '' };

  // Filter out self from the family list for stage6 ("나" or legacy kidname)
  const familyForStage6 = selectedFamily.filter((name: string) => name !== '나' && name !== '나' && name !== userInfo.kidname);
  const familyJosaForStage6 = selectedFamilyJosa.filter((_: any, i: number) => selectedFamily[i] !== '나' && selectedFamily[i] !== userInfo.kidname);

  const botName = familyForStage6[0] || "";
  const botJosa = familyJosaForStage6[0];

  const setSelectedCardsNew6 = useStore((state: any) => state.setSelectedCardsNew6);
  const selectedCardsNew6 = useStore((state: any) => state.selectedCardsNew6);
  const currentMemberIndex = useStore((state: any) => state.currentMemberIndex);

  useEffect(() => {
    if (selectedCardsNew6.length === 0) {
      setSelectedCardsNew6([]);
      // 본인이 selectedFamily에 섞여 있을 수 있으니 본인 아닌 첫 인덱스 찾고 memberIndex 더함
      const isNonSelf = (name: string) => name !== '나' && name !== userInfo.kidname;
      const firstNonSelfIndex = selectedFamily.findIndex(isNonSelf);
      const baseIndex = firstNonSelfIndex >= 0 ? firstNonSelfIndex : 0;
      setCurrentIndex(baseIndex + (currentMemberIndex || 0));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFamily]);

  const handleChooseAnimal = () => {
    setShowContent(true);
  };

  const selectedFamilyWidgets = familyForStage6.map(
    (family: any, index: number) => ({
      widgetName: `SelectedCard4Family_${family}`,
      widgetFunc: (props: any) => {
        const currentCardsNew6 = (useStore.getState() as any).selectedCardsNew6;
        return <SelectedCard4Family {...props} selected={currentCardsNew6[index]} />;
      },
    })
  );

  const config6 = {
    initialMessages: [
      createChatBotMessage(
        `${botName}${
          botJosa === 1 ? "은" : "는"
        } 너를 무슨 동물로 고를 것 같니?`,
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
      {
        widgetName: "ButtonEnd",
        widgetFunc: (props: any) => <ButtonEnd {...props} />,
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
              <span className="text-greenDark">가족들이 나를 어떤 동물로 생각할지</span> 골라보자.
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
            {location.pathname.endsWith("/stage5") && (
              <ChatbotWrapper
                config={config6 as any}
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
export default Stage6;
