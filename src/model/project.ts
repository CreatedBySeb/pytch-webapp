import { IAssetInProject, AssetPresentation } from "./asset";

import { ProjectId, ITrackedTutorial, StoredProjectData } from "./project-core";
import {
  LinkedContentRef,
  LinkedContentRefNone,
  LinkedContent,
  eqLinkedContentRefs,
  linkedContentIsReferent,
  lessonDescriptorFromRelativePath,
} from "./linked-content";
import { Action, action, Thunk, thunk, Computed, computed } from "easy-peasy";
import {
  projectDescriptor,
  addAssetToProject,
  updateProject,
  assetsInProject,
  deleteAssetFromProject,
  renameAssetInProject,
  projectSummary,
  updateAssetTransform,
} from "../database/indexed-db";

import { AssetTransform } from "./asset";
import {
  build,
  BuildOutcomeKind,
  BuildOutcome,
} from "../skulpt-connection/build";
import { IPytchAppModel } from ".";
import { assetServer } from "../skulpt-connection/asset-server";
import { assertNever, failIfNull, propSetterAction } from "../utils";
import { codeJustBeforeWipChapter, tutorialContentFromHTML } from "./tutorial";
import { liveReloadURL } from "./live-reload";

import { aceController } from "../skulpt-connection/code-editor";
import { PytchProgramOps } from "./pytch-program";
import { Uuid } from "./junior/structured-program/core-types";
import {
  HandlerDeletionDescriptor,
  HandlerUpsertionDescriptor,
  PythonCodeUpdateDescriptor,
  StructuredProgramOps,
} from "./junior/structured-program/program";

const ensureKind = PytchProgramOps.ensureKind;

type FocusDestination = "editor" | "running-project";

/** A project which is stored in the browser's indexed-DB and whose
 * assets are described by their ID (rather than their data). */
export type StoredProjectDescriptor = StoredProjectData<IAssetInProject>;

/** A project which is stored in the browser's indexed-DB and whose
 * assets are stored in a form ready for use in the DOM.  E.g., images
 * are stored as `HTMLImageElement` instances.  (In fact sounds are not
 * stored like this because have not yet worked out how to get a
 * suitable `AudioContext`.) */
export type StoredProjectContent = StoredProjectData<AssetPresentation>;

// TODO: Add error message or similar to "failed".
type SyncRequestOutcome = "succeeded" | "failed";
type SyncRequestState = "pending" | SyncRequestOutcome;

interface ILoadSaveRequest {
  projectId: ProjectId;
  seqnum: number;
  state: SyncRequestState;
}

export interface ILoadSaveStatus {
  loadState: SyncRequestState;
  saveState: SyncRequestState;
}

export const equalILoadSaveStatus = (x: ILoadSaveStatus, y: ILoadSaveStatus) =>
  x.loadState === y.loadState && x.saveState === y.saveState;

// Used elsewhere but maybe those places needed review too?
export enum SyncState {
  SyncNotStarted,
  SyncingFromBackEnd,
  SyncingToBackEnd,
  Syncd,
  Error,
}

interface ISetCodeTextAndBuildPayload {
  codeText: string;
  focusDestination: FocusDestination;
}

export interface IAddAssetDescriptor {
  name: string;
  mimeType: string;
  data: ArrayBuffer;
}

export interface IDeleteAssetDescriptor {
  name: string;
}

export interface IRenameAssetDescriptor {
  oldName: string;
  newName: string;
}

export interface IRenameProjectDescriptor {
  projectId: ProjectId;
  newName: string;
}

export type AssetLocator = {
  projectId: ProjectId;
  assetName: string;
};

export type UpdateAssetTransformDescriptor = AssetLocator & {
  newTransform: AssetTransform;
};

interface ILiveReloadInfoMessage {
  kind: "info";
  message: string;
}

interface ILiveReloadCodeMessage {
  kind: "code";
  text: string;
}

interface ILiveReloadTutorialMessage {
  kind: "tutorial";
  tutorial_name: string;
  text: string;
}

