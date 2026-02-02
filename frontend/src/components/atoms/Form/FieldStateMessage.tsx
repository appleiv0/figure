import React from "react";
import { ControllerFieldState } from "react-hook-form";

type Props = {
  fieldState?: ControllerFieldState;
};
// eslint-disable-next-line react-refresh/only-export-components
export default React.memo<Props>((props) => {
  const { fieldState = null } = props;
  const fieldError = fieldState?.error || null;
  return (
    <>
      {fieldError?.message && (
        <p className="mt-[0.3125rem] text-xs italic text-red">
          {fieldError?.message}
        </p>
      )}
    </>
  );
});
