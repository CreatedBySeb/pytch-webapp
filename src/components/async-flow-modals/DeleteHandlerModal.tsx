import { useJrEditState } from "../Junior/hooks";
import { GenericConfirmActionModal } from "./GenericConfirmActionModal";
import { asyncFlowModal } from "./utils";

export const DeleteHandlerModal = () => {
  const { fsmState } = useJrEditState((s) => s.deleteHandlerFlow);
  return asyncFlowModal(fsmState, (activeFsmState) => {
    return (
      <GenericConfirmActionModal
        activeFsmState={activeFsmState}
        headerContent={<p>Delete script?</p>}
        bodyContent={<p>Are you sure you want to delete this script?</p>}
      />
    );
  });
};