type ILiveReloadMessage =
  | ILiveReloadInfoMessage
  | ILiveReloadCodeMessage
  | ILiveReloadTutorialMessage;

type CodeStateVsStorage =
  | "unsaved-changes-exist"
  | "no-changes-since-last-save";

export type LinkedContentLoadingState =
  | { kind: "idle" }
  | { kind: "pending"; linkedContentRef: LinkedContentRef }
  | { kind: "succeeded"; linkedContent: LinkedContent }
  | { kind: "failed" };

export interface IActiveProject {
  latestLoadRequest: ILoadSaveRequest;
  latestSaveRequest: ILoadSaveRequest;

  noteLoadRequest: Action<IActiveProject, ILoadSaveRequest>;
  noteLoadRequestOutcome: Action<IActiveProject, SyncRequestOutcome>;
  noteSaveRequest: Action<IActiveProject, ILoadSaveRequest>;
  noteSaveRequestOutcome: Action<IActiveProject, SyncRequestOutcome>;

  syncState: Computed<IActiveProject, ILoadSaveStatus>;
  project: StoredProjectContent;

  linkedContentLoadingState: LinkedContentLoadingState;
  setLinkedContentLoadingState: Action<
    IActiveProject,
    LinkedContentLoadingState
  >;

  editSeqNum: number;
  lastSyncFromStorageSeqNum: number;
  codeStateVsStorage: CodeStateVsStorage;
  buildSeqnum: number;
  tutorialNavigationSeqnum: number;

  haveProject: Computed<IActiveProject, boolean>;

  initialiseContent: Action<IActiveProject, StoredProjectContent>;
  setAssets: Action<IActiveProject, Array<AssetPresentation>>;

  syncDummyProject: Action<IActiveProject>;
  ensureSyncFromStorage: Thunk<IActiveProject, ProjectId, void, IPytchAppModel>;
  doLinkedContentLoadTask: Thunk<IActiveProject, LinkedContentRef>;
  syncAssetsFromStorage: Thunk<IActiveProject, void, void, IPytchAppModel>;
  deactivate: Thunk<IActiveProject>;

  addAssetAndSync: Thunk<
    IActiveProject,
    IAddAssetDescriptor,
    void,
    IPytchAppModel
  >;
  deleteAssetAndSync: Thunk<
    IActiveProject,
    IDeleteAssetDescriptor,
    void,
    IPytchAppModel
  >;
  renameAssetAndSync: Thunk<
    IActiveProject,
    IRenameAssetDescriptor,
    void,
    IPytchAppModel
  >;
  updateAssetTransformAndSync: Thunk<
    IActiveProject,
    UpdateAssetTransformDescriptor,
    void,
    IPytchAppModel
  >;

  ////////////////////////////////////////////////////////////////////////
  // Only relevant when working with a "per-method" program:

  addSprite: Action<IActiveProject, string>;
  deleteSprite: Thunk<IActiveProject, Uuid, void, IPytchAppModel, Uuid>;

  upsertHandler: Action<IActiveProject, HandlerUpsertionDescriptor>;
  setHandlerPythonCode: Action<IActiveProject, PythonCodeUpdateDescriptor>;
  deleteHandler: Action<IActiveProject, HandlerDeletionDescriptor>;

  ////////////////////////////////////////////////////////////////////////

  setCodeText: Action<IActiveProject, string>;
  setCodeTextAndBuild: Thunk<IActiveProject, ISetCodeTextAndBuildPayload>;
  requestSyncToStorage: Thunk<IActiveProject, void, void, IPytchAppModel>;
  noteCodeChange: Action<IActiveProject>;
  noteCodeSaved: Action<IActiveProject>;

  /** Replace the content and current chapter of the tutorial, syncing
   * the code to the code as of the end of the previous chapter.  Only
   * meant to be used as part of the support mechanism for tutorial
   * development with the live-reload watcher.
   */
  replaceTutorialAndSyncCode: Action<IActiveProject, ITrackedTutorial>;

