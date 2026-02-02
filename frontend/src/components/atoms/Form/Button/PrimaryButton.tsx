/* eslint-disable react-refresh/only-export-components */
import { ButtonHTMLAttributes, DOMAttributes, memo, ReactNode } from "react";
import BaseButton from "./BaseButton";

type Props = {
  props?: ButtonHTMLAttributes<HTMLButtonElement>;
  action?: DOMAttributes<HTMLButtonElement>;
  children?: ReactNode;
  className?: string;
  disabled?: boolean;
  onClick?: () => void;
};

export default memo<Props>(
  ({ props, action, children, className, disabled, onClick }) => {
    return (
      <BaseButton
        action={action}
        className={className}
        disabled={disabled}
        onClick={onClick}
        props={props}
      >
        {children}
      </BaseButton>
    );
  }
);
