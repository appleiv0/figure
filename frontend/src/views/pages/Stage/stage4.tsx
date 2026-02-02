import { useState } from "react";
import Intro4 from "../../../components/molecules/Intro/Intro4";
import Header from "../../../components/organisms/Header";
import FigurePosition from "../../../components/organisms/FigurePosition";

const Stage4 = () => {
  const [activePosition, setActivePosition] = useState<boolean>(false);
  const handleActiveFigurePosition = () => {
    setActivePosition(true);
  };

  return (
    <>
      <Header />
      {!activePosition ? (
        <Intro4 handleActivePosition={handleActiveFigurePosition} />
      ) : (
        <FigurePosition />
      )}
    </>
  );
};

export default Stage4;
