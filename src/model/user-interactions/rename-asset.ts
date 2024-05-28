import { Action } from "easy-peasy";
import { IPytchAppModel, PytchAppModelActions } from "..";

import {
  AssetOperationContext,
  assetOperationContextFromKey,
  AssetOperationContextKey,
} from "../asset";
import {
  asyncUserFlowSlice,
  AsyncUserFlowSlice,
  setRunStateProp,
} from "./async-user-flow";

type RenameAssetRunArgs = {
  operationContextKey: AssetOperationContextKey;
  fixedPrefix: string;
  oldNameSuffix: string;
};

type RenameAssetRunState = {
  operationContext: AssetOperationContext;
  fixedPrefix: string;
  oldStem: string;
  newStem: string;
  fixedSuffix: string;
};

type RenameAssetBase = AsyncUserFlowSlice<
  IPytchAppModel,
  RenameAssetRunArgs,
  RenameAssetRunState
>;

type SAction<ArgT> = Action<RenameAssetBase, ArgT>;

type RenameAssetActions = {
  setNewStem: SAction<string>;
};

export type RenameAssetFlow = RenameAssetBase & RenameAssetActions;

type FilenameParts = { stem: string; extension: string };
const filenameParts = (name: string): FilenameParts => {
  let fragments = name.split(".");
  if (fragments.length === 1) {
    return { stem: name, extension: "" };
  }

  const bareExtension = fragments.pop();
  if (bareExtension == null) {
    // This really should not happen.
    console.warn(`empty split from "${name}"`);
    return { stem: name, extension: "" };
  }

  const stem = fragments.join(".");
  const extension = `.${bareExtension}`;
  return { stem, extension };
};

async function prepare(args: RenameAssetRunArgs): Promise<RenameAssetRunState> {
  const operationContext = assetOperationContextFromKey(
    args.operationContextKey
  );
  const { stem, extension } = filenameParts(args.oldNameSuffix);
  return {
    operationContext,
    fixedPrefix: args.fixedPrefix,
    oldStem: stem,
    newStem: stem,
    fixedSuffix: extension,
  };
}

function isSubmittable(runState: RenameAssetRunState): boolean {
  const newStem = runState.newStem;
  return newStem !== "" && newStem !== runState.oldStem;
}

async function attempt(
  runState: RenameAssetRunState,
  actions: PytchAppModelActions
): Promise<void> {
  const suffix = runState.fixedSuffix;
  const oldNameSuffix = `${runState.oldStem}${suffix}`;
  const newNameSuffix = `${runState.newStem}${suffix}`;

  const renameDescriptor = {
    operationContext: runState.operationContext,
    fixedPrefix: runState.fixedPrefix,
    oldNameSuffix,
    newNameSuffix,
  };

  await actions.activeProject.renameAssetAndSync(renameDescriptor);
}

export let renameAssetFlow: RenameAssetFlow = (() => {
  const specificSlice: RenameAssetActions = {
    setNewStem: setRunStateProp("newStem"),
  };
  return asyncUserFlowSlice(specificSlice, prepare, isSubmittable, attempt);
})();
