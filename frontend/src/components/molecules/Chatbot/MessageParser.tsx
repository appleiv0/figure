import React from "react";
import useStore from "../../../store";

const MessageParser = ({ children, actions }: any) => {
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const selectedCards = useStore((state: any) => state.selectedCards);
  const selectedCardsNew = useStore((state: any) => state.selectedCardsNew);
  const setFigure = useStore((state: any) => state.setFigure);
  const figure = useStore((state: any) => state.figure);
  const currentIndex = useStore((state: any) => state.currentIndex);

  const { checker } = children.props.state;
  const parse = (message: any) => {
    if (checker === "first") {
      actions.afterInitMessage(message);
      const newFigure = {
        figure: selectedCards[currentIndex].figure,
        message: message,
        relation: selectedFamily[currentIndex],
      };
      setFigure([...figure, newFigure]);
    }
    if (checker === "second") {
      actions.afterInitMessage5(message);
      const newFigure = {
        figure: selectedCardsNew[currentIndex].figure,
        message: message,
        relation: selectedFamily[currentIndex],
      };
      setFigure([...figure, newFigure]);
    }
    if (checker === "stage6_1") {
      actions.afterInitMessage6_1(message);
    }
    if (checker === "stage6_2") {
      actions.afterInitMessage6_2(message);
    }
    if (checker === "stage6_3") {
      actions.afterInitMessage6_3(message);
    }
    if (checker === "stage1") {
      actions.afterStage1Message(message);
    }
    if (checker === "stage2_wish") {
      actions.afterStage2Message(message);
    }
    if (children.props.state.messages[1]?.widget === "SelectedCard") {
      actions.handleConfirmSelectCard(message);
    }
    if (children.props.state.messages[0]?.widget === "SelectedCard2") {
      actions.handleConfirmSelectCard2(message);
    }
  };

  return (
    <div>
      {React.Children.map(children, (child) => {
        return React.cloneElement(child, {
          parse: parse,
          actions,
        });
      })}
    </div>
  );
};

export default MessageParser;
