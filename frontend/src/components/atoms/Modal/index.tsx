import React from "react";
import ReactDOM from "react-dom";

type ModalProps = {
  isShowing: boolean;
  children: React.ReactNode;
  hide: () => void;
};

const Modal = ({ isShowing, hide, children }: ModalProps) =>
  isShowing
    ? ReactDOM.createPortal(
        <React.Fragment>
          <div className="modal">
            <div className="modal-body">
              <div className="modal-inner">
                <div className="modal-body-wrap">
                  {children}
                  <button
                    type="button"
                    className="modal-close-button"
                    data-dismiss="modal"
                    aria-label="Close"
                    onClick={hide}
                    style={{
                      display:
                        location.pathname === "/stage2" ? "none" : "block",
                    }}
                  ></button>
                </div>
              </div>
            </div>
          </div>
        </React.Fragment>,
        document.body
      )
    : null;

export default Modal;
