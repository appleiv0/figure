import { selectedFigures } from "../../../data";

const FigureSelected = (props: any) => {
  const { state } = props;
  console.log(state.text);

  return (
    <div className="react-chatbot-kit-chat-bot-message-container flex gap-2">
      {selectedFigures.map((figure: any) => {
        return (
          <div className="flex flex-col items-center rounded-[0.625rem] bg-white shadow-lg p-3">
            <img src={`/assets/images/` + figure.imageUrl} alt="a dog" />
            <p className="text-xl font-bold mb-2">{figure.name}</p>
          </div>
        );
      })}
    </div>
  );
};

export default FigureSelected;
