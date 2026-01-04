/* eslint-disable @typescript-eslint/no-explicit-any */

// Very rudimentary auto-completion
//
// Only complete "pytch." and "self.", with hard-coded list of options
// based on the public module functions and base-class methods.

import { IAceEditor } from "react-ace/lib/types";
import { assertNever } from "../utils";
import { DevWorkContext } from "../model/dev-work-context";

declare let Sk: any;

// Perhaps with more effort I could work out how to import this type:
type IAceCompletion = {
  caption: string;
  snippet: string;
  message: string;
  meta?: string;
};

/** Construct an Ace completion object from one of the Python tuples
 * returned by the Python-side `_user_facing_completions()` function.
 * Each such tuple has four string elements:
 *
 * * identifier (name of attribute of `pytch`, `Stage`, or `Sprite`,
 *   e.g., `"change_x"`, `"backdrop_number"`, or `"size"`)
 * * suffix (for a property, the empty string; for a callable, a string
 *   describing the arguments, such as `"(SIZE)"`)
 * * kind (the name of the Python type of which this attribute is an
 *   instance, e.g., `"method"`, `"function"`, `"property"`)
 * * doc (short summary docstring)
 **/
const completionFromPyTuple =
  (meta: string | null) =>
  (tup: any): IAceCompletion => {
    const identifier: string = tup.v[0].v;
    const suffix: string = tup.v[1].v;
    const snippet = suffix.startsWith("(") ? `${identifier}($0)` : identifier;

    return {
      caption: identifier + suffix,
      snippet,
      meta: meta ?? undefined,
      message: tup.v[3].v,
    };
  };

const withoutMeta = (completion: IAceCompletion): IAceCompletion => ({
  caption: completion.caption,
  snippet: completion.snippet,
  message: completion.message,
});

const kPytchPerMethodExclusions = [
  "Sprite",
  "Stage",
  "when_green_flag_clicked",
  "when_I_receive($0)",
  "when_I_start_as_a_clone",
  "when_key_pressed($0)",
  "when_stage_clicked",
  "when_this_sprite_clicked",
];

const kMicrobitPerMethodExclusions = [
  "when_button_pressed($0)",
  "when_gesture_detected($0)",
  "when_pin_is_high($0)",
  "when_pin_is_low($0)",
  "when_sound_level_changes($0)",
]

const withoutPerMethodExclusions = (
  completions: Array<IAceCompletion>,
  exclusions: Array<string>,
): Array<IAceCompletion> => {
  // Assert that all exclusions are in the original input array, to try
  // to catch typos.
  const completionValues = completions.map((c) => c.snippet);
  const missingExclusions = exclusions.filter(
    (value) => !completionValues.includes(value)
  );
  if (missingExclusions.length > 0) {
    throw new Error(
      "some exclusions not found in full completions list: " +
        JSON.stringify(missingExclusions)
    );
  }

  return completions.filter(
    (completion) => !exclusions.includes(completion.snippet)
  );
};

const completionsFromPyList = (
  meta: string | null,
  lst: any,
): Array<IAceCompletion> =>
  lst.v.map(completionFromPyTuple(meta));

// Invoke the Python function _user_facing_completions() and
// use the provided info on the user-facing attributes of pytch,
// Actor, Sprite, and Stage.
//
const kCompletions = (() => {
  Sk.configure({});
  const pyStr = (s: string) => new Sk.builtin.str(s);
  const sUserFacingCompletions = pyStr("_user_facing_completions");
  const sPytch = pyStr("pytch");
  const sPytchMicrobit = pyStr("pytch.microbit");
  const sActor = pyStr("Actor");
  const sDevice = pyStr("Device");
  const sSprite = pyStr("Sprite");
  const sStage = pyStr("Stage");

  const pyMod = Sk.builtin.__import__("pytch", {}, {}, [], -1);
  const pyCompletionsInfoFun = Sk.builtin.getattr(
    pyMod,
    sUserFacingCompletions
  );
  const pyCompletionsInfo = pyCompletionsInfoFun.tp$call([], {});

  // Return value is (completions, attrsWithoutDocs); ignore the latter.
  const pyCompletionsByKind = pyCompletionsInfo.v[0];

  const allPytch = completionsFromPyList(
    null,
    pyCompletionsByKind.mp$subscript(sPytch)
  );

  const allMicrobit = [
    ...completionsFromPyList(
      null,
      pyCompletionsByKind.mp$subscript(sPytchMicrobit),
    ),
    ...completionsFromPyList(
      null,
      pyCompletionsByKind.mp$subscript(sDevice),
    ),
  ];

  const perMethodPytch = withoutPerMethodExclusions(
    allPytch,
    kPytchPerMethodExclusions,
  );

  const perMethodMicrobit = withoutPerMethodExclusions(
    allMicrobit,
    kMicrobitPerMethodExclusions,
  );

  const actorCompletions = completionsFromPyList(
    "[Spr/Stg]",
    pyCompletionsByKind.mp$subscript(sActor)
  );
  const spriteCompletions = completionsFromPyList(
    "[Spr]",
    pyCompletionsByKind.mp$subscript(sSprite)
  );
  const stageCompletions = completionsFromPyList(
    "[Stg]",
    pyCompletionsByKind.mp$subscript(sStage)
  );
  const actor = [
    ...actorCompletions,
    ...spriteCompletions,
    ...stageCompletions,
  ];

  const sprite = actorCompletions.concat(spriteCompletions).map(withoutMeta);
  const stage = actorCompletions.concat(stageCompletions).map(withoutMeta);

  return {
    allPytch,
    perMethodPytch,
    allMicrobit,
    perMethodMicrobit,
    actor,
    sprite,
    stage,
  };
})();

export class PytchAceAutoCompleter {
  readonly context: DevWorkContext;

  constructor(context: DevWorkContext) {
    this.context = context;
  }

  // TODO: Proper types for the remaining arguments.
  getCompletions(
    _editor: IAceEditor,
    session: any,
    pos: any,
    prefix: string,
    callback: any
  ) {
    const cursorLine = session.getLine(pos.row);
    const lineHead = cursorLine.substring(0, pos.column);

    if (!lineHead.endsWith(prefix)) {
      // TODO: What's the right way to report this error to Ace?
      callback(null, []);
    }

    const prePrefixLength = lineHead.length - prefix.length;
    const prePrefix = lineHead.substring(0, prePrefixLength);
    const programKind = this.context.programKind;

    const candidates = (() => {
      if (prePrefix.endsWith("pytch.")) {
        switch (programKind) {
          case "flat":
            return kCompletions.allPytch;
          case "per-method":
            return kCompletions.perMethodPytch;
          default:
            return assertNever(this.context);
        }
      } else if (prePrefix.endsWith("microbit.")) {
        switch (programKind) {
          case "flat":
            return kCompletions.allMicrobit;
          case "per-method":
            return kCompletions.perMethodMicrobit;
          default:
            return assertNever(this.context);
        }
      } else if (prePrefix.endsWith("self.")) {
        switch (programKind) {
          case "flat":
            return kCompletions.actor;
          case "per-method":
            switch (this.context.actorKind) {
              case "sprite":
                return kCompletions.sprite;
              case "stage":
                return kCompletions.stage;
              default:
                return assertNever(this.context.actorKind);
            }
          default:
            return assertNever(this.context);
        }
      } else {
        return [];
      }
    })();

    callback(null, candidates);
  }
}
