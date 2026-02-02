import { ValidationRule } from "react-hook-form";

export const Regax = {
  number: /^[+-]?\d+$/,
  amount: /^-?[0-9,]+$/,
  phone: /^[0-9]{1,4}-[0-9]{1,4}-[0-9]{3,4}$/,
  postCode: /^[0-9]{3}-?[0-9]{4}$/,
  email: /^\S+@\S+$/i,
  password: /^(?=.*[A-Z])(?=.*[.?/-])[a-zA-Z0-9.?/-]/,
};

export function textInputRules(props: {
  name?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  pattern?: {
    label: string;
    regax: RegExp;
  };
}): {
  required: ValidationRule<boolean> | undefined;
  maxLength: ValidationRule<number> | undefined;
  minLength: ValidationRule<number> | undefined;
  pattern: ValidationRule<RegExp> | undefined;
} {
  const required = props.required
    ? {
        value: true,
        message: `Please input ${props.name ? props.name : "value"}`,
      }
    : undefined;

  const maxLength =
    props.maxLength !== undefined
      ? {
          value: props.maxLength,
          message: `Vui lòng nhập không quá ${props.maxLength} ký tự`,
        }
      : undefined;

  const minLength =
    props.minLength !== undefined
      ? {
          value: props.minLength,
          message: `Vui lòng nhập nhiều hơn ${props.minLength} ký tự`,
        }
      : undefined;

  const pattern =
    props.pattern !== undefined
      ? {
          value: props.pattern.regax,
          message: `${props.pattern.label} chưa đúng`,
        }
      : undefined;
  return {
    required,
    maxLength,
    minLength,
    pattern,
  };
}
