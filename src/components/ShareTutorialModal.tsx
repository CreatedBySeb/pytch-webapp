import React from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import {
  sharingUrlFromSlug,
  sharingUrlFromSlugForDemo,
} from "../model/user-interactions/share-tutorial";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { copyTextToClipboard } from "../utils";
import { asyncFlowModal } from "./async-flow-modals/utils";
import { settleFunctions } from "../model/user-interactions/async-user-flow";
import { useFlowState } from "../model";

export const ShareTutorialModal = () => {
  const { fsmState, isSubmittable } = useFlowState((f) => f.shareTutorialFlow);

  return asyncFlowModal(fsmState, (activeFsmState) => {
  const info = activeFsmState.runState;
  const settle = settleFunctions(isSubmittable, activeFsmState);

  return (
    <Modal
      className="ShareTutorial"
      size="lg"
      show={true}
      onHide={settle.cancel}
      animation={false}
      centered
    >
      <Modal.Header>
        <Modal.Title>
          Share project “<strong>{info.displayName}</strong>”
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>
          Copy the link to share the project only with the{" "}
          <strong>tutorial</strong> button:
        </p>

        <div className="CopyLinkDiv">
          <Button
            title="Copy link to tutorial only"
            className="copy-button"
            variant="outline-success"
            onClick={() => {
              copyTextToClipboard(sharingUrlFromSlug(info.slug));
            }}
          >
            Copy
            <FontAwesomeIcon
              style={{ marginLeft: "10px" }}
              className="fa-lg"
              icon="copy"
            />
          </Button>
          <label>{sharingUrlFromSlug(info.slug)}</label>
        </div>
        <p>
          Copy the link to share the project with the{" "}
          <strong>tutorial and demo</strong> buttons:
        </p>
        <div className="CopyLinkDiv">
          <Button
            title="Copy link to tutorial and demo"
            className="copy-button"
            variant="outline-success"
            onClick={() => {
              copyTextToClipboard(sharingUrlFromSlugForDemo(info.slug));
            }}
          >
            Copy
            <FontAwesomeIcon
              style={{ marginLeft: "10px" }}
              className="fa-lg"
              icon="copy"
            />
          </Button>
          <label>{sharingUrlFromSlugForDemo(info.slug)}</label>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="primary" onClick={settle.cancel}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
  });
};
