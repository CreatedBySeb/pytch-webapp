import {
  Action as GenericAction,
  Thunk as GenericThunk,
  action,
  thunk,
} from "easy-peasy";
import { IPytchAppModel } from ".";
import { propSetterAction } from "../utils";
import { ProjectContent } from "./project-core";
import { AssetPresentation } from "./asset";

type CoreState =
  | { kind: "idle" }
  | { kind: "booting" }
  | { kind: "boot-failed" }
  | { kind: "ready"; project: ProjectContent<AssetPresentation> }
  | { kind: "build-failed" }
  | { kind: "launched"; project: ProjectContent<AssetPresentation> }
  | { kind: "runtime-error"; project: ProjectContent<AssetPresentation> };

const kIdleState: CoreState = { kind: "idle" };
const kBootingState: CoreState = { kind: "booting" };

type CoreStateWithProject = CoreState & {
  kind: "ready" | "launched" | "runtime-error";
};

const kindsWithProject: Array<CoreState["kind"]> = [
  "ready",
  "launched",
  "runtime-error",
];

export function stateHasProject(
  state: CoreState
): state is CoreStateWithProject {
  return kindsWithProject.includes(state.kind);
}

// "Slice action" — Action<> specialised for this slice-type.
type SAction<ArgT> = GenericAction<StandalonePlayDemoState, ArgT>;

// "Slice thunk" — Thunk<> specialised for this slice-type.
type SThunk<ArgT, ResultT = void> = GenericThunk<
  StandalonePlayDemoState,
  ArgT,
  void,
  IPytchAppModel,
  ResultT
>;

export type StandalonePlayDemoState = {
  coreState: CoreState;
  setCoreState: SAction<CoreState>;
  noteBootFailed: SAction<void>;
};

export let standalonePlayDemoState: StandalonePlayDemoState = {
  coreState: kIdleState,
  setCoreState: propSetterAction("coreState"),

  noteBootFailed: action((state) => {
    state.coreState = { kind: "boot-failed" };
  }),
};
