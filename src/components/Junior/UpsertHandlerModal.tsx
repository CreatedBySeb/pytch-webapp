import React, { ChangeEvent, createRef, useEffect, useState } from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import { MaybeErrorOrSuccessReport } from "../MaybeErrorOrSuccessReport";
import {
  ActorKindOps,
  EventDescriptorKind,
  EventDescriptorKindOps,
  StructuredProgramOps,
} from "../../model/junior/structured-program";
import { submitOnEnterKeyFun } from "../../utils";
import { KeyChoiceModal } from "./KeyChoiceModal";
import { useJrEditActions, useJrEditState, useMappedProgram } from "./hooks";
import classNames from "classnames";
import {
  isActive,
  isInteractable,
  isSucceeded,
  maybeLastFailureMessage,
  settleFunctions,
} from "../../model/user-interactions/async-user-flow";
import { asyncFlowModal } from "../async-flow-modals/utils";

// TODO: Is this unduly restrictive?  I think we should end up with a
// valid Python string literal if we forbid the backslash character, the
// newline character (which I'm not sure can even be typed into an input
// field) and both types of quote character.
// https://docs.python.org/3/reference/lexical_analysis.html
const InvalidMessageCharactersRegExp = new RegExp("[^ _a-zA-Z0-9-]", "g");

type EventKindOptionProps = React.PropsWithChildren<{
  chosenKind: EventDescriptorKind;
  kind: EventDescriptorKind;
  onDoubleClick: () => void;
}>;
const EventKindOption: React.FC<EventKindOptionProps> = ({
  chosenKind,
  kind,
  onDoubleClick,
  children,
}) => {
  const setChosenKind = useJrEditActions(
    (a) => a.upsertHatBlockInteraction.setChosenKind
  );

  const chosen = chosenKind === kind;
  const classes = classNames("EventKindOption", { chosen });

  return (
    <li
      className={classes}
      onClick={() => setChosenKind(kind)}
      onDoubleClick={onDoubleClick}
    >
      <div className="bump" />
      {children}
    </li>
  );
};

type KeyEditorProps = {
  displayName: string;
  onEditClick(): void;
};
const KeyEditor: React.FC<KeyEditorProps> = ({ displayName, onEditClick }) => {
  return (
    <div className="KeyEditor">
      <span className="key-button" onClick={onEditClick}>
        <span className="key-display-name">{displayName}</span>
        <span className="dropdown-indicator">▾</span>
      </span>
    </div>
  );
};

