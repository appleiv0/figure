import Chatbot from "react-chatbot-kit";
import "react-chatbot-kit/build/main.css";
import ActionProvider from "../../../components/molecules/Chatbot/ActionProvider";
import MessageParser from "../../../components/molecules/Chatbot/MessageParser";
import config from "../../molecules/Chatbot/Config/config";

const Chat = () => {
  return (
    <div className="container mx-auto">
      <Chatbot
        config={config as any}
        actionProvider={ActionProvider}
        messageParser={MessageParser}
        placeholderText="여기를 클릭해 입력하세요."
      />
    </div>
  );
};

export default Chat;
