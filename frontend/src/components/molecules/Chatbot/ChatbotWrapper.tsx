import { useEffect, useRef } from "react";
import Chatbot from "react-chatbot-kit";

const ChatbotWrapper = (props: any) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const input = container.querySelector(
      ".react-chatbot-kit-chat-input"
    ) as HTMLInputElement;
    const form = container.querySelector(
      ".react-chatbot-kit-chat-input-form"
    ) as HTMLFormElement;
    if (!input || !form) return;

    // Hide original input
    input.style.position = "absolute";
    input.style.opacity = "0";
    input.style.pointerEvents = "none";
    input.style.height = "0";
    input.style.overflow = "hidden";

    // Create textarea
    const textarea = document.createElement("textarea");
    textarea.className = input.className;
    textarea.placeholder = input.placeholder || "메시지를 입력하세요";
    textarea.rows = 1;
    textarea.style.resize = "none";
    textarea.style.overflow = "hidden";
    textarea.style.width = "100%";
    textarea.style.boxSizing = "border-box";

    // Insert textarea before hidden input
    form.insertBefore(textarea, input);

    const nativeSetter = Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value"
    )?.set;

    // Auto-resize
    const adjustHeight = () => {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 150) + "px";
    };

    // Sync textarea → hidden input
    const handleInput = () => {
      nativeSetter?.call(input, textarea.value);
      input.dispatchEvent(new Event("input", { bubbles: true }));
      adjustHeight();
    };

    // Enter to submit, Shift+Enter for new line
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !e.isComposing && e.keyCode !== 229) {
        e.preventDefault();
        if (textarea.value.trim()) {
          // Sync value first
          nativeSetter?.call(input, textarea.value);
          input.dispatchEvent(new Event("input", { bubbles: true }));

          // Submit
          const submitBtn = form.querySelector(
            ".react-chatbot-kit-chat-btn-send"
          ) as HTMLButtonElement;
          if (submitBtn) submitBtn.click();

          // Clear textarea
          setTimeout(() => {
            textarea.value = "";
            textarea.style.height = "auto";
          }, 50);
        }
      }
    };

    // Watch for input clearing (after bot processes message)
    const observer = new MutationObserver(() => {
      if (input.value === "" && textarea.value !== "") {
        textarea.value = "";
        textarea.style.height = "auto";
      }
    });
    observer.observe(input, { attributes: true, attributeFilter: ["value"] });

    // Also poll for value sync (fallback)
    const interval = setInterval(() => {
      if (input.value === "" && textarea.value !== "") {
        textarea.value = "";
        textarea.style.height = "auto";
      }
    }, 200);

    textarea.addEventListener("input", handleInput);
    textarea.addEventListener("keydown", handleKeyDown);

    return () => {
      textarea.removeEventListener("input", handleInput);
      textarea.removeEventListener("keydown", handleKeyDown);
      observer.disconnect();
      clearInterval(interval);
      textarea.remove();
      input.style.position = "";
      input.style.opacity = "";
      input.style.pointerEvents = "";
      input.style.height = "";
      input.style.overflow = "";
    };
  }, []);

  return (
    <div ref={containerRef}>
      <Chatbot {...props} />
    </div>
  );
};

export default ChatbotWrapper;
