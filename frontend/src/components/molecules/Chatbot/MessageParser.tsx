import React from "react";
import useStore from "../../../store";

const MessageParser = ({ children, actions }: any) => {
  const { checker } = children.props.state;
  const parse = (message: any) => {
    if (checker === "first") {
      // IMPORTANT: capture idx BEFORE afterInitMessage which increments currentIndex
      const preState = useStore.getState() as any;
      const idx = preState.currentIndex;
      const cards = preState.selectedCards;
      const card = cards[idx] || cards[cards.length - 1];
      const family = preState.selectedFamily[idx];
      actions.afterInitMessage(message);
      if (card) {
        const postState = useStore.getState() as any;
        const newFigure: any = {
          figure: card.figure,
          message: message,
          relation: family,
        };
        if (card.selectedAt) {
          newFigure.selectedAt = card.selectedAt;
        }
        postState.setFigure([...postState.figure, newFigure]);
      }
    }
    if (checker === "second") {
      // IMPORTANT: capture idx BEFORE afterInitMessage5 which increments currentIndex
      const preState = useStore.getState() as any;
      const idx = preState.currentIndex;
      const cards = preState.selectedCardsNew;
      const card = cards[idx] || cards[cards.length - 1];
      const family = preState.selectedFamily[idx];
      actions.afterInitMessage5(message);
      if (card) {
        const postState = useStore.getState() as any;
        const newFigure: any = {
          figure: card.figure,
          message: message,
          relation: family,
        };
        if (card.selectedAt) {
          newFigure.selectedAt = card.selectedAt;
        }
        postState.setFigure([...postState.figure, newFigure]);
      }
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
