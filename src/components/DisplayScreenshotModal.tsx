import React, { useEffect } from "react";
import Button from "react-bootstrap/Button";
import Modal from "react-bootstrap/Modal";
import { stageWidth, stageHeight } from "../constants";
import { failIfNull } from "../utils";
import {
  isActive,
  settleFunctions,
} from "../model/user-interactions/async-user-flow";
import { asyncFlowModal } from "./async-flow-modals/utils";
import { useFlowState } from "../model";

export const DisplayScreenshotModal = () => {
  const { fsmState, isSubmittable } = useFlowState(
    (f) => f.displayScreenshotFlow
  );

  const imgRef: React.RefObject<HTMLImageElement> = React.createRef();
  useEffect(() => {
    if (isActive(fsmState)) {
      const img = failIfNull(imgRef.current, "imgRef is null");
      const canvas = failIfNull(
        document.getElementById("pytch-canvas") as HTMLCanvasElement | null,
        "could not find canvas element"
      );
      img.src = canvas.toDataURL();
    }
  });

  return asyncFlowModal(fsmState, (activeFsmState) => {
  const settle = settleFunctions(isSubmittable, activeFsmState);
  return (
    <Modal
      className="DisplayScreenshot"
      size="lg"
      show={isActive(activeFsmState)}
      onHide={settle.cancel}
      animation={false}
      centered
    >
      <Modal.Header>
        <Modal.Title>Screenshot</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>Right-click on the image to copy or save:</p>
        <img
          ref={imgRef}
          width={stageWidth}
          height={stageHeight}
          alt="snapshot of stage"
        ></img>
      </Modal.Body>{" "}
      <Modal.Footer>
        <Button variant="primary" onClick={settle.cancel}>
          OK
        </Button>
      </Modal.Footer>
    </Modal>
  );
  });
};
