import Chatbot, { createChatBotMessage } from "react-chatbot-kit";
import ActionProvider from "../../../components/molecules/Chatbot/ActionProvider";
import MessageParser from "../../../components/molecules/Chatbot/MessageParser";
import ButtonChooseCard from "../../../components/molecules/Widget/ButtonChooseCard";
import SelectedCard from "../../../components/molecules/Widget/SelectedCard";
import Header from "../../../components/organisms/Header";
import { USER } from "../../../constants/common.constant";
import { getItemLocalStorage } from "../../../utils/helper";

const Stage0 = () => {
  const userInfo = getItemLocalStorage(USER);

  const config = {
    initialMessages: [
      createChatBotMessage(`안녕? 내 이름은 푸름이야.`, {}),
      createChatBotMessage(
        `나는 ${userInfo?.kidname}${userInfo?.endWord.kwaVSwa} 함께 동물들을 가지고 ${userInfo?.kidname}의 이야기를 들어보려고 해.`,
        { widget: "ButtonChooseCard" }
      ),
    ],
    widgets: [
      {
        widgetName: "SelectedCard",
        widgetFunc: (props: any) => <SelectedCard {...props} />,
      },
      {
        widgetName: "ButtonChooseCard",
        widgetFunc: (props: any) => <ButtonChooseCard {...props} />,
      },
    ],
  };

  return (
    <>
      <Header />
      <div className="container mx-auto">
        <Chatbot
          config={config as any}
          actionProvider={ActionProvider}
          messageParser={MessageParser}
          placeholderText="여기를 클릭해 입력하세요."
        />
      </div>
    </>
  );
};
export default Stage0;
