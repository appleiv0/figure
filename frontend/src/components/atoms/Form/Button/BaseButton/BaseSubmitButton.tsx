/* eslint-disable react-refresh/only-export-components */
import { memo, ReactNode } from "react";

type Props = {
  className?: string;
  children?: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
};

export default memo<Props>(({ className, children, disabled, onClick }) => {
  return (
    <button
      className={className}
      disabled={disabled}
      onClick={onClick}
      type="button"
      style={{ WebkitTapHighlightColor: "transparent" }}
    >
      {children}
    </button>
  );
});
