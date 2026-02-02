import { createChatBotMessage } from "react-chatbot-kit";
import SelectedCard from "../../Widget/SelectedCard";
import ButtonChooseCard from "../../Widget/ButtonChooseCard";
import ChooseFamily from "../../Widget/ChooseFamily";
// import { getItemLocalStorage } from "../../../../utils/helper";
// import { USER } from "../../../../constants/common.constant";
// const userInfo = getItemLocalStorage(USER);

const config2 = {
  initialMessages: [
    // createChatBotMessage(`${userInfo.kidname}${userInfo.endWord.eunVSneun} 이 동물들이 왜 되고 싶을까?`, {
    createChatBotMessage(`이 동물들이 왜 되고 싶을까?`, {
      widget: "SelectedCard2",
    }),
  ],
  widgets: [
    {
      widgetName: "SelectedCard2",
      widgetFunc: (props: any) => <SelectedCard {...props} />,
    },
    {
      widgetName: "ButtonChooseCard",
      widgetFunc: (props: any) => <ButtonChooseCard {...props} />,
    },
    {
      widgetName: "ChooseFamily",
      widgetFunc: (props: any) => <ChooseFamily {...props} />,
    },
  ],
};

export default config2;
