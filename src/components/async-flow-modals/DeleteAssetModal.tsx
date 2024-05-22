import { useFlowState } from "../../model";
import { GenericConfirmActionModal } from "./GenericConfirmActionModal";
import { asyncFlowModal } from "./utils";

export const DeleteAssetModal = () => {
  const { fsmState } = useFlowState((f) => f.deleteAssetFlow);
  return asyncFlowModal(fsmState, (activeFsmState) => {
    const { displayName, kindDisplayName } = activeFsmState.runState;
    return (
      <GenericConfirmActionModal
        activeFsmState={activeFsmState}
        headerContent={
          <p>
            Delete {kindDisplayName} “{displayName}” from project?
          </p>
        }
        bodyContent={
          <p>
            Are you sure you want to delete the {kindDisplayName} “{displayName}
            ” from your project?
          </p>
        }
      />
    );
  });
};
