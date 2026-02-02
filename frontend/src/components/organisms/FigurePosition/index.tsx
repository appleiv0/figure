import { useState } from "react";
import Chatbot, { createChatBotMessage } from "react-chatbot-kit";
import CanvasDrag from "../../molecules/CanvasDrag";
import ActionProvider from "../../molecules/Chatbot/ActionProvider";
import MessageParser from "../../molecules/Chatbot/MessageParser";
import ButtonChooseCard from "../../molecules/Widget/ButtonChooseCard";
import { getItemLocalStorage } from "../../../utils/helper";
import { USER } from "../../../constants/common.constant";

const FigurePosition = () => {
  const [activeChat, setActiveChat] = useState(false);
  const [messageApi, setMessageApi] = useState<string>("");
  // const selectedCards = useStore((state: any) => state.selectedCards);

  const handleActiveChat = (message: string) => {
    setMessageApi(message);
    setActiveChat(true);
  };

  const userInfo = getItemLocalStorage(USER);
  // const lastElement = selectedCards[selectedCards.length - 1];

  const config = {
    initialMessages: [
      messageApi && createChatBotMessage(`${messageApi}`, {}),
      createChatBotMessage(`이번엔 우리 가족이 어떤 동물이었으면 좋겠는지`, {}),
      createChatBotMessage(
        `${userInfo.kidname}${userInfo.endWord.liVSka} 바라는 동물들로 바꾸어보자.`,
        {
          widget: "ButtonChooseCard",
        }
      ),
    ],
    widgets: [
      {
        widgetName: "ButtonChooseCard",
        widgetFunc: (props: any) => <ButtonChooseCard {...props} />,
      },
    ],
  };

  return (
    <div>
      {!activeChat ? (
        <>
          <div className="max-w-[55rem] mx-auto mb-8">
            <div className="flex gap-2 items-start">
              <img src="./assets/images/img_avt_bot.png" alt="img-avt" />
              <div className="px-5 py-3 text-2xl font-bold rounded-[0.625rem] bg-yellow-200 max-w-[35rem]">
                이번에는 동물 중에서 누구 누구가 서로 친한지
                <br /> 친한 동물들끼리 가까이 옮겨보자.
              </div>
            </div>
          </div>
          <CanvasDrag handleActiveChat={handleActiveChat} />
        </>
      ) : (
        <div className="container mx-auto">
          <Chatbot
            config={config as any}
            actionProvider={ActionProvider}
            messageParser={MessageParser}
            placeholderText="여기를 클릭해 입력하세요."
          />
        </div>
      )}
    </div>
  );
};

export default FigurePosition;
