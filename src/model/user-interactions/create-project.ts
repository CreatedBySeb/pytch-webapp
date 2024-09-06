import { Action } from "easy-peasy";
import { IPytchAppModel, PytchAppModelActions } from "..";
import { ICreateProjectDescriptor } from "../projects";
import {
  templateKindFromComponents,
  WhetherExampleTag,
} from "../project-templates";
import { PytchProgramKind } from "../pytch-program";
import {
  asyncUserFlowSlice,
  AsyncUserFlowSlice,
  setRunStateProp,
} from "./async-user-flow";
import { VersionTag } from "../version-opt-in";

type CreateProjectRunArgs = {
  activeUiVersion: VersionTag;
  forceUiVersion?: VersionTag;
};

type CreateProjectRunState = {
  name: string;
  whetherExample: WhetherExampleTag;
  forceUiVersion: VersionTag | undefined;
  editorKind: PytchProgramKind;
};

type CreateProjectBase = AsyncUserFlowSlice<
  IPytchAppModel,
  CreateProjectRunArgs,
  CreateProjectRunState
>;

type SAction<ArgT> = Action<CreateProjectBase, ArgT>;

type CreateProjectActions = {
  setName: SAction<string>;
  setWhetherExample: SAction<WhetherExampleTag>;
  setEditorKind: SAction<PytchProgramKind>;
};

export type CreateProjectFlow = CreateProjectBase & CreateProjectActions;

async function prepare(
  args: CreateProjectRunArgs
): Promise<CreateProjectRunState> {
  const effectiveUiVersion = args.forceUiVersion ?? args.activeUiVersion;
  return {
    name: "Untitled project",
    whetherExample: "with-example",
    forceUiVersion: args.forceUiVersion,
    editorKind: effectiveUiVersion === "v1" ? "flat" : "per-method",
  };
}

function isSubmittable(runState: CreateProjectRunState): boolean {
  return runState.name !== "";
}

async function attempt(
  runState: CreateProjectRunState,
  actions: PytchAppModelActions
) {
  const descriptor: ICreateProjectDescriptor = {
    name: runState.name,
    template: templateKindFromComponents(
      runState.whetherExample,
      runState.editorKind
    ),
  };

  await actions.projectCollection.createNewProjectAndNavigate(descriptor);
}

export let createProjectFlow: CreateProjectFlow = (() => {
  const specificSlice: CreateProjectActions = {
    setName: setRunStateProp("name"),
    setEditorKind: setRunStateProp("editorKind"),
    setWhetherExample: setRunStateProp("whetherExample"),
  };
  return asyncUserFlowSlice(specificSlice, prepare, isSubmittable, attempt);
})();
