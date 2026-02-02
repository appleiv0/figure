/* eslint-disable react-refresh/only-export-components */
import React from "react";
import { ControllerFieldState } from "react-hook-form";

type Props = React.DetailedHTMLProps<
  React.InputHTMLAttributes<HTMLInputElement>,
  HTMLInputElement
> & {
  fieldState?: ControllerFieldState;
  type?: React.HTMLInputTypeAttribute;
  showPassword?: boolean;
  disabled?: boolean;
};

export default React.forwardRef<HTMLInputElement, Props>((props, ref) => {
  const {
    fieldState = null,
    type,
    className = "",
    showPassword,
    disabled,
    ...inputProps
  } = props;
  const hasError = fieldState?.error;
  const hasValue =
    inputProps.value && inputProps.value.toString().trim() !== "";
  const borderColor = hasError
    ? "border-red"
    : hasValue
    ? "border-[#2EB500]"
    : "border-white";
  return (
    <input
      ref={ref}
      type={showPassword ? "text" : type}
      {...inputProps}
      className={`${className} ${borderColor}`}
      disabled={disabled}
    />
  );
});
