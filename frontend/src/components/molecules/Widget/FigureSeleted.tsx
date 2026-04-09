import { selectedFigures } from "../../../data";

const FigureSelected = (_props: any) => {
  return (
    <div className="react-chatbot-kit-chat-bot-message-container flex gap-2">
      {selectedFigures.map((figure: any, index: number) => {
        return (
          <div key={index} className="flex flex-col items-center rounded-[0.625rem] bg-white shadow-lg p-3">
            <img src={`${import.meta.env.BASE_URL}assets/images/${figure.imageUrl}`} alt="a dog" />
            <p className="text-xl font-bold mb-2">{figure.name}</p>
          </div>
        );
      })}
    </div>
  );
};

export default FigureSelected;
