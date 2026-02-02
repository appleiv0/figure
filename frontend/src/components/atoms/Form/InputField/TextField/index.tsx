import { Controller, FieldValues, Path, UseFormReturn } from "react-hook-form";
import { textInputRules } from "../../../../../utils/validationUtil";
import TextInput from "../TextInput";

// eslint-disable-next-line react-refresh/only-export-components
export default <V extends FieldValues>(props: {
  form: UseFormReturn<V>;
  name: Path<V>;
  id?: string;
  label?: string;
  className?: string;
  placeholder?: string;
  required?: boolean;
  maxLength?: number;
  minLength?: number;
  maxNumber?: number;
  min?: number;
  max?: number;
  step?: number;
  type?: React.HTMLInputTypeAttribute;
  showPassword?: boolean;
  disabled?: boolean;
  pattern?: {
    label: string;
    regax: RegExp;
  };
  validate?: (value: string) => string | undefined;

  searchRef?: any;
}) => {
  const {
    id,
    className,
    placeholder,
    type,
    label,
    min,
    max,
    maxNumber,
    step,
    showPassword,
    disabled,
    searchRef,
  } = props;
  const { form, name } = props;
  const { required, maxLength, minLength, pattern, validate } = props;

  return (
    <Controller
      control={form.control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="relative">
          {/* 모바일: 상단에 라벨 표시, PC: absolute 포지션 */}
          <label
            className={`
              block text-grey-600
              text-xl mb-2 pl-1
              md:absolute md:top-[1.375rem] md:z-10 md:left-6 md:text-3xl md:mb-0 md:pl-0
            `}
          >
            {label}
          </label>

          <TextInput
            className={`
              border-[0.125rem] border-solid rounded-[0.625rem] w-full bg-white relative 
              focus:outline-none focus:shadow-outline focus:border-primary
              text-base px-4 py-3
              md:text-2xl md:px-6 md:py-[1.375rem]
              ${className}
            `}
            id={id}
            placeholder={placeholder}
            type={type}
            {...field}
            disabled={disabled}
            fieldState={fieldState}
            min={min}
            max={max}
            step={step}
            ref={searchRef}
            showPassword={showPassword}
            onChange={(e) => {
              if (type === "number") {
                field.onChange(parseFloat(e.target.value)); // Parse the string to a number
              } else {
                if (maxNumber) {
                  const numericValue = e.target.value.replace(/\D/g, "");
                  const limitedValue = numericValue.slice(0, maxNumber);
                  field.onChange(limitedValue);
                } else {
                  field.onChange(e.target.value);
                }
              }
            }}
            value={field.value ?? ""}
          />
        </div>
      )}
      rules={{
        ...textInputRules({
          name,
          required,
          minLength,
          maxLength,
          pattern,
        }),
        validate,
      }}
    />
  );
};
