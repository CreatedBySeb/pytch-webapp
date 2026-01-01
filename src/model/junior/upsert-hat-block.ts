import { Action } from "easy-peasy";
import { assertNever } from "../../utils";
import { IPytchAppModel, PytchAppModelActions } from "../../model";
import {
  asyncUserFlowSlice,
  AsyncUserFlowSlice,
  AttemptOutcome,
  setRunStateProp,
} from "../user-interactions/async-user-flow";
import { EventDescriptorKind } from "./structured-program/event";
import { HandlerUpsertionOperation } from "./structured-program/program";
import { descriptorFromBrowserKeyName, KeyDescriptor } from "./keyboard-layout";
import { ActorKind, HandlerInActorContext } from "./structured-program";

export type HandlerUpsertionMode = "choosing-hat-block" | "choosing-key";

const kSpaceKeyDescriptor = descriptorFromBrowserKeyName(" ");
const kDefaultWhenIReceiveMessage = "message-1";
const kDefaultMicroBitButton = "a";
const kDefaultMicroBitGesture = "up";
const kDefaultMicroBitPin = "0";
const kDefaultMicroBitSound = "loud";

type UpsertHatBlockRunArgs = {
  operation: HandlerUpsertionOperation;
  actorKind: ActorKind;
};

type UpsertHatBlockRunState = {
  operation: HandlerUpsertionOperation;
  actorKind: ActorKind;
  mode: HandlerUpsertionMode;
  chosenKind: EventDescriptorKind;
  keyIfChosen: KeyDescriptor;
  messageIfChosen: string;
  microBitButtonIfChosen: string;
  microBitGestureIfChosen: string;
  microBitPinIfChosen: string;
  microBitSoundIfChosen: string;
};

type UpsertHatBlockOutcomeNub = {
  handler: HandlerInActorContext;
};

type UpsertHatBlockOutcome = AttemptOutcome<UpsertHatBlockOutcomeNub>;

type UpsertHatBlockBase = AsyncUserFlowSlice<
  IPytchAppModel,
  UpsertHatBlockRunArgs,
  UpsertHatBlockRunState,
  UpsertHatBlockOutcomeNub
>;

type SAction<ArgT> = Action<UpsertHatBlockBase, ArgT>;

type UpsertHatBlockActions = {
  setMode: SAction<HandlerUpsertionMode>;
  setChosenKind: SAction<EventDescriptorKind>;
  setKeyIfChosen: SAction<KeyDescriptor>;
  setMessageIfChosen: SAction<string>;
  setMicroBitButtonIfChosen: SAction<string>;
  setMicroBitGestureIfChosen: SAction<string>;
  setMicroBitPinIfChosen: SAction<string>;
  setMicroBitSoundIfChosen: SAction<string>;
};

export type UpsertHatBlockFlow = UpsertHatBlockBase & UpsertHatBlockActions;

async function prepare(
  args: UpsertHatBlockRunArgs
): Promise<UpsertHatBlockRunState> {
  const { operation, actorKind } = args;

  // Ensure sensible starting values; these will be overwritten in the
  // case of an update to an existing key-pressed or message-received
  // hat-block.
  let keyIfChosen = kSpaceKeyDescriptor;
  let messageIfChosen = kDefaultWhenIReceiveMessage;
  let microBitButtonIfChosen = kDefaultMicroBitButton;
  let microBitGestureIfChosen = kDefaultMicroBitGesture;
  let microBitPinIfChosen = kDefaultMicroBitPin;
  let microBitSoundIfChosen = kDefaultMicroBitSound;

  let chosenKind: EventDescriptorKind = "green-flag";

  switch (operation.action.kind) {
    case "insert":
      // Default chosenKind is correct.
      break;
    case "update": {
      // Set starting kind and (if relevant) "key" and "message"
      // values to the existing event handler.
      const prevEvent = operation.action.previousEvent;
      const prevKind = prevEvent.kind;
      chosenKind = prevKind;
      switch (prevKind) {
        case "green-flag":
        case "clicked":
        case "start-as-clone":
          // Nothing further required.
          break;

        case "key-pressed": {
          const descr = descriptorFromBrowserKeyName(prevEvent.keyName);
          keyIfChosen = descr;
          break;
        }

        case "message-received":
          messageIfChosen = prevEvent.message;
          break;

        case "microbit:button":
          microBitButtonIfChosen = prevEvent.button;
          break;

        case "microbit:gesture":
          microBitGestureIfChosen = prevEvent.gesture;
          break;

        case "microbit:pin_high":
        case "microbit:pin_low":
          microBitPinIfChosen = prevEvent.pin;
          break;

        case "microbit:sound":
          microBitSoundIfChosen = prevEvent.level;
          break;

        default:
          assertNever(prevKind);
      }
      break;
    }
    default:
      assertNever(operation.action);
  }

  return {
    operation,
    actorKind,
    mode: "choosing-hat-block",
    chosenKind,
    keyIfChosen,
    messageIfChosen,
    microBitButtonIfChosen,
    microBitGestureIfChosen,
    microBitPinIfChosen,
    microBitSoundIfChosen,
  };
}

