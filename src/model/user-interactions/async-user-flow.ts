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
