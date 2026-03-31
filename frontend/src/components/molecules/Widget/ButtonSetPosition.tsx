import { useNavigate, useLocation } from "react-router-dom";
import Icon from "../../atoms/Icon";
import useStore from "../../../store";

const ButtonStart = () => {
  const navigator = useNavigate();
  const location = useLocation();
  const setSelectedCards = useStore((state: any) => state.setSelectedCards);

  const handleNext = () => {
    if (location.pathname === "/" || location.pathname.endsWith("/family") || location.pathname.endsWith("/family/")) {
      navigator("/stage1");
      setSelectedCards([]);
    } else if (location.pathname.endsWith("/stage1")) {
      navigator("/stage2");
      setSelectedCards([]);
    } else if (location.pathname.endsWith("/stage3")) {
      navigator("/stage6");
    }
  };

  return (
    <>
      <div className="react-chatbot-kit-chat-bot-message-container flex gap-2">
        <button
          className="text-2xl font-bold ml-auto flex gap-2 items-center border border-primary bg-primary hover:bg-grey-100 hover:text-greenDark text-white px-3 py-4 rounded-md"
          onClick={() => handleNext()}
        >
          가족 선택하러 가기
          <Icon icon="arrowRight" width={24} height={24} className="max-w-6" />
        </button>
      </div>
    </>
  );
};

export default ButtonStart;
