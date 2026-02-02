const SelectedCard4Family = ({ selected }: any) => {
  return (
    <div className="react-chatbot-kit-chat-bot-message-container flex gap-2">
      <div
        key={selected.index}
        className="flex h-[11.25rem] w-[9.5625rem] flex-col items-center justify-center rounded-[0.625rem] bg-white shadow-lg p-3"
      >
        <img className="w-32" src={selected.img} alt={selected.figure} />
        <p className="text-xl font-bold text-center">{selected.figure}</p>
      </div>
    </div>
  );
};

export default SelectedCard4Family;