function isSubmittable(runState: UpsertHatBlockRunState): boolean {
  switch (runState.chosenKind) {
    case "green-flag":
    case "clicked":
    case "start-as-clone":
    case "key-pressed":
    case "microbit:button":
    case "microbit:gesture":
    case "microbit:pin_high":
    case "microbit:pin_low":
    case "microbit:sound":
      return true;

    case "message-received":
      return runState.messageIfChosen !== "";

    default:
      return assertNever(runState.chosenKind);
  }
}

async function attempt(
  runState: UpsertHatBlockRunState,
  actions: PytchAppModelActions
): Promise<UpsertHatBlockOutcome> {
  const eventDescriptor = (() => {
    switch (runState.chosenKind) {
      case "green-flag":
      case "clicked":
      case "start-as-clone":
        return { kind: runState.chosenKind };

      case "key-pressed":
        return {
          kind: runState.chosenKind,
          keyName: runState.keyIfChosen.browserKeyName,
        };

      case "message-received":
        return {
          kind: runState.chosenKind,
          message: runState.messageIfChosen,
        };

      case "microbit:button":
        return {
          kind: runState.chosenKind,
          button: runState.microBitButtonIfChosen,
        };

      case "microbit:gesture":
        return {
          kind: runState.chosenKind,
          gesture: runState.microBitGestureIfChosen,
        };

      case "microbit:pin_high":
      case "microbit:pin_low":
        return {
          kind: runState.chosenKind,
          pin: runState.microBitPinIfChosen
        };

      case "microbit:sound":
        return {
          kind: runState.chosenKind,
          level: runState.microBitSoundIfChosen
        };

      default:
        return assertNever(runState.chosenKind);
    }
  })();

  const upsertionDescriptor = { ...runState.operation, eventDescriptor };

  // This action is sync.
  const handler = actions.activeProject.upsertHandler(upsertionDescriptor);

  return { needsModalNotification: false, nub: { handler } };
}

function onCompleted(
  runState: UpsertHatBlockRunState,
  outcomeNub: UpsertHatBlockOutcomeNub,
  storeActions: PytchAppModelActions
) {
  const actor = outcomeNub.handler.actor;
  const handler = outcomeNub.handler.handler;
  storeActions.activeProject.pulseNotableChange({
    kind: "script-changed",
    scriptChangedKind: runState.operation.action.kind,
    handlerId: handler.id,
    handlerEventKind: handler.event.kind,
    actorKind: actor.kind,
    actorName: actor.name,
  });
}

export let upsertHatBlockFlow: UpsertHatBlockFlow = (() => {
  const specificSlice: UpsertHatBlockActions = {
    setMode: setRunStateProp("mode"),
    setChosenKind: setRunStateProp("chosenKind"),
    setKeyIfChosen: setRunStateProp("keyIfChosen"),
    setMessageIfChosen: setRunStateProp("messageIfChosen"),
    setMicroBitButtonIfChosen: setRunStateProp("microBitButtonIfChosen"),
    setMicroBitGestureIfChosen: setRunStateProp("microBitGestureIfChosen"),
    setMicroBitPinIfChosen: setRunStateProp("microBitPinIfChosen"),
    setMicroBitSoundIfChosen: setRunStateProp("microBitSoundIfChosen"),
  };
  return asyncUserFlowSlice(specificSlice, {
    prepare,
    isSubmittable,
    attempt,
    onCompleted,
  });
})();

export const kMicroBitHandlerHatBlockOptions: Array<EventDescriptorKind> = [
  "microbit:button",
  "microbit:gesture",
  "microbit:pin_high",
  "microbit:pin_low",
  "microbit:sound",
];

// Not sure this is the best place for this fact.
/** Map giving the order the hat-block options are presented in for each
 * kind of actor.  An e2e test checks that this is correct. */
export const kHandlerHatBlockOptions: Map<
  ActorKind,
  Array<EventDescriptorKind>
> = new Map([
  [
    "sprite",
    [
      "green-flag",
      "clicked",
      "start-as-clone",
      "key-pressed",
      "message-received",
      ...kMicroBitHandlerHatBlockOptions,
    ],
  ],
  [
    "stage",
    [
      "green-flag",
      "clicked",
      "key-pressed",
      "message-received",
      ...kMicroBitHandlerHatBlockOptions,
    ],
  ],
]);
