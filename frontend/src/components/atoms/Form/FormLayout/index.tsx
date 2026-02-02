import { FormEventHandler, memo, ReactNode } from "react";

type Props = {
  action?: string;
  method?: string;
  name?: string;
  onSubmit?: FormEventHandler<HTMLFormElement>;
  onChange?: FormEventHandler<HTMLFormElement>;
  className?: string;
  children?: ReactNode;
};

const FormLayout = memo<Props>(
  ({ action, method, onSubmit, name, className, children, onChange }) => {
    return (
      <form
        action={action}
        className={className}
        method={method}
        name={name}
        onChange={onChange}
        onSubmit={onSubmit}
      >
        {children}
      </form>
    );
  }
);

export default FormLayout;
