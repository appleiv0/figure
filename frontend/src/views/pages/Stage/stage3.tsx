import Chatbot, { createChatBotMessage } from "react-chatbot-kit";
import ActionProvider from "../../../components/molecules/Chatbot/ActionProvider";
import MessageParser from "../../../components/molecules/Chatbot/MessageParser";
import Intro from "../../../components/molecules/Intro/Intro";
import ButtonChooseCard from "../../../components/molecules/Widget/ButtonChooseCard";
import ChooseAnimal4Family from "../../../components/molecules/Widget/ChooseAnimal4Family";
import SelectedCard4Family from "../../../components/molecules/Widget/SelectedCard4Family";
import Header from "../../../components/organisms/Header";
import useStore from "../../../store";

const Stage3 = () => {
  const chooseAnimal = useStore((state: any) => state.chooseAnimal);
  const setChooseAnimal = useStore((state: any) => state.setChooseAnimal);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);
  const selectedCards = useStore((state: any) => state.selectedCards);
  const botName = selectedFamily[0];

  const handleChooseAnimal = () => {
    setChooseAnimal(true);
  };

  const selectedFamilyWidgets = selectedFamily.map(
    (family: any, index: number) => ({
      widgetName: `SelectedCard4Family_${family}`,
      widgetFunc: (props: any) => (
        <SelectedCard4Family {...props} selected={selectedCards[index]} />
      ),
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
      {!chooseAnimal && (
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
      {chooseAnimal && (
        <>
          <div className="container mx-auto">
            {location.pathname === "/stage3" && (
              <Chatbot
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
