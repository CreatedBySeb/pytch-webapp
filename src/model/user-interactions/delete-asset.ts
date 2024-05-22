import { IPytchAppModel, PytchAppModelActions } from "..";
import {
  AsyncUserFlowSlice,
  alwaysSubmittable,
  asyncUserFlowSlice,
  idPrepare,
} from "./async-user-flow";

type DeleteAssetRunArgs = {
  kindDisplayName: string;
  name: string;
  displayName: string;
};

type DeleteAssetRunState = DeleteAssetRunArgs;

// No actions:
export type DeleteAssetFlow = AsyncUserFlowSlice<
  IPytchAppModel,
  DeleteAssetRunArgs,
  DeleteAssetRunState
>;

async function attempt(
  runState: DeleteAssetRunState,
  actions: PytchAppModelActions
) {
  const deleteDescriptor = { name: runState.name };
  await actions.activeProject.deleteAssetAndSync(deleteDescriptor);
}

export let deleteAssetFlow: DeleteAssetFlow = (() => {
  return asyncUserFlowSlice({}, idPrepare, alwaysSubmittable, attempt);
})();
