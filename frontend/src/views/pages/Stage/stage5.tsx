import Chatbot, { createChatBotMessage } from "react-chatbot-kit";
import ActionProvider from "../../../components/molecules/Chatbot/ActionProvider";
import MessageParser from "../../../components/molecules/Chatbot/MessageParser";
import Intro from "../../../components/molecules/Intro/Intro";
import ButtonChooseCard from "../../../components/molecules/Widget/ButtonChooseCard";
import ChooseAnimal4Family from "../../../components/molecules/Widget/ChooseAnimal4Family";
import SelectedCard4Family from "../../../components/molecules/Widget/SelectedCard4Family";
import Header from "../../../components/organisms/Header";
import useStore from "../../../store";

const Stage5 = () => {
  const chooseAnimal = useStore((state: any) => state.chooseAnimal);
  const setChooseAnimal = useStore((state: any) => state.setChooseAnimal);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const selectedCards = useStore((state: any) => state.selectedCards);
  const selectedCardsNew = useStore((state: any) => state.selectedCardsNew);
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);

  const botName = selectedFamily[0];
  const prevFigure = selectedCards[0].figure;

  const handleChooseAnimal = () => {
    setChooseAnimal(false);
  };

  const selectedFamilyWidgets = selectedFamily.map(
    (family: any, index: number) => ({
      widgetName: `SelectedCard4Family_${family}`,
      widgetFunc: (props: any) => (
        <SelectedCard4Family {...props} selected={selectedCardsNew[index]} />
      ),
    })
  );

  const config5 = {
    initialMessages: [
      createChatBotMessage(
        `먼저 ${botName}${
          selectedFamilyJosa[0] === 1 ? "은" : "는"
        } ${prevFigure}${
          selectedCards[0].josa === 1 ? "이었" : "였"
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
      {chooseAnimal && (
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
      {!chooseAnimal && (
        <>
          <div className="container mx-auto">
            {location.pathname === "/stage5" && (
              <Chatbot
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
