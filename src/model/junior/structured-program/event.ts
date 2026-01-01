import { assertNever, hexSHA256 } from "../../../utils";
import { Uuid, UuidOps } from "./core-types";
import { NoIdEventHandler } from "./skeleton";

export type EventDescriptor =
  | { kind: "green-flag" }
  | { kind: "key-pressed"; keyName: string }
  | { kind: "message-received"; message: string }
  | { kind: "start-as-clone" }
  | { kind: "clicked" }
  | { kind: "microbit:button"; button: string }
  | { kind: "microbit:gesture"; gesture: string }
  | { kind: "microbit:pin_high"; pin: number }
  | { kind: "microbit:pin_low"; pin: number }
  | { kind: "microbit:sound"; level: string };

export type EventDescriptorKind = EventDescriptor["kind"];

export class EventDescriptorKindOps {
  /** Return the number of "arguments" the given `kind` of
   * event-descriptor needs.  This is always either `0` or `1`. */
  static arity(kind: EventDescriptorKind): number {
    switch (kind) {
      case "green-flag":
      case "clicked":
      case "start-as-clone":
        return 0;
      case "key-pressed":
      case "message-received":
      case "microbit:button":
      case "microbit:gesture":
      case "microbit:pin_high":
      case "microbit:pin_low":
      case "microbit:sound":
        return 1;
      default:
        return assertNever(kind);
    }
  }

  /** Return the human-readable name of the argument which the given
   * `kind` of event-descriptor needs, if any.  If the given `kind`
   * needs no arguments (for example, `"clicked"`), return `undefined`.
   * */
  static maybeArgumentName(kind: EventDescriptorKind): string | undefined {
    switch (kind) {
      case "green-flag":
      case "clicked":
      case "start-as-clone":
        return undefined;
      case "key-pressed":
        return "key";
      case "message-received":
        return "message";
      case "microbit:button":
        return "button";
      case "microbit:gesture":
        return "gesture";
      case "microbit:pin_high":
      case "microbit:pin_low":
        return "pin";
      case "microbit:sound":
        return "level";
      default:
        return assertNever(kind);
    }
  }

  static displayDescription(kind: EventDescriptorKind): string {
    switch (kind) {
      case "green-flag":
        return "green flag clicked";
      case "clicked":
        return "clicked";
      case "start-as-clone":
        return "start as clone";
      case "key-pressed":
        return "key pressed";
      case "message-received":
        return "message received";
      case "microbit:button":
        return "micro:bit button pressed";
      case "microbit:gesture":
        return "micro:bit gesture detected";
      case "microbit:pin_high":
        return "micro:bit pin is high";
      case "microbit:pin_low":
        return "micro:bit pin is low";
      case "microbit:sound":
        return "micro:bit sound level changes";
      default:
        return assertNever(kind);
    }
  }

  /**
   * Return an additional class name for the kind of event, to distinguish
   * events coming from other sources (e.g. micro:bit)
   */
  static className(kind: EventDescriptorKind): string | undefined {
    switch (kind) {
      case "microbit:button":
      case "microbit:gesture":
      case "microbit:pin_high":
      case "microbit:pin_low":
      case "microbit:sound":
        return "kind-microbit";

      default:
        return undefined;
    }
  }
}

export class EventDescriptorOps {
  /** Return (as a string) the decorator to be used to mark a method as
   * responding to the given `event` descriptor.   */
  static decorator(event: EventDescriptor): string {
    switch (event.kind) {
      case "green-flag":
        return "@pytch.when_green_flag_clicked";
      case "clicked":
        // We get away with just using "when_this_SPRITE_clicked"
        // because the two Python-side when-clicked decorator functions
        // do the same thing, without regards for whether the class is a
        // Sprite or Stage subclass.
        return "@pytch.when_this_sprite_clicked";
      case "start-as-clone":
        return "@pytch.when_I_start_as_a_clone";
      case "key-pressed":
        return `@pytch.when_key_pressed("${event.keyName}")`;
      case "message-received":
        // TODO: What if event.message has a " character?
        return `@pytch.when_I_receive("${event.message}")`;
      case "microbit:button":
        return `@microbit.when_button_pressed("${event.button}")`;
      case "microbit:gesture":
        return `@microbit.when_gesture_detected("${event.gesture}")`;
      case "microbit:pin_high":
        return `@microbit.when_pin_is_high(${event.pin})`;
      case "microbit:pin_low":
        return `@microbit.when_pin_is_low(${event.pin})`;
      case "microbit:sound":
        return `@microbit.when_sound_level_changes("${event.level}")`;
      default:
        return assertNever(event);
    }
  }

  /** Return a fingerprint of the given `event` descriptor, consisting
   * of the event kind and a kind-specific suffic separated by `:`.
   * This suffix is `-` for nullary event-kinds, and the SHA256 of the
   * event-kind argument (key-name or message) for unary event-kinds. */
  static async fingerprint(event: EventDescriptor): Promise<string> {
    const suffix = await (async () => {
      switch (event.kind) {
        case "green-flag":
        case "clicked":
        case "start-as-clone":
          return "-";
        case "key-pressed":
          return await hexSHA256(event.keyName);
        case "message-received":
          return await hexSHA256(event.message);
        // TODO: These are all enums, so do we need a hash?
        case "microbit:button":
          return event.button;
        case "microbit:gesture":
          return event.gesture;
        case "microbit:pin_high":
        case "microbit:pin_low":
          return event.pin;
        case "microbit:sound":
          return event.level;
        default:
          return assertNever(event);
      }
    })();

    return `${event.kind}:${suffix}`;
  }

  /** Return a deep clone of the given `event`. */
  static clone(event: EventDescriptor): EventDescriptor {
    return Object.assign({}, event);
  }
}

export type EventHandler = {
  id: Uuid;
  event: EventDescriptor;
  pythonCode: string;
};

export class EventHandlerOps {
  /** Return a new `EventHandler` with the given `event` descriptor and
   * with the empty string as its Python code. */
  static newWithEmptyCode(event: EventDescriptor): EventHandler {
    return { id: UuidOps.newRandom(), event, pythonCode: "" };
  }

  /** Return a new `EventHandler` with a random `id` whose `event` and
   * `pythonCode` are taken from the given `noIdEventHandler`.  */
  static fromSkeleton(noIdEventHandler: NoIdEventHandler): EventHandler {
    const id = UuidOps.newRandom();
    return { id, ...noIdEventHandler };
  }

  /** Return a fingerprint of the given `handler`, consisting of its
   * event-descriptor fingerprint and a hash of the Python code,
   * separated by `:`. */
  static async fingerprint(handler: EventHandler): Promise<string> {
    const eventFingerprint = await EventDescriptorOps.fingerprint(
      handler.event
    );
    const codeHash = await hexSHA256(handler.pythonCode);
    return `${eventFingerprint}:${codeHash}`;
  }

  /** Return a deep clone of the given `handler`, except that the clone
   * has a fresh `id`. */
  static clone(handler: EventHandler): EventHandler {
    const id = UuidOps.newRandom();
    const event = EventDescriptorOps.clone(handler.event);
    const pythonCode = handler.pythonCode;
    return { id, event, pythonCode };
  }
}
