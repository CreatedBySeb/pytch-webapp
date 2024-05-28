import React, { useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { MaybeErrorOrSuccessReport } from "./MaybeErrorOrSuccessReport";
import { CompoundTextInput } from "./CompoundTextInput";
import { FormatSpecifier } from "../model/compound-text-input";
import {
  flowFocusOrBlurFun,
  isInteractable,
  isSucceeded,
  maybeLastFailureMessage,
  settleFunctions,
} from "../model/user-interactions/async-user-flow";
import { asyncFlowModal } from "./async-flow-modals/utils";
import { useFlowActions, useFlowState } from "../model";

export const RenameAssetModal = () => {
  const { fsmState, isSubmittable } = useFlowState((f) => f.renameAssetFlow);
  const { setNewStem } = useFlowActions((f) => f.renameAssetFlow);

  const inputRef: React.RefObject<HTMLInputElement> = React.createRef();
  useEffect(flowFocusOrBlurFun(inputRef, fsmState));

  return asyncFlowModal(fsmState, (activeFsmState) => {
    const { oldStem, fixedSuffix } = activeFsmState.runState;
    const oldBasename = `${oldStem}${fixedSuffix}`;

    const settle = settleFunctions(isSubmittable, activeFsmState);

    const formatSpecifier: FormatSpecifier = [
      {
        kind: "user-input",
        placeholder: "new filename",
        initialValue: oldStem,
      },
      { kind: "literal", value: fixedSuffix },
    ];

    return (
      <Modal show={true} onHide={settle.cancel} animation={false} centered>
        <Modal.Header closeButton={isInteractable(activeFsmState)}>
          <Modal.Title>Rename “{oldBasename}”</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <CompoundTextInput
            formatSpecifier={formatSpecifier}
            onNewUiFragmentValue={setNewStem}
            onEnterKey={settle.submit}
            ref={inputRef}
          />
          <MaybeErrorOrSuccessReport
            messageWhenSuccess="Renamed!"
            attemptSucceeded={isSucceeded(activeFsmState)}
            maybeLastFailureMessage={maybeLastFailureMessage(activeFsmState)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            disabled={!isInteractable}
            variant="secondary"
            onClick={settle.cancel}
          >
            Cancel
          </Button>
          <Button
            disabled={!isSubmittable}
            variant="primary"
            onClick={settle.submit}
          >
            Rename
          </Button>
        </Modal.Footer>
      </Modal>
    );
  });
};
