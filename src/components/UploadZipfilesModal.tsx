import React, { useState } from "react";
import { useStoreActions, useStoreState } from "../store";
import { assertNever } from "../utils";
import { ChooseFiles, tmpStatusFromOld } from "./ChooseFiles";
import { FileProcessingFailures } from "./FileProcessingFailures";

export const UploadZipfilesModal = () => {
  const state = useStoreState(
    (state) => state.userConfirmations.uploadZipfilesInteraction.state
  );
  const { tryProcess, dismiss } = useStoreActions(
    (actions) => actions.userConfirmations.uploadZipfilesInteraction
  );
  const [chosenFiles, setChosenFiles] = useState<FileList | null>(null);

  switch (state.status) {
    case "idle":
      // Ensure state has been reset ready for next time:
      if (chosenFiles != null) setChosenFiles(null);
      return null;
    case "awaiting-user-choice":
    case "trying-to-process":
      return (
        <ChooseFiles
          {...{ chosenFiles, setChosenFiles }}
          titleText="Upload project zipfiles"
          introText="Choose zipfiles to upload as new projects."
          actionButtonText="Upload"
          status={tmpStatusFromOld(state.status)}
          tryProcess={(files) => tryProcess(files)}
          dismiss={() => dismiss()}
        />
      );
    case "showing-failures":
      return (
        <FileProcessingFailures
          titleText="Problem uploading project zipfiles"
          introText="Sorry, there was a problem uploading the projects:"
          failures={state.failures}
          dismiss={() => dismiss()}
        />
      );
    default:
      assertNever(state);
      return null;
  }
};
