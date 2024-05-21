import {
  Actions,
  Action,
  action,
  Thunk,
  Computed,
  computed,
} from "easy-peasy";
import { NavigationAbandonmentGuard } from "../../navigation-abandonment-guard";

type UserSettleResult = "cancel" | "submit";
type UserSettleFun = (result: UserSettleResult) => void;
const kIgnoreSettleResult: UserSettleFun = () => void 0;

type InteractingAsyncUserFlowFsmState<RunStateT> = {
  kind: "interacting";
  maybeLastFailure: Error | null;
  runState: RunStateT;
  userSettle: UserSettleFun;
};

export type ActiveAsyncUserFlowFsmState<RunStateT> =
  | InteractingAsyncUserFlowFsmState<RunStateT>
  | { kind: "attempting"; runState: RunStateT }
  | { kind: "succeeded"; runState: RunStateT };

export type AsyncUserFlowFsmState<RunStateT> =
  | { kind: "idle" }
  | { kind: "preparing" }
  | ActiveAsyncUserFlowFsmState<RunStateT>;

function assertInteracting<RunStateT>(
  fsmState: AsyncUserFlowFsmState<RunStateT>
): asserts fsmState is InteractingAsyncUserFlowFsmState<RunStateT> {
  if (fsmState.kind !== "interacting")
    throw new Error('FSM-state should be "interacting"');
}

export type AsyncUserFlowState<RunStateT> = {
  fsmState: AsyncUserFlowFsmState<RunStateT>;
  isSubmittable: Computed<AsyncUserFlowState<RunStateT>, boolean>;
};

export type AsyncUserFlowSlice<
  AppModelT extends object,
  RunArgsT,
  RunStateT,
> = AsyncUserFlowState<RunStateT> & {
  setFsmState: Action<
    AsyncUserFlowState<RunStateT>,
    AsyncUserFlowFsmState<RunStateT>
  >;
  run: Thunk<
    AsyncUserFlowSlice<AppModelT, RunArgsT, RunStateT>,
    RunArgsT,
    void,
    AppModelT
  >;
};

type AsyncFlowPrepareFun<RunArgsT, AppModelT extends object, RunStateT> = (
  args: RunArgsT,
  storeActions: Actions<AppModelT>,
  navigationGuard: NavigationAbandonmentGuard
) => Promise<RunStateT>;

type AsyncFlowAttemptFun<RunStateT, AppModelT extends object> = (
  runState: RunStateT,
  storeActions: Actions<AppModelT>,
  navigationGuard: NavigationAbandonmentGuard
) => Promise<void>;

export type AsyncUserFlowOptions = {
  pulseSuccessMessage: boolean;
};

const kDefaultAsyncUserFlowOptions: AsyncUserFlowOptions = {
  pulseSuccessMessage: true,
};

function baseAsyncUserFlowSlice<AppModelT extends object, RunArgsT, RunStateT>(
  prepare: AsyncFlowPrepareFun<RunArgsT, AppModelT, RunStateT>,
  isSubmittable: (runState: RunStateT) => boolean,
  attempt: AsyncFlowAttemptFun<RunStateT, AppModelT>,
  options: AsyncUserFlowOptions
): AsyncUserFlowSlice<AppModelT, RunArgsT, RunStateT> {
  return {
    fsmState: { kind: "idle" },
    isSubmittable: computed((state) => {
      const fsmState = state.fsmState as AsyncUserFlowFsmState<RunStateT>;
      return (
        fsmState.kind === "interacting" && isSubmittable(fsmState.runState)
      );
    }),

    // Did not get to the bottom of what's going on with the typing
    // such that I can't use propSetterAction() here.
    setFsmState: action((s, val) => {
      s.fsmState = val;
    }),
  };
}
