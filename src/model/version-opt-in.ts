import {
  Action as GenericAction,
  Thunk as GenericThunk,
} from "easy-peasy";
import { propSetterAction } from "../utils";
import { IPytchAppModel } from ".";

/** Whether we are showing the "Pytch v2" user-interface elements, such
 * as the ability to create script-by-script projects and the
 * script-by-script tutorial. */
export type VersionTag = "v1" | "v2";

/** The user can launch operations from the panel explaining what the
 * new v2 features are.  The type `V2_OperationState` describes whether
 * such an operation is currently in progress.  */
export type V2_OperationState = "idle" | "in-progress";

// URL search param which enables the "v2" UI.
const kEnableUiV2SearchParam = "ui-v2";

// "Slice action" — Action<> specialised for this slice-type.
type SAction<PayloadT> = GenericAction<VersionOptIn, PayloadT>;

// "Slice thunk" — Thunk<> specialised for this slice-type.
type SThunk<PayloadT = void, ResultT = void> = GenericThunk<
  VersionOptIn,
  PayloadT,
  void,
  IPytchAppModel,
  ResultT
>;

export type VersionOptIn = {
  activeUiVersion: VersionTag;
  setActiveUiVersion: SAction<VersionTag>;

  v2OperationState: V2_OperationState;
  setV2OperationState: SAction<V2_OperationState>;
};

export let versionOptIn: VersionOptIn = {
  activeUiVersion: "v1",
  setActiveUiVersion: propSetterAction("activeUiVersion"),

  v2OperationState: "idle",
  setV2OperationState: propSetterAction("v2OperationState"),
};
