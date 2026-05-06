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
  const setSelectedFamily = useStore((state: any) => state.setSelectedFamily);
  const setSelectedFamilyJosa = useStore((state: any) => state.setSelectedFamilyJosa);

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

  // Filter out self from the family list for stage6 ("나" or legacy kidname)
  const familyForStage6 = selectedFamily.filter((name: string) => name !== '나' && name !== '나' && name !== userInfo.kidname);
  const familyJosaForStage6 = selectedFamilyJosa.filter((_: any, i: number) => selectedFamily[i] !== '나' && selectedFamily[i] !== userInfo.kidname);

  const botName = familyForStage6[0] || "";
  const botJosa = familyJosaForStage6[0];

  const setSelectedCardsNew6 = useStore((state: any) => state.setSelectedCardsNew6);
  const selectedCardsNew6 = useStore((state: any) => state.selectedCardsNew6);
  useEffect(() => {
    if (selectedCardsNew6.length === 0) {
      setSelectedCardsNew6([]);
      // 이미 완료된 가족 수만큼 currentIndex 설정 (이어하기)
      if (userInfo.receiptNo) {
        const apiBase = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || '/api';
        fetch(`${apiBase}/admin/sessions/${userInfo.receiptNo}`, {
          headers: { "X-Admin-Key": "change-this-in-production" }
        }).then(r => r.json()).then(data => {
          const done = data?.session?.figures?.["6"]?.length || 0;
          if (done > 0) {
            // 완료된 수 + 본인 인덱스 보정
            const firstNonKidIndex = selectedFamily.findIndex((name: string) => name !== '나' && name !== userInfo.kidname);
            setCurrentIndex(firstNonKidIndex >= 0 ? firstNonKidIndex + done : done);
          } else {
            const firstNonKidIndex = selectedFamily.findIndex((name: string) => name !== '나' && name !== userInfo.kidname);
            setCurrentIndex(firstNonKidIndex >= 0 ? firstNonKidIndex : 0);
          }
        }).catch(() => {
          const firstNonKidIndex = selectedFamily.findIndex((name: string) => name !== '나' && name !== userInfo.kidname);
          setCurrentIndex(firstNonKidIndex >= 0 ? firstNonKidIndex : 0);
        });
      } else {
        const firstNonKidIndex = selectedFamily.findIndex((name: string) => name !== '나' && name !== userInfo.kidname);
        setCurrentIndex(firstNonKidIndex >= 0 ? firstNonKidIndex : 0);
      }
    }
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