export const UpsertHandlerModal = () => {
  const { fsmState, isSubmittable } = useJrEditState(
    (s) => s.upsertHatBlockFlow
  );
  const [showEmptyMessageError, setShowEmptyMessageError] = useState(false);

  // This is a bit clunky.  We have to always use the same hooks, so
  // have to handle the case that this modal is not currently active.
  // Use an arbitrary ActorKind ("sprite") if we're not active (in which
  // case the state's upsertion-descriptor will have a nonsense
  // actorId); it will make no real difference.
  const actorKind = useMappedProgram("UpsertHandlerModal", (program) =>
    isActive(fsmState)
      ? StructuredProgramOps.uniqueActorById(
          program,
          fsmState.runState.operation.actorId
        ).kind
      : "sprite"
  );

  const { setMode, setKeyIfChosen, setMessageIfChosen } = useJrEditActions(
    (a) => a.upsertHatBlockFlow
  );

  const ulRef: React.RefObject<HTMLUListElement> = createRef();

  useEffect(() => {
    if (
      isActive(fsmState) &&
      fsmState.runState.mode === "choosing-hat-block" &&
      ulRef.current != null &&
      EventDescriptorKindOps.arity(fsmState.runState.chosenKind) === 0
    ) {
      ulRef.current.focus();
    }
  }, [fsmState]);

  return asyncFlowModal(fsmState, (activeFsmState) => {
    const { mode, chosenKind, keyIfChosen, messageIfChosen } =
      activeFsmState.runState;
    const settle = settleFunctions(isSubmittable, activeFsmState);

    const maybeAttemptUpsert = () => {
      if (isSubmittable) {
        settle.submit();
      } else {
        setShowEmptyMessageError(true);
      }
    };

    const handleClose = () => {
      settle.cancel();
      setShowEmptyMessageError(false);
    };

    const handleKeyDown = submitOnEnterKeyFun(maybeAttemptUpsert, true);

    const handleMessageChange = (evt: ChangeEvent<HTMLInputElement>) => {
      const rawValue = evt.target.value;
      const value = rawValue.replace(InvalidMessageCharactersRegExp, "");
      setMessageIfChosen(value);
      setShowEmptyMessageError(false);
    };

    const handleEditKeyClick = () => {
      setMode("choosing-key");
    };

    if (mode === "choosing-key") {
      return (
        <KeyChoiceModal
          startingKey={keyIfChosen}
          onCancel={() => setMode("choosing-hat-block")}
          onAccept={(key) => {
            setKeyIfChosen(key);
            setMode("choosing-hat-block");
          }}
        />
      );
    }

    const actorNounPhrase = ActorKindOps.names(actorKind).whenClickedNounPhrase;

    const messageInputClasses = classNames({
      isEmpty: messageIfChosen === "",
      showEmptyMessageError,
    });

    const emptyMessageHintClasses = classNames("empty-message-hint", {
      showEmptyMessageError:
        chosenKind === "message-received" && showEmptyMessageError,
    });

    // Base props for <EventKindOption> instances:
    const ekoProps = { chosenKind, onDoubleClick: settle.submit };

    const mCloneHatBlockOption = actorKind === "sprite" && (
      <EventKindOption {...ekoProps} kind="start-as-clone">
        <div className="content">when I start as a clone</div>
      </EventKindOption>
    );

    return (
      <Modal
        className="UpsertHandlerModal"
        show={isActive(activeFsmState)}
        onHide={handleClose}
        animation={false}
        centered
      >
        <Modal.Header closeButton={isInteractable(activeFsmState)}>
          <Modal.Title>Choose hat block</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <ul tabIndex={-1} onKeyDown={handleKeyDown} ref={ulRef}>
              <EventKindOption {...ekoProps} kind="green-flag">
                <div className="content">when green flag clicked</div>
              </EventKindOption>
              <EventKindOption {...ekoProps} kind="clicked">
                <div className="content">when {actorNounPhrase} clicked</div>
              </EventKindOption>
              {mCloneHatBlockOption}
              <EventKindOption {...ekoProps} kind="key-pressed">
                <div className="content">
                  when{" "}
                  <KeyEditor
                    displayName={keyIfChosen.displayName}
                    onEditClick={handleEditKeyClick}
                  />{" "}
                  key pressed
                </div>
              </EventKindOption>
              <EventKindOption
                chosenKind={chosenKind}
                kind="message-received"
                onDoubleClick={maybeAttemptUpsert}
              >
                <div className="content">
                  when I receive “
                  <Form.Control
                    className={messageInputClasses}
                    type="text"
                    placeholder="message"
                    value={messageIfChosen}
                    onChange={handleMessageChange}
                    // Only select the double-clicked-on word; don't
                    // choose (as if clicking "OK") that hat-block:
                    onDoubleClick={(event) => event.stopPropagation()}
                  ></Form.Control>
                  ”
                </div>
              </EventKindOption>
              <li className={emptyMessageHintClasses}>
                Please provide a message.
              </li>
            </ul>
          </Form>
          <MaybeErrorOrSuccessReport
            messageWhenSuccess={"" /* not used; we skip "succeeded" */}
            attemptSucceeded={isSucceeded(activeFsmState)}
            maybeLastFailureMessage={maybeLastFailureMessage(activeFsmState)}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button
            disabled={!isInteractable}
            variant="secondary"
            onClick={handleClose}
          >
            Cancel
          </Button>
          <Button
            disabled={!isInteractable}
            variant="primary"
            onClick={maybeAttemptUpsert}
          >
            OK
          </Button>
        </Modal.Footer>
      </Modal>
    );
  });
};
