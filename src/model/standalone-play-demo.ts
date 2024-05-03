import {
  Action as GenericAction,
  Thunk as GenericThunk,
  action,
  thunk,
} from "easy-peasy";
import { IPytchAppModel } from ".";

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
