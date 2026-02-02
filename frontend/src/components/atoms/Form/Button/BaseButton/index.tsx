import { ButtonHTMLAttributes, DOMAttributes, memo, ReactNode } from "react";

type Props = {
  props?: ButtonHTMLAttributes<HTMLButtonElement>;
  action?: DOMAttributes<HTMLButtonElement>;
  className?: string;
  children?: ReactNode;
  onClick?: () => void;
  title?: string;
  disabled?: boolean;
};

// eslint-disable-next-line react-refresh/only-export-components
export default memo<Props>(
  ({ props, action, className, children, onClick, title, disabled }) => {
    let _className = "";

    if (className) {
      _className += " " + className;
    }

    return (
      <button
        className={_className}
        disabled={disabled}
        onClick={onClick}
        title={title}
        type="button"
        {...action}
        {...props}
      >
        {children}
      </button>
    );
  }
);
