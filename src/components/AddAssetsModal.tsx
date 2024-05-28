import React from "react";
import { ChooseFiles } from "./ChooseFiles";
import { FileProcessingFailures } from "./FileProcessingFailures";
import { asyncFlowModal } from "./async-flow-modals/utils";
import { settleFunctions } from "../model/user-interactions/async-user-flow";
import { FileFailureError } from "../model/user-interactions/process-files";
import { GenericWorkingModal } from "./async-flow-modals/GenericWorkingModal";
import { useFlowActions, useFlowState } from "../model";

export const AddAssetsModal = () => {
  const { fsmState, isSubmittable } = useFlowState((f) => f.addAssetsFlow);
  const setChosenFiles = useFlowActions((f) => f.addAssetsFlow.setChosenFiles);

  return asyncFlowModal(fsmState, (activeState) => {
    const { operationContext, chosenFiles } = activeState.runState;
    const settle = settleFunctions(isSubmittable, activeState);
    const assetPlural = operationContext.assetPlural;

    if (
      activeState.kind === "interacting" &&
      activeState.maybeLastFailure != null
    ) {
      const error = activeState.maybeLastFailure as FileFailureError;
      const titleText = `Problem adding ${assetPlural}`;
      return (
        <FileProcessingFailures
          titleText={titleText}
          introText="Sorry, there was a problem adding files to your project:"
          failures={error.fileFailures}
          dismiss={settle.cancel}
        />
      );
    }

    switch (activeState.kind) {
      case "interacting":
      case "attempting": {
        return (
          <ChooseFiles
            titleText={`Add ${assetPlural}`}
            introText={`Choose ${assetPlural} to add to your project.`}
            actionButtonText="Add to project"
            status={activeState.kind}
            chosenFiles={chosenFiles}
            setChosenFiles={setChosenFiles}
            tryProcess={settle.submit}
            dismiss={settle.cancel}
          />
        );
      }
      case "succeeded":
        // TODO: Something better here?
        return <GenericWorkingModal />;
    }
  });
};
