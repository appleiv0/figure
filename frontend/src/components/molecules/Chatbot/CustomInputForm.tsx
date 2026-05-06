import { useState, useRef, useEffect } from "react";

const CustomInputForm = ({ setState: _setState, actionProvider: _actionProvider, messageParser }: any) => {
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const submittingRef = useRef(false);
  const composingRef = useRef(false);

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
    const value = input;
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.value = "";
      textareaRef.current.style.height = "auto";
    }
    messageParser.parse(value);
    // IME 잔여 글자 제거: compositionend 후 onChange가 늦게 발생할 수 있음
    requestAnimationFrame(() => {
      setInput("");
      if (textareaRef.current) textareaRef.current.value = "";
    });
    setTimeout(() => { submittingRef.current = false; }, 1000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // 한글 IME 조합 중 Enter 무시 (keyCode 229 = IME Process key)
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing && e.nativeEvent.keyCode !== 229) {
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
        onChange={(e) => { if (!submittingRef.current) setInput(e.target.value); }}
        onKeyDown={handleKeyDown}
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={() => { setTimeout(() => { composingRef.current = false; }, 100); }}
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