  handleLiveReloadMessage: Thunk<IActiveProject, string, void, IPytchAppModel>;
  handleLiveReloadError: Thunk<IActiveProject, void, void, IPytchAppModel>;

  setActiveTutorialChapter: Action<IActiveProject, number>;

  incrementBuildSeqnum: Action<IActiveProject>;
  build: Thunk<IActiveProject, FocusDestination, void, IPytchAppModel>;
}

const dummyPytchProgram = PytchProgramOps.fromPythonCode(
  "#\n# Your project is loading....\n#\n"
);

const dummyProject: StoredProjectContent = {
  id: -1,
  name: "...Loading project...",
  program: dummyPytchProgram,
  assets: [],
  linkedContentRef: LinkedContentRefNone,
};

const failIfDummy = (project: StoredProjectContent, label: string) => {
  if (project.id === -1) {
    throw new Error(`${label}: cannot work with dummy project`);
  }
};

export const activeProject: IActiveProject = {
  // Auto-increment ID is always positive, so "-1" will never compare
  // equal to a real project-id.
  latestLoadRequest: { projectId: -1, seqnum: 1000, state: "failed" },
  latestSaveRequest: { projectId: -1, seqnum: 1000, state: "failed" },

  noteLoadRequest: action((state, request) => {
    state.latestLoadRequest = request;
  }),
  noteLoadRequestOutcome: action((state, outcome) => {
    state.latestLoadRequest.state = outcome;
  }),
  noteSaveRequest: action((state, request) => {
    state.latestSaveRequest = request;
  }),
  noteSaveRequestOutcome: action((state, outcome) => {
    state.latestSaveRequest.state = outcome;
  }),

  syncState: computed((state) => ({
    loadState: state.latestLoadRequest.state,
    saveState: state.latestSaveRequest.state,
  })),

  project: dummyProject,

  linkedContentLoadingState: { kind: "idle" },
  setLinkedContentLoadingState: propSetterAction("linkedContentLoadingState"),

  editSeqNum: 1,
  lastSyncFromStorageSeqNum: 0,

  codeStateVsStorage: "no-changes-since-last-save",
  buildSeqnum: 0,
  tutorialNavigationSeqnum: 0,

  noteCodeChange: action((state) => {
    state.codeStateVsStorage = "unsaved-changes-exist";
  }),
  noteCodeSaved: action((state) => {
    state.codeStateVsStorage = "no-changes-since-last-save";
  }),

  haveProject: computed((state) => state.project.id !== -1),

  initialiseContent: action((state, content) => {
    state.project = content;
    state.editSeqNum += 1;
    state.lastSyncFromStorageSeqNum = state.editSeqNum;
    console.log("have set project content for id", content.id);
  }),

  setAssets: action((state, assetPresentations) => {
    let project = state.project;
    failIfDummy(project, "setAssets");
    project.assets = assetPresentations;
  }),

  ////////////////////////////////////////////////////////////////////////

  addSprite: action((state, name) => {
    let project = state.project;
    failIfDummy(project, "addSprite");
    let program = ensureKind("addSprite()", project.program, "per-method");
    StructuredProgramOps.addSprite(program.program, name);
  }),

  deleteSprite: thunk((_actions, actorId, helpers) => {
    let project = helpers.getState().project;
    failIfDummy(project, "deleteSprite");
    let program = ensureKind("deleteSprite()", project.program, "per-method");
    return StructuredProgramOps.deleteSprite(program.program, actorId);
  }),

  upsertHandler: action((state, upsertionDescriptor) => {
    let project = state.project;
    failIfDummy(project, "upsertHandler");
    let program = ensureKind("upsertHandler()", project.program, "per-method");
    StructuredProgramOps.upsertHandler(program.program, upsertionDescriptor);
  }),

  setHandlerPythonCode: action((state, updateDescriptor) => {
    let project = state.project;
    failIfDummy(project, "setHandlerPythonCode");
    let program = ensureKind(
      "setHandlerPythonCode()",
      project.program,
      "per-method"
    );
    StructuredProgramOps.updatePythonCode(program.program, updateDescriptor);
  }),

  deleteHandler: action((state, deletionDescriptor) => {
    let project = state.project;
    failIfDummy(project, "deleteHandler");
    let program = ensureKind("deleteHandler()", project.program, "per-method");
    StructuredProgramOps.deleteHandler(program.program, deletionDescriptor);
    // TODO: Examine return value for failure.
  }),

  ////////////////////////////////////////////////////////////////////////

  setCodeText: action((state, text) => {
    let project = state.project;
    failIfDummy(project, "setCodeText");

    let program = ensureKind("setCodeText()", project.program, "flat");
    program.text = text;
    state.editSeqNum += 1;
  }),

  setCodeTextAndBuild: thunk(async (actions, payload) => {
    actions.setCodeText(payload.codeText);
    await actions.build(payload.focusDestination);
  }),

  syncDummyProject: action((state) => {
    const newSeqnum = state.latestLoadRequest.seqnum + 1;

    state.latestLoadRequest = {
      projectId: -1,
      seqnum: newSeqnum,
      state: "failed",
    };

    state.project = dummyProject;
  }),

  // Because the DB operations are all asynchronous, we must cope with the
  // situation where the user:
  //
  // navigates to a particular project
  // navigates back to their project list
  // navigates to a second project
  //
  // in quick succession, such that the first project's data hasn't
  // arrived by the time the second project's load request is
  // launched.  When the first project's data does arrive, we want to
  // throw it away.  We do this by maintaining state describing the
  // 'latest load request'.  It contains a sequence number,
  // incremented whenever we start work on a new load request.  When
  // the data relating to a load request with a particular sequence
  // number becomes available, we only act on it (i.e., set the active
  // project's contents) if our sequence number matches that of the
  // now-current live load request.  Otherwise, we conclude that a
  // later load request was started, and throw away the data we've
  // found.  A dummy project, with a "succeeded" load-request status
  // which can be set synchronously, allows us to work consistently
  // with deactivating a project.
  //
  ensureSyncFromStorage: thunk(async (actions, projectId, helpers) => {
    console.log("ensureSyncFromStorage(): starting for", projectId);

    const previousLoadRequest = helpers.getState().latestLoadRequest;

    if (previousLoadRequest.projectId === projectId) {
      console.log("ensureSyncFromStorage(): already requested; leaving");
      return;
    }

    const ourSeqnum = previousLoadRequest.seqnum + 1;
    console.log("ensureSyncFromStorage(): starting; seqnum", ourSeqnum);

    actions.noteLoadRequest({ projectId, seqnum: ourSeqnum, state: "pending" });

    const storeActions = helpers.getStoreActions();

    storeActions.standardOutputPane.clear();
    storeActions.errorReportList.clear();
    actions.noteCodeSaved();

    try {
      const summary = await projectSummary(projectId);

      // Just set this off; do not await it.  If the network is slow or
      // broken we don't want to hold up the rest of the student's work.
      actions.doLinkedContentLoadTask(summary.linkedContentRef);

      const descriptor = await projectDescriptor(projectId);
      const initialTabKey =
        descriptor.trackedTutorial != null ? "tutorial" : "assets";

      // TODO: Should the asset-server be local to the project?  Might
      // save all the to/fro with prepare/clear and knowing when to revoke
      // the image-urls?

      const assetPresentations = await Promise.all(
        descriptor.assets.map((a) => AssetPresentation.create(a))
      );

      const content: StoredProjectContent = {
        id: descriptor.id,
        name: summary.name,
        assets: assetPresentations,
        program: descriptor.program,
        linkedContentRef: descriptor.linkedContentRef,
        trackedTutorial: descriptor.trackedTutorial,
      };

      // We now have everything we need.  Is the caller still interested
      // in it?  The live load request might have been re-assigned, so
      // re-extract it:
      const liveLoadRequest = helpers.getState().latestLoadRequest;
      if (liveLoadRequest.seqnum !== ourSeqnum) {
        console.log(
          "ensureSyncFromStorage():" +
            ` live seqnum is ${liveLoadRequest.seqnum}` +
            ` but we are working on ${ourSeqnum}; abandoning`
        );
        return;
      }

      actions.initialiseContent(content);
      if (content.trackedTutorial != null) {
        actions.setActiveTutorialChapter(
          content.trackedTutorial.activeChapterIndex
        );
      }

      if (content.program.kind === "per-method") {
        storeActions.jrEditState.bootForProgram(content.program.program);
      }

      actions.noteLoadRequestOutcome("succeeded");
      storeActions.infoPanel.setActiveTabKey(initialTabKey);
    } catch (err) {
      // TODO: Is there anything more intelligent we can do as
      // far as reporting to the user is concerned?
      console.log(`error loading project ${projectId}:`, err);
      actions.noteLoadRequestOutcome("failed");
    }

    console.log("ensureSyncFromStorage(): leaving");
  }),

  doLinkedContentLoadTask: thunk(async (actions, linkedContentRef, helpers) => {
    const initialState = helpers.getState().linkedContentLoadingState;

    const correctLoadIsPending =
      initialState.kind === "pending" &&
      eqLinkedContentRefs(linkedContentRef, initialState.linkedContentRef);
    const correctLoadHasSucceeded =
      initialState.kind === "succeeded" &&
      linkedContentIsReferent(linkedContentRef, initialState.linkedContent);
    if (correctLoadIsPending || correctLoadHasSucceeded) {
      return;
    }

    actions.setLinkedContentLoadingState({
      kind: "pending",
      linkedContentRef: linkedContentRef,
    });

    try {
      switch (linkedContentRef.kind) {
        case "none": {
          actions.setLinkedContentLoadingState({
            kind: "succeeded",
            linkedContent: { kind: "none" },
          });
          break;
        }
        case "specimen": {
          const contentHash = linkedContentRef.specimenContentHash;
          const relativePath = `_by_content_hash_/${contentHash}`;
          const lesson = await lessonDescriptorFromRelativePath(relativePath);

          const liveState = helpers.getState().linkedContentLoadingState;
          const requestStillWanted =
            liveState.kind === "pending" &&
            eqLinkedContentRefs(liveState.linkedContentRef, linkedContentRef);
          if (!requestStillWanted) {
            break;
          }

          actions.setLinkedContentLoadingState({
            kind: "succeeded",
            linkedContent: { kind: "specimen", lesson },
          });
          break;
        }
        default:
          assertNever(linkedContentRef);
      }
    } catch (e) {
      console.error("doLinkedLessonLoadTask():", e);
      actions.setLinkedContentLoadingState({ kind: "failed" });
    }
  }),

  syncAssetsFromStorage: thunk(async (actions, _voidPayload, helpers) => {
    // TODO: Does this have a race if the active project changes while
    // we're in the middle of working?

    // The assetServer is told about all assets afresh, one by one,
    // via the calls to AssetPresentation.create() below.  So clear
    // the asset-server before we start.
    assetServer.clear();

    const project = helpers.getState().project;
    failIfDummy(project, "syncAssetsFromStorage");

    const assets = await assetsInProject(project.id);
    const assetPresentations = await Promise.all(
      assets.map((a) => AssetPresentation.create(a))
    );

    actions.setAssets(assetPresentations);
  }),

  deactivate: thunk((actions) => {
    actions.syncDummyProject();
    assetServer.clear();
  }),

  addAssetAndSync: thunk(async (actions, descriptor, helpers) => {
    console.log(
      `adding asset ${descriptor.name}: ${descriptor.mimeType}` +
        ` (${descriptor.data.byteLength} bytes)`
    );

    const project = helpers.getState().project;
    failIfDummy(project, "addAssetAndSync");

    await addAssetToProject(
      project.id,
      descriptor.name,
      descriptor.mimeType,
      descriptor.data
    );

    await actions.syncAssetsFromStorage();

    helpers.getStoreActions().projectCollection.noteDatabaseChange();
  }),

  deleteAssetAndSync: thunk(async (actions, descriptor, helpers) => {
    const project = helpers.getState().project;
    failIfDummy(project, "deleteAssetAndSync");

    await deleteAssetFromProject(project.id, descriptor.name);
    await actions.syncAssetsFromStorage();
    helpers.getStoreActions().projectCollection.noteDatabaseChange();
  }),

  renameAssetAndSync: thunk(async (actions, descriptor, helpers) => {
    const project = helpers.getState().project;
    failIfDummy(project, "renameAssetAndSync");

    await renameAssetInProject(
      project.id,
      descriptor.oldName,
      descriptor.newName
    );
    await actions.syncAssetsFromStorage();
    helpers.getStoreActions().projectCollection.noteDatabaseChange();
  }),

  // This Action lives within activeProject but the project containing
  // the asset whose transform is to be updated is identified by a
  // property ("projectId") of the descriptor.  Seems clunky; revisit?
  updateAssetTransformAndSync: thunk(async (actions, descriptor, helpers) => {
    await updateAssetTransform(
      descriptor.projectId,
      descriptor.assetName,
      descriptor.newTransform
    );
    await actions.syncAssetsFromStorage();
    helpers.getStoreActions().projectCollection.noteDatabaseChange();
  }),

  requestSyncToStorage: thunk(async (actions, _payload, helpers) => {
    const project = helpers.getState().project;
    const projectId = project.id;

    const previousSaveRequest = helpers.getState().latestSaveRequest;
    const ourSeqnum = previousSaveRequest.seqnum + 1;

    console.log("requestSyncToStorage(): starting; seqnum", ourSeqnum);
    actions.noteSaveRequest({ projectId, seqnum: ourSeqnum, state: "pending" });

    await updateProject(
      projectId,
      project.program,
      project.trackedTutorial?.activeChapterIndex
    );

    helpers.getStoreActions().projectCollection.noteDatabaseChange();

    const liveSaveRequest = helpers.getState().latestSaveRequest;
    if (liveSaveRequest.seqnum === ourSeqnum) {
      console.log(`requestSyncToStorage(): noting success for ${ourSeqnum}`);
      actions.noteSaveRequestOutcome("succeeded");
      actions.noteCodeSaved();
    }
    console.log("requestSyncToStorage(): leaving");
  }),

  replaceTutorialAndSyncCode: action((state, trackedTutorial) => {
    let project = state.project;
    failIfDummy(project, "replaceTutorialAndSyncCode");

    project.trackedTutorial = trackedTutorial;

    const tutorialContent = trackedTutorial.content;
    if (tutorialContent.workInProgressChapter != null) {
      const newCode = codeJustBeforeWipChapter(tutorialContent);
      project.program = PytchProgramOps.fromPythonCode(newCode);
    }
  }),

  handleLiveReloadMessage: thunk((actions, messageString, helpers) => {
    const { appendTimestamped } = helpers.getStoreActions().editorWebSocketLog;

    const message = JSON.parse(messageString) as ILiveReloadMessage;

    switch (message.kind) {
      case "info": {
        appendTimestamped(`server:info: ${message.message}`);
        break;
      }
      case "code": {
        const codeText: string = message.text;
        appendTimestamped(`server:code: update of length ${codeText.length}`);

        actions.setCodeTextAndBuild({
          codeText,
          focusDestination: "running-project",
        });

        break;
      }
      case "tutorial": {
        const newContent = tutorialContentFromHTML(
          message.tutorial_name,
          message.text
        );
        const wipChapter = newContent.workInProgressChapter;
        appendTimestamped(
          `server:tutorial: update; ${newContent.chapters.length} chapter/s` +
            (wipChapter != null
              ? `; working on chapter ${wipChapter}` +
                ` "${newContent.chapters[wipChapter].title}"`
              : "")
        );
        const newTrackedTutorial = {
          content: newContent,
          activeChapterIndex: wipChapter ?? 0,
        };
        actions.replaceTutorialAndSyncCode(newTrackedTutorial);
        break;
      }
      default:
        // If we keep our promise to TypeScript that the message string can be
        // parsed into an ILiveReloadMessage, then this can never happen, but we
        // might inadvertently break that promise one day.
        assertNever(message);
    }
  }),

  handleLiveReloadError: thunk((_actions, _voidPayload, helpers) => {
    const { appendTimestamped } = helpers.getStoreActions().editorWebSocketLog;
    appendTimestamped(
      `error with websocket connection;` +
        ` ensure server is running at ${liveReloadURL}`
    );
  }),

  setActiveTutorialChapter: action((state, chapterIndex) => {
    const project = state.project;
    failIfDummy(project, "setActiveTutorialChapter");

    const trackedTutorial = failIfNull(
      project.trackedTutorial,
      "cannot set active tutorial chapter if project is not tracking a tutorial"
    );

    trackedTutorial.activeChapterIndex = chapterIndex;
    state.tutorialNavigationSeqnum += 1;
  }),

  incrementBuildSeqnum: action((state) => {
    state.buildSeqnum += 1;
  }),

  build: thunk(
    async (actions, focusDestination, helpers): Promise<BuildOutcome> => {
      const project = helpers.getState().project;
      failIfDummy(project, "build");

      const storeActions = helpers.getStoreActions();

      // TODO: Some flakiness observed in cy:parallel runs, suspected
      // race between clearing and starting to add to the stdout text.
      storeActions.standardOutputPane.clear();
      storeActions.errorReportList.clear();

      const appendOutput = storeActions.standardOutputPane.append;
      const appendError = storeActions.errorReportList.append;

      // Switch both UIs to the "errors" pane; the one we're not using
      // won't mind.
      const switchToErrorPane = () => {
        storeActions.infoPanel.setActiveTabKey("errors");
        storeActions.jrEditState.setInfoPanelActiveTab("errors");
      };

      const ensureNotFullScreen = storeActions.ideLayout.ensureNotFullScreen;

      // TODO: Types for args.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const recordError = (pytchError: any, errorContext: any) => {
        console.log("build.recordError():", pytchError, errorContext);
        appendError({ pytchError, errorContext: errorContext });
        switchToErrorPane();
      };

      // Do this directly rather than via the action, because we don't
      // want the IDE to re-render with its 'Saving...' overlay and the
      // reset of the current live Skulpt project.
      await updateProject(
        project.id,
        project.program,
        project.trackedTutorial?.activeChapterIndex
      );
      // which does mean we need to do this bit ourselves too, ugh:
      helpers.getStoreActions().projectCollection.noteDatabaseChange();

      const buildOutcome = await build(project, appendOutput, recordError);
      console.log("build outcome:", buildOutcome);

      if (buildOutcome.kind === BuildOutcomeKind.Success) {
        switch (focusDestination) {
          case "running-project":
            document.getElementById("pytch-speech-bubbles")?.focus();
            break;
          case "editor":
            aceController?.focus();
            break;
        }
      }

      if (buildOutcome.kind === BuildOutcomeKind.Failure) {
        const buildError = buildOutcome.error;
        if (buildError.tp$name !== "PytchBuildError") {
          throw Error(
            `error thrown during build was ${buildError.tp$name} not PytchBuildError`
          );
        }

        if (buildError.innerError.tp$name === "TigerPythonSyntaxAnalysis") {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          buildError.innerError.syntax_errors.forEach((err: any) => {
            recordError(err, {
              kind: "build",
              phase: buildError.phase,
              phaseDetail: buildError.phaseDetail,
            });
          });
        } else {
          recordError(buildError.innerError, {
            kind: "build",
            phase: buildError.phase,
            phaseDetail: buildError.phaseDetail,
          });
        }

        ensureNotFullScreen();
      }

      actions.incrementBuildSeqnum();
      actions.noteCodeSaved();
      storeActions.ideLayout.maybeAdvanceTour("green-flag");

      return buildOutcome;
    }
  ),
};
