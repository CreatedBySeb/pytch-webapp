import { IClipArtGallery, clipArtGallery } from "./clipart-gallery";
import {
  NavigationRequestQueue,
  navigationRequestQueue,
} from "./navigation-request-queue";
import { projectCollection, IProjectCollection } from "./projects";
import {
  ideLayout,
  IIDELayout,
  userConfirmations,
  IUserConfirmations,
  infoPanel,
  IInfoPanel,
  standardOutputPane,
  editorWebSocketLog,
  IPlainTextPane,
  errorReportList,
  IErrorReportList,
} from "./ui";

import {
  EditState as JrEditState,
  editState as jrEditState,
} from "./junior/edit-state";

import { activeProject, IActiveProject } from "./project";
import { tutorialCollection, ITutorialCollection } from "./tutorials";
import { reloadServer, IReloadServer } from "./live-reload";
import { userTextInput, IUserTextInput } from "./user-text-input";
import { variableWatchers, IVariableWatchers } from "./variable-watchers";
import {
  demoFromZipfileURL,
  IDemoFromZipfileURL,
} from "./demo-from-zipfile-url";
import {
  projectFromSpecimenFlow,
  ProjectFromSpecimenFlow,
} from "./project-from-specimen";
import { ActionCreator, Actions, State, ThunkCreator } from "easy-peasy";

import {
  GoogleDriveIntegration,
  googleDriveIntegration,
} from "./google-drive-import-export";
import { VersionOptIn, versionOptIn } from "./version-opt-in";
import {
  StandalonePlayDemoState,
  standalonePlayDemoState,
} from "./standalone-play-demo";
import { useStoreActions, useStoreState } from "../store";

export interface IPytchAppModel {
  versionOptIn: VersionOptIn;
  navigationRequestQueue: NavigationRequestQueue;
  projectCollection: IProjectCollection;
  activeProject: IActiveProject;
  tutorialCollection: ITutorialCollection;
  ideLayout: IIDELayout;
  jrEditState: JrEditState;
  userConfirmations: IUserConfirmations;
  infoPanel: IInfoPanel;
  standardOutputPane: IPlainTextPane;
  errorReportList: IErrorReportList;
  reloadServer: IReloadServer;
  editorWebSocketLog: IPlainTextPane;
  userTextInput: IUserTextInput;
  variableWatchers: IVariableWatchers;
  demoFromZipfileURL: IDemoFromZipfileURL;
  projectFromSpecimenFlow: ProjectFromSpecimenFlow;
  clipArtGallery: IClipArtGallery;
  googleDriveImportExport: GoogleDriveIntegration;
  standalonePlayDemoState: StandalonePlayDemoState;
}

export type PytchAppModelActions = Actions<IPytchAppModel>;

export const pytchAppModel: IPytchAppModel = {
  versionOptIn,
  navigationRequestQueue,
  projectCollection,
  activeProject,
  tutorialCollection,
  ideLayout,
  jrEditState,
  userConfirmations,
  infoPanel,
  standardOutputPane,
  errorReportList,
  reloadServer,
  editorWebSocketLog,
  userTextInput,
  variableWatchers,
  demoFromZipfileURL,
  projectFromSpecimenFlow,
  clipArtGallery,
  googleDriveImportExport: googleDriveIntegration,
  standalonePlayDemoState,
};

export function useFlowState<ResultT>(
  flowMapper: (flows: State<IUserConfirmations>) => ResultT
) {
  return useStoreState((state) => flowMapper(state.userConfirmations));
}

export function useFlowActions<ResultT>(
  flowMapper: (flows: Actions<IUserConfirmations>) => ResultT
) {
  return useStoreActions((actions) => flowMapper(actions.userConfirmations));
}

type HasRunActionOrThunk<RunArgsT> = {
  run: ActionCreator<RunArgsT> | ThunkCreator<RunArgsT, void>;
};

export function useRunFlow<RunArgsT>(
  flowMapper: (
    flows: Actions<IUserConfirmations>
  ) => HasRunActionOrThunk<RunArgsT>
) {
  return useStoreActions(
    (actions) => flowMapper(actions.userConfirmations).run
  );
}
