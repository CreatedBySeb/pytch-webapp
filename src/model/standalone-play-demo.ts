import {
  Action as GenericAction,
  Thunk as GenericThunk,
  action,
  thunk,
} from "easy-peasy";
import { IPytchAppModel } from ".";
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
};

export let standalonePlayDemoState: StandalonePlayDemoState = {
};
