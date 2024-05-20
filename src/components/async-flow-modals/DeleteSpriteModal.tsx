import { useJrEditState } from "../Junior/hooks";
import { GenericConfirmActionModal } from "./GenericConfirmActionModal";
import { asyncFlowModal } from "./utils";

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
