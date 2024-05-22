import { useFlowState } from "../../model";
import { GenericConfirmActionModal } from "./GenericConfirmActionModal";
import { asyncFlowModal } from "./utils";

export const DeleteManyProjectsModal = () => {
  const { fsmState } = useFlowState((f) => f.deleteManyProjectsFlow);
  return asyncFlowModal(fsmState, (activeFsmState) => {
    const { ids } = activeFsmState.runState;
    const nProjects = ids.length;
    const plural = nProjects > 1;
    const noun = plural ? "projects" : "project";
    return (
      <GenericConfirmActionModal
        activeFsmState={activeFsmState}
        headerContent={<p>Delete {noun}?</p>}
        bodyContent={
          <p>
            Are you sure you want to delete {nProjects} {noun}?
          </p>
        }
      />
    );
  });
};
