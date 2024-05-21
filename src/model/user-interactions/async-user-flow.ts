import {
  Actions,
  Action,
  action,
  Thunk,
  thunk,
  Computed,
  computed,
} from "easy-peasy";
import { delaySeconds } from "../../utils";
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

    run: thunk(async (actions, args, helpers) => {
      const fsmStateKind = helpers.getState().fsmState.kind;
      if (fsmStateKind !== "idle") {
        console.log(
          `AsyncUserFlowSlice.run(): expecting FSM to be in state "idle"` +
            ` but is in state "${fsmStateKind}"`
        );
        return;
      }

      const storeActions = helpers.getStoreActions();

      const navigationGuard = new NavigationAbandonmentGuard();
      function throwIfAbandoned<ResultT>(
        p: Promise<ResultT>
      ): Promise<ResultT> {
        return navigationGuard.throwIfAbandoned(p);
      }

      try {
        actions.setFsmState({ kind: "preparing" });

        const preparePromise = prepare(args, storeActions, navigationGuard);
        let runState: RunStateT = await throwIfAbandoned(preparePromise);

        let maybeLastFailure: Error | null = null;

        let hasSucceeded = false;
        while (!hasSucceeded) {
          let userSettle = kIgnoreSettleResult;
          const userSettlePromise = new Promise<UserSettleResult>((resolve) => {
            userSettle = resolve;
          });

          actions.setFsmState({
            kind: "interacting",
            maybeLastFailure,
            runState,
            userSettle,
          });

          const settleResult = await throwIfAbandoned(userSettlePromise);
          if (settleResult === "cancel") {
            return;
          }

          try {
            // Unsure what Easy-Peasy is doing with types here such that
            // this cast is required.
            const fsmState_ = helpers.getState().fsmState;
            const fsmState = fsmState_ as AsyncUserFlowFsmState<RunStateT>;

            assertInteracting(fsmState);
            runState = fsmState.runState;

            actions.setFsmState({ kind: "attempting", runState });

            // The promise returned from this attempt() call can reject
            // (either as a "business logic" error, or by back/fwd
            // abandonment).
            const attemptPromise = attempt(
              runState,
              storeActions,
              navigationGuard
            );
            await navigationGuard.throwIfAbandoned(attemptPromise);

            actions.setFsmState({ kind: "succeeded", runState });

            if (options.pulseSuccessMessage) {
              // Whether the delay is cancelled by navigation or runs to
              // completion, we're finished, so we can ignore the return
              // value of resultOrAbandoned().
              await navigationGuard.throwIfAbandoned(delaySeconds(1.0));
            }

            hasSucceeded = true;
          } catch (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            err: any
          ) {
            maybeLastFailure = err;
          }
        }
      } catch (err) {
        if (!navigationGuard.wasAbandoned(err)) {
          throw err;
        }
      } finally {
        actions.setFsmState({ kind: "idle" });
        navigationGuard.exit();
      }
    }),
  };
}

export function asyncUserFlowSlice<
  AppModelT extends object,
  SpecificSliceT,
  RunArgsT,
  RunStateT,
>(
  specificSlice: SpecificSliceT,
  prepare: AsyncFlowPrepareFun<RunArgsT, AppModelT, RunStateT>,
  isSubmittable: (runState: RunStateT) => boolean,
  attempt: AsyncFlowAttemptFun<RunStateT, AppModelT>,
  options: Partial<AsyncUserFlowOptions> = kDefaultAsyncUserFlowOptions
): SpecificSliceT & AsyncUserFlowSlice<AppModelT, RunArgsT, RunStateT> {
  const effectiveOptions: AsyncUserFlowOptions = Object.assign(
    {},
    kDefaultAsyncUserFlowOptions,
    options
  );
  const asyncFlowModelSlice = baseAsyncUserFlowSlice(
    prepare,
    isSubmittable,
    attempt,
    effectiveOptions
  );
  return Object.assign({}, specificSlice, asyncFlowModelSlice);
}

////////////////////////////////////////////////////////////////////////
// Helpers for extracting properties of fsmState

// TODO: Would it be cleaner for these to be computed properties on the
// slice, sibling to isSubmittable?

export function isSucceeded<RunStateT>(
  fsmState: AsyncUserFlowFsmState<RunStateT>
): boolean {
  return fsmState.kind === "succeeded";
}

export function maybeLastFailureMessage<RunStateT>(
  fsmState: AsyncUserFlowFsmState<RunStateT>
): string | null {
  return fsmState.kind === "interacting" && fsmState.maybeLastFailure != null
    ? fsmState.maybeLastFailure.message ?? "an unknown error occurred"
    : null;
}

export function isInteractable<RunStateT>(
  fsmState: AsyncUserFlowFsmState<RunStateT>
): boolean {
  return fsmState.kind === "interacting";
}

export function isActive<RunStateT>(
  fsmState: AsyncUserFlowFsmState<RunStateT>
): fsmState is ActiveAsyncUserFlowFsmState<RunStateT> {
  return (
    fsmState.kind === "interacting" ||
    fsmState.kind === "attempting" ||
    fsmState.kind === "succeeded"
  );
}

////////////////////////////////////////////////////////////////////////
// Helpers for settling (cancelling or submitting) the modal

type SettleFunctions = {
  cancel: () => void;
  submit: () => void;
};

export function settleFunctions<RunStateT>(
  isSubmittable: boolean,
  fsmState: AsyncUserFlowFsmState<RunStateT>
): SettleFunctions {
  return fsmState.kind === "interacting"
    ? {
        cancel: () => fsmState.userSettle("cancel"),
        submit: () => {
          if (isSubmittable) {
            fsmState.userSettle("submit");
          }
        },
      }
    : {
        cancel: () => void 0,
        submit: () => void 0,
      };
}

////////////////////////////////////////////////////////////////////////
// Helper for passing to useEffect() to give focus to an input element

export function flowFocusOrBlurFun<Elt extends HTMLElement, RunStateT>(
  elementRef: React.RefObject<Elt>,
  fsmState: AsyncUserFlowFsmState<RunStateT>
) {
  return () => {
    if (!isActive(fsmState)) {
      return;
    }

    const element = elementRef.current;

    if (element == null) {
      // Shouldn't happen.
      return;
    }

    if (isInteractable(fsmState)) {
      element.focus();
    } else {
      element.blur();
    }
  };
}

////////////////////////////////////////////////////////////////////////
// Helpers for writing actions which operate on the RunStateT

type RunStateAction<RunStateT, PayloadT> = (
  runState: RunStateT,
  payload: PayloadT
) => void;

export function runStateAction<RunStateT, PayloadT>(
  actionFun: RunStateAction<RunStateT, PayloadT>
) {
  return action<AsyncUserFlowState<RunStateT>, PayloadT>((state, payload) => {
    const fsmState_ = state.fsmState;
    const fsmState = fsmState_ as AsyncUserFlowFsmState<RunStateT>;

    assertInteracting(fsmState);
    actionFun(fsmState.runState, payload);
  });
}

export function setRunStateProp<RunStateT, PropNameT extends keyof RunStateT>(
  propName: PropNameT
) {
  return action<
    AsyncUserFlowState<RunStateT>,
    NonNullable<RunStateT[PropNameT]>
  >((state, val) => {
    const fsmState_ = state.fsmState;
    const fsmState = fsmState_ as AsyncUserFlowFsmState<RunStateT>;

    assertInteracting(fsmState);
    fsmState.runState[propName] = val;
  });
}
