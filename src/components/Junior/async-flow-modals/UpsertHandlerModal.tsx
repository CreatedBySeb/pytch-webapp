import React, {
  ChangeEvent,
  KeyboardEventHandler,
  MouseEventHandler,
  useRef,
  useState,
} from "react";
import Alert from "react-bootstrap/Alert";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Tab from "react-bootstrap/Tab";
import Tabs from "react-bootstrap/Tabs";
import microBitIcon from "../../../images/microbit.svg";
import {
  ActorKindOps,
  EventDescriptorKind,
} from "../../../model/junior/structured-program";
import { submitOnEnterKeyFun } from "../../../utils";
import { KeyChoiceModal } from "./KeyChoiceModal";
import { useJrEditActions, useJrEditState } from "../hooks";
import classNames from "classnames";
import {
  isActive,
  isInteractable,
  settleFunctions,
} from "../../../model/user-interactions/async-user-flow";
import { asyncFlowModal } from "../../async-flow-modals/utils";
import { HandlerUpsertionMode } from "../../../model/junior/upsert-hat-block";
import { useFocusContext } from "../../hooks/focus-steering";
import {
  focusGroupNavigationSuppression,
  kFocusGroupContainerClassName,
  kFocusGroupItemClassName,
} from "../../../model/junior/grouped-focus";
import { FocusGroupContainer } from "../../FocusGroupContainer";
import { keyInLayoutLocator } from "../../../model/junior/keyboard-layout";
import { useStoreState } from "../../../store";

// TODO: Is this unduly restrictive?  I think we should end up with a
// valid Python string literal if we forbid the backslash character, the
// newline character (which I'm not sure can even be typed into an input
// field) and both types of quote character.
// https://docs.python.org/3/reference/lexical_analysis.html
const InvalidMessageCharactersRegExp = new RegExp("[^ _a-zA-Z0-9-]", "g");

type EventKindOptionProps = React.PropsWithChildren<{
  chosenKind: EventDescriptorKind;
  className?: string | undefined;
  kind: EventDescriptorKind;
  onDoubleClick: () => void;
}>;
const EventKindOption: React.FC<EventKindOptionProps> = ({
  chosenKind,
  className,
  kind,
  onDoubleClick,
  children,
}) => {
  const focusContext = useFocusContext("per-method");
  const setChosenKind = useJrEditActions(
    (a) => a.upsertHatBlockFlow.setChosenKind
  );

  const chosen = chosenKind === kind;
  const classes = classNames("EventKindOption", kFocusGroupItemClassName, {
    chosen,
  }, className);

  const onClick: MouseEventHandler<HTMLElement> = (ev) => {
    setChosenKind(kind);
    focusContext.onGroupItemClick(ev);
  };

  return (
    <li
      className={classes}
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      data-event-handler-kind={kind}
    >
      <div className="bump" />
      {children}
    </li>
  );
};

type KeyEditorProps = {
  isTabStop: boolean;
  displayName: string;
  onEditClick(): void;
};
const KeyEditor: React.FC<KeyEditorProps> = ({
  isTabStop,
  displayName,
  onEditClick,
}) => {
  const onKeyDown: KeyboardEventHandler = (ev) => {
    if (ev.key === "Enter" || ev.key === " ") {
      onEditClick();
      ev.preventDefault();
      ev.stopPropagation();
    }
  };

  return (
    <div
      className="KeyEditor"
      role="button"
      tabIndex={isTabStop ? 0 : -1}
      onKeyDown={onKeyDown}
      onFocus={focusGroupNavigationSuppression.onFocus}
      onBlur={focusGroupNavigationSuppression.onBlur}
    >
      <span className="key-button" onClick={onEditClick}>
        <span className="key-display-name">{displayName}</span>
        <span className="dropdown-indicator">▾</span>
      </span>
    </div>
  );
};

