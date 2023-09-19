import { action, Action, thunk, Thunk } from "easy-peasy";
import { PytchAppModelActions } from "..";

import {
  IModalUserInteraction,
  modalUserInteraction,
} from "../user-interactions";
import {
  NameValidity,
  nameValidity,
  unusedSpriteName,
} from "./structured-program/name-validity";
import { assertNever, propSetterAction } from "../../utils";
import {
  SpriteUpsertionAction,
  SpriteUpsertionArgs,
} from "./structured-program/program";

type AddSpriteLaunchArgs = {
  upsertionAction: SpriteUpsertionAction;
  existingNames: Array<string>;
};

type AddSpriteBase = IModalUserInteraction<AddSpriteDescriptor>;

type AddSpriteSpecific = {
  upsertionArgs: SpriteUpsertionArgs;
  setUpsertionArgs: Action<AddSpriteSpecific, SpriteUpsertionArgs>;

  _setName: Action<AddSpriteSpecific, string>;
  setName: Thunk<AddSpriteSpecific, string>;

  existingNames: Array<string>;
  setExistingNames: Action<AddSpriteSpecific, Array<string>>;

  nameValidity: NameValidity;
  launch: Thunk<AddSpriteBase & AddSpriteSpecific, AddSpriteLaunchArgs>;
  refreshInputsReady: Action<AddSpriteBase & AddSpriteSpecific>;
};

const addSpriteSpecific: AddSpriteSpecific = {
  upsertionArgs: { kind: "insert", name: "" },
  setUpsertionArgs: propSetterAction("upsertionArgs"),

  _setName: action((state, name) => {
    state.upsertionArgs.name = name;
  }),
  setName: thunk((actions, name) => {
    actions._setName(name);
    actions.refreshInputsReady();
  }),

  // The setter is only called from launch() and followed by setName()
  // so can leave nameValidity computation to setName().
  existingNames: [],
  setExistingNames: propSetterAction("existingNames"),

  nameValidity: nameValidity([], ""),

  launch: thunk((actions, { upsertionAction, existingNames }) => {
    // Ugh, sequence of actions here is brittle: superLaunch() sets
    // inputsReady to false; setName() calls refreshInputsReady(), which
    // refers to existingNames to update nameValidity and hence
    // inputsReady.
    actions.superLaunch();

    // This is a bit clunky; we set name to "" here, then overwrite
    // in the switch(){} below.
    actions.setUpsertionArgs({ ...upsertionAction, name: "" });

    switch (upsertionAction.kind) {
      case "insert":
        actions.setExistingNames(existingNames);
        actions.setName(unusedSpriteName(existingNames));
        break;
      case "update": {
        // We don't want the dialog to chide the user about "there's
        // already a sprite with that name" when they haven't changed
        // the default yet, so pretend the current name is not one of
        // the existing names.  We separately catch the case that they
        // haven't changed the default in refreshInputsReady() below.
        const previousName = upsertionAction.previousName;
        const disallowedNames = existingNames.filter((n) => n !== previousName);
        actions.setExistingNames(disallowedNames);
        actions.setName(previousName);
        break;
      }
      default:
        assertNever(upsertionAction);
    }
  }),

  refreshInputsReady: action((state) => {
    state.nameValidity = nameValidity(
      state.existingNames,
      state.upsertionArgs.name
    );

    state.inputsReady =
      state.nameValidity.status === "valid" &&
      // If renaming, forbid leaving the name at its previous value:
      (state.upsertionArgs.kind === "insert" ||
        state.upsertionArgs.name !== state.upsertionArgs.previousName);
  }),
};

const attemptAddSprite = async (
  actions: PytchAppModelActions,
  descriptor: AddSpriteDescriptor
) => {
  // This can throw if name already exists, even though we've tried to
  // not let that happen:
  actions.activeProject.addSprite(descriptor.name);
};

export type AddSpriteInteraction = AddSpriteBase & AddSpriteSpecific;

export let addSpriteInteraction = modalUserInteraction(
  attemptAddSprite,
  addSpriteSpecific
);
