import useStore from "../../../store";

const SelectedCard = () => {
  const selectedCards = useStore((state: any) => state.selectedCards);

  return (
    <div className="react-chatbot-kit-chat-bot-message-container flex flex-wrap gap-2">
      {selectedCards.map((figure: any) => {
        return (
          <div
            key={figure.index}
            className="flex h-[8rem] w-[7rem] sm:h-[11.25rem] sm:w-[9.5625rem] flex-col items-center justify-center rounded-[0.625rem] bg-white shadow-lg p-3"
          >
            <img className="w-20 sm:w-32" src={figure.img} alt={figure.name} />
            <p className="text-base sm:text-xl font-bold text-center">{figure.name}</p>
          </div>
        );
      })}
    </div>
  );
};

export default SelectedCard;