export const UpsertHandlerModal = () => {
  const focusContext = useFocusContext("per-method");
  const prevMode = useRef<HandlerUpsertionMode | null>(null);
  const activeDevice = useStoreState((state) => state.devices.active);

  const { fsmState, isSubmittable } = useJrEditState(
    (s) => s.upsertHatBlockFlow
  );
  const [showEmptyMessageError, setShowEmptyMessageError] = useState(false);

  const {
    setMode,
    setKeyIfChosen,
    setMessageIfChosen,
    setMicroBitButtonIfChosen,
    setMicroBitGestureIfChosen,
    setMicroBitPinIfChosen,
    setMicroBitSoundIfChosen,
  } = useJrEditActions(
    (a) => a.upsertHatBlockFlow
  );

  const setChosenKind = useJrEditActions(
    (a) => a.upsertHatBlockFlow.setChosenKind
  );

  return asyncFlowModal(fsmState, (activeFsmState) => {
    const {
      mode,
      chosenKind,
      keyIfChosen,
      messageIfChosen,
      microBitPinIfChosen,
      actorKind,
    } = activeFsmState.runState;

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
      if (value !== "") {
        setShowEmptyMessageError(false);
      }
    };

    const handleEditKeyClick = () => {
      setMode("choosing-key");
      const currentChoiceLoc = keyInLayoutLocator(keyIfChosen.browserKeyName);
      focusContext.setBookmark(
        "WhenKeyPressedOptionsList",
        currentChoiceLoc.flatIdx
      );
      focusContext.setPendingGroupFocusKey("WhenKeyPressedOptionsList");
    };

    if (mode === "choosing-key") {
      prevMode.current = mode;
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

    const handleMicroBitButtonChange = (evt: ChangeEvent<HTMLSelectElement>) => {
      setMicroBitButtonIfChosen(evt.target.value);
    };

    const handleMicroBitGestureChange = (evt: ChangeEvent<HTMLSelectElement>) => {
      setMicroBitGestureIfChosen(evt.target.value);
    };

    const handleMicroBitPinChange = (evt: ChangeEvent<HTMLSelectElement>) => {
      setMicroBitPinIfChosen(evt.target.value);
    };

    const handleMicroBitSoundChange = (evt: ChangeEvent<HTMLSelectElement>) => {
      setMicroBitSoundIfChosen(evt.target.value);
    };


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

    const microBitImg = (
      <img
        className="kind-icon"
        alt="micro:bit"
        src={microBitIcon}
        title="micro:bit"
      />
    );

    const microBitHatBlockOptions = [
      <EventKindOption
        {...ekoProps}
        key="button"
        kind="microbit:button"
        className="kind-microbit"
      >
        <div className="content">
          {microBitImg}
          when
          <Form.Select
            aria-label="micro:bit button selection"
            onChange={handleMicroBitButtonChange}
          >
            <option value="a">a</option>
            <option value="b">b</option>
            <option value="logo">logo</option>
          </Form.Select>
          button pressed
        </div>
      </EventKindOption>,
      <EventKindOption
        {...ekoProps}
        key="gesture"
        kind="microbit:gesture"
        className="kind-microbit"
      >
        <div className="content">
          {microBitImg}
          when
          <Form.Select
            aria-label="micro:bit gesture selection"
            onChange={handleMicroBitGestureChange}
          >
            <option value="up">up</option>
            <option value="down">down</option>
            <option value="left">left</option>
            <option value="right">right</option>
            <option value="face up">face up</option>
            <option value="face down">face down</option>
            <option value="shake">shake</option>
            <option value="freefall">freefall</option>
            <option value="3g">3g</option>
            <option value="6g">6g</option>
            <option value="8g">8g</option>
          </Form.Select>
          gesture detected
        </div>
      </EventKindOption>,
      <EventKindOption
        {...ekoProps}
        key="pin_high"
        kind="microbit:pin_high"
        className="kind-microbit"
      >
        <div className="content">
          {microBitImg}
          when pin
          <Form.Select
            aria-label="micro:bit pin selection"
            value={microBitPinIfChosen}
            onChange={handleMicroBitPinChange}
          >
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </Form.Select>
          is high
        </div>
      </EventKindOption>,
      <EventKindOption
        {...ekoProps}
        key="pin_low"
        kind="microbit:pin_low"
        className="kind-microbit"
      >
        <div className="content">
          {microBitImg}
          when pin
          <Form.Select
            aria-label="micro:bit pin selection"
            value={microBitPinIfChosen}
            onChange={handleMicroBitPinChange}
          >
            <option value="0">0</option>
            <option value="1">1</option>
            <option value="2">2</option>
          </Form.Select>
          is high
        </div>
      </EventKindOption>,
      <EventKindOption
        {...ekoProps}
        key="sound"
        kind="microbit:sound"
        className="kind-microbit"
      >
        <div className="content">
          {microBitImg}
          when sound level changes to
          <Form.Select
            aria-label="micro:bit sound level selection"
            onChange={handleMicroBitSoundChange}
          >
            <option value="loud">loud</option>
            <option value="quiet">quiet</option>
          </Form.Select>
        </div>
      </EventKindOption>,
    ];

    const keyPressedOptionDivRefCb = (elt: HTMLDivElement | null) => {
      if (prevMode.current === "choosing-key" && elt != null) {
        const dropdownDivs = elt.getElementsByClassName("KeyEditor");
        const mDropdownDiv = dropdownDivs[0] as HTMLDivElement | null;
        mDropdownDiv?.focus();
        prevMode.current = mode;
      }
    };

    const setChosenFromFocused = (elt: HTMLElement) => {
      const kind = elt.dataset.eventHandlerKind as EventDescriptorKind;
      if (kind == null) {
        console.warn("no kind data attr in", elt);
        return;
      }
      setChosenKind(kind);
    };

    // Disable `restoreFocus` behaviour; we use `onDispose()` to manage
    // ourselves where the focus goes after the modal dialog goes away.
    // See code in `CodeEditor` (for add=insert) and `HatBlock` (for
    // change=update).  Also disable "autoFocus" because we use the
    // grouped-focus mechanism to enqueue a focus request.
    return (
      <Modal
        className="UpsertHandlerModal"
        show={isActive(activeFsmState)}
        onHide={handleClose}
        animation={false}
        autoFocus={false}
        restoreFocus={false}
        centered
      >
        <Modal.Header closeButton={isInteractable(activeFsmState)}>
          <Modal.Title>Choose hat block</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Tabs>
              <Tab eventKey="pytch" title="Pytch">
                <FocusGroupContainer
                  className={kFocusGroupContainerClassName}
                  groupedFocusKey={`UpsertHandlerModal/${actorKind}/pytch`}
                  opts={{
                    onFocusFromKeyboard: setChosenFromFocused,
                    onFocusFromPendingRequest: setChosenFromFocused,
                  }}
                >
                  <ul
                    className="EventKindOptions"
                    tabIndex={-1}
                    onKeyDown={handleKeyDown}
                  >
                    <EventKindOption {...ekoProps} kind="green-flag">
                      <div className="content">when green flag clicked</div>
                    </EventKindOption>
                    <EventKindOption {...ekoProps} kind="clicked">
                      <div className="content">when {actorNounPhrase} clicked</div>
                    </EventKindOption>
                    {mCloneHatBlockOption}
                    <EventKindOption {...ekoProps} kind="key-pressed">
                      <div className="content" ref={keyPressedOptionDivRefCb}>
                        when{" "}
                        <KeyEditor
                          isTabStop={chosenKind === "key-pressed"}
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
                          tabIndex={chosenKind === "message-received" ? 0 : -1}
                          className={messageInputClasses}
                          type="text"
                          placeholder="message"
                          readOnly={chosenKind !== "message-received"}
                          value={messageIfChosen}
                          onChange={handleMessageChange}
                          // Only select the double-clicked-on word; don't
                          // choose (as if clicking "OK") that hat-block:
                          onDoubleClick={(event) => event.stopPropagation()}
                          onFocus={focusGroupNavigationSuppression.onFocus}
                          onBlur={focusGroupNavigationSuppression.onBlur}
                        ></Form.Control>
                        ”
                      </div>
                    </EventKindOption>
                    <li className={emptyMessageHintClasses}>
                      Please provide a message.
                    </li>
                  </ul>
                </FocusGroupContainer>
              </Tab>
              <Tab eventKey="microbit" title="micro:bit">
                <FocusGroupContainer
                  className={kFocusGroupContainerClassName}
                  groupedFocusKey={`UpsertHandlerModal/${actorKind}/microbit`}
                  opts={{
                    onFocusFromKeyboard: setChosenFromFocused,
                    onFocusFromPendingRequest: setChosenFromFocused,
                  }}
                >
                  <ul
                    className="EventKindOptions"
                    tabIndex={-1}
                    onKeyDown={handleKeyDown}
                  >
                    { !activeDevice && (
                      <Alert variant="warning">
                        There is no micro:bit device connected. micro:bit events
                        will not fire until you add a device in the 'Devices'
                        pane.
                      </Alert>
                    ) }
                    { microBitHatBlockOptions }
                  </ul>
                </FocusGroupContainer>
              </Tab>
            </Tabs>
          </Form>
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
