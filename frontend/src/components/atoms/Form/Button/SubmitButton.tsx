/* eslint-disable react-refresh/only-export-components */
import { memo, ReactNode } from "react";
import BaseSubmitButton from "./BaseButton/BaseSubmitButton";

type Props = {
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

export default memo<Props>(({ className, children, disabled, onClick }) => {
  return (
    <BaseSubmitButton
      className={className}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </BaseSubmitButton>
  );
});
