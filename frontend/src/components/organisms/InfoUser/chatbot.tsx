import ChatbotWrapper from "../../molecules/Chatbot/ChatbotWrapper";
import "react-chatbot-kit/build/main.css";
import ActionProvider from "../../../components/molecules/Chatbot/ActionProvider";
import MessageParser from "../../../components/molecules/Chatbot/MessageParser";
import createConfig from "../../molecules/Chatbot/Config/config";

const Chat = () => {
  const config = createConfig();
  return (
    <div className="container mx-auto">
      <ChatbotWrapper
        config={config as any}
        actionProvider={ActionProvider}
        messageParser={MessageParser}
        placeholderText="여기를 클릭해 입력하세요."
      />
    </div>
  );
};

export default Chat;
