import { createChatBotMessage } from "react-chatbot-kit";
import SelectedCard from "../../Widget/SelectedCard";
import ButtonChooseCard from "../../Widget/ButtonChooseCard";
import { getItemLocalStorage } from "../../../../utils/helper";
import { USER } from "../../../../constants/common.constant";
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
  validator: (input: string) => {
    return input.trim().length > 0;
  },
};
export default config;
