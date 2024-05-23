import { useJrEditState } from "../../Junior/hooks";
import { GenericConfirmActionModal } from "../../async-flow-modals/GenericConfirmActionModal";
import { asyncFlowModal } from "../../async-flow-modals/utils";

export const DeleteSpriteModal = () => {
  const { fsmState } = useJrEditState((a) => a.deleteSpriteFlow);
  return asyncFlowModal(fsmState, (activeFsmState) => {
    const { spriteDisplayName } = activeFsmState.runState;
    return (
      <GenericConfirmActionModal
        activeFsmState={activeFsmState}
        headerContent={
          <p>
            Delete <em>{spriteDisplayName}</em>?
          </p>
        }
        bodyContent={
          <p>
            Are you sure you want to delete the sprite “{spriteDisplayName}”
            from your project?
          </p>
        }
      />
    );
  });
};
