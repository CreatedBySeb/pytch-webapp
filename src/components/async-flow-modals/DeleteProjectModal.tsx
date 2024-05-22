import { useFlowState } from "../../model";
import { GenericConfirmActionModal } from "./GenericConfirmActionModal";
import { asyncFlowModal } from "./utils";

export const DeleteProjectModal = () => {
  const { fsmState } = useFlowState((f) => f.deleteProjectFlow);
  return asyncFlowModal(fsmState, (activeFsmState) => {
    const { name } = activeFsmState.runState;
    return (
      <GenericConfirmActionModal
        activeFsmState={activeFsmState}
        headerContent={<p>Delete project?</p>}
        bodyContent={
          <p>
            Are you sure you want to delete project <strong>{name}</strong>?
          </p>
        }
      />
    );
  });
};
