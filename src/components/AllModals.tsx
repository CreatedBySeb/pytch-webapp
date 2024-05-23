import React from "react";
import { CreateProjectModal } from "./async-flow-modals/CreateProjectModal";
import { AddAssetsModal } from "./async-flow-modals/AddAssetsModal";
import { RenameAssetModal } from "./RenameAssetModal";
import { RenameProjectModal } from "./RenameProjectModal";
import { DisplayScreenshotModal } from "./async-flow-modals/DisplayScreenshotModal";
import { DownloadZipfileModal } from "./DownloadZipfileModal";
import { UploadZipfilesModal } from "./UploadZipfilesModal";
import { CodeDiffHelpModal } from "./async-flow-modals/CodeDiffHelpModal";
import { CopyProjectModal } from "./async-flow-modals/CopyProjectModal";
import { CropScaleImageModal } from "./async-flow-modals/CropScaleImageModal";
import { AddClipArtModal } from "./async-flow-modals/AddClipArtModal";
import {
  GoogleAuthenticationStatusModal,
  GoogleGetFilenameFromUserModal,
  GoogleTaskStatusModal,
} from "./GoogleOperationModals";
import { ShareTutorialModal } from "./ShareTutorialModal";
import { ViewCodeDiffModal } from "./ViewCodeDiffModal";
import { VersionOptInOperationModal } from "./VersionOptInOperationModal";

import { DeleteAssetModal } from "./async-flow-modals/DeleteAssetModal";
import { DeleteProjectModal } from "./async-flow-modals/DeleteProjectModal";
import { DeleteManyProjectsModal } from "./async-flow-modals/DeleteManyProjectsModal";

export const AllModals = () => {
  return (
    <>
      <VersionOptInOperationModal />
      <CreateProjectModal />
      <AddAssetsModal />
      <RenameAssetModal />
      <RenameProjectModal />
      <DisplayScreenshotModal />
      <CopyProjectModal />
      <DownloadZipfileModal />
      <UploadZipfilesModal />
      <CodeDiffHelpModal />
      <CropScaleImageModal />
      <AddClipArtModal />
      <GoogleAuthenticationStatusModal />
      <GoogleTaskStatusModal />
      <GoogleGetFilenameFromUserModal />
      <ShareTutorialModal />
      <ViewCodeDiffModal />
      <DeleteAssetModal />
      <DeleteProjectModal />
      <DeleteManyProjectsModal />
    </>
  );
};
