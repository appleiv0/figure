import { createChatBotMessage } from "react-chatbot-kit";
import SelectedCard from "../../Widget/SelectedCard";
import ButtonChooseCard from "../../Widget/ButtonChooseCard";

const config = {
  initialMessages: [
    createChatBotMessage(`이 동물들이 왜 나라고 생각했어?`, {}),
    createChatBotMessage(`어떤 부분이 나랑 닮았다고 생각이 들었는지 궁금해.`, {
      widget: "SelectedCard",
    }),
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

export default config;
