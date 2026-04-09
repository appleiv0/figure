import { useState, useRef, useEffect } from "react";

const CustomInputForm = ({ setState: _setState, actionProvider: _actionProvider, messageParser }: any) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);

  const adjustHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
    }
  };

  useEffect(() => {
    adjustHeight();
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || submittingRef.current) return;
    submittingRef.current = true;
    messageParser.parse(input);
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
    setTimeout(() => { submittingRef.current = false; }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  return (
    <form
      className="react-chatbot-kit-chat-input-form"
      onSubmit={handleSubmit}
    >
      <textarea
        ref={textareaRef}
        className="react-chatbot-kit-chat-input"
        placeholder="메시지를 입력하세요"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        rows={1}
        style={{ resize: "none", overflow: "hidden" }}
      />
      <button
        type="submit"
        className={`react-chatbot-kit-chat-btn-send ${!input.trim() ? "disabled" : ""}`}
      >
        <svg />
      </button>
    </form>
  );
};

export default CustomInputForm;
