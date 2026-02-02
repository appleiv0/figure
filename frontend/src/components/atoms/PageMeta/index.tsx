import { useEffect } from "react";

type Props = {
  title?: string;
};
const PageMeta = (props: Props) => {
  const { title } = props;
  const pTitle = title ? `${title} | ` : "";
  useEffect(() => {
    document.title = `${pTitle} | Figure Therapy`;
  }, [pTitle]);
  return null;
};

export default PageMeta;
