import { Action, State, Thunk, action, thunk } from "easy-peasy";
import { IPytchAppModel } from ".";
import { createNewProject } from "../database/indexed-db";
import {
  projectDescriptor,
  wrappedError,
  zipfileDataFromProject,
} from "../storage/zipfile";
import { ValueCell, assertNever, propSetterAction } from "../utils";
import { LinkedContentLoadingState, StoredProjectContent } from "./project";
import { ProjectId } from "./project-core";
import { FileProcessingFailure } from "./user-interactions/process-files";
import { bootApi, AsyncFile, TokenInfo } from "../storage/google-drive";
import {
  AuthenticationInfo,
  GoogleDriveApi,
  GoogleUserInfo,
  unknownGoogleUserInfo,
} from "../storage/google-drive/shared";
import { filenameFormatSpecifier } from "./format-spec-for-linked-content";
import {
  FormatSpecifier,
  applyFormatSpecifier,
  uniqueUserInputFragment,
} from "./compound-text-input";

type ExportProjectDescriptor = {
  project: StoredProjectContent;
  linkedContentLoadingState: LinkedContentLoadingState;
};

type ApiBootStatus =
  | { kind: "not-yet-started" }
  | { kind: "pending" }
  | { kind: "succeeded"; api: GoogleDriveApi }
  | { kind: "failed" };

// There is no such state as "failed".  Instead, an authentication
// failure becomes a task failure, and we drop back to "idle" to allow
// another attempt later.
type AuthenticationState =
  | { kind: "idle" }
  | { kind: "pending"; abortController: AbortController }
  | { kind: "succeeded"; info: AuthenticationInfo };

type TaskOutcome = {
  message?: string;
  successes: Array<string>;
  failures: Array<string>;
};

type TaskState =
  | { kind: "idle" }
  | { kind: "pending"; user: GoogleUserInfo; summary: string }
  | { kind: "pending-already-modal" }
  | {
      kind: "done";
      user: GoogleUserInfo;
      summary: string;
      outcome: TaskOutcome;
    };

type GoogleDriveTask = (
  api: GoogleDriveApi,
  tokenInfo: TokenInfo
) => Promise<TaskOutcome>;

type TaskDescriptor = {
  summary: string;
  run: GoogleDriveTask;
};

type ChooseFilenameOutcome =
  | { kind: "submitted"; filename: string }
  | { kind: "cancelled" };

type ChooseFilenameActiveState = {
  kind: "active";
  formatSpecifier: FormatSpecifier;
  userInput: string;
  justLaunched: boolean;
  resolve: (outcome: ChooseFilenameOutcome) => void;
};

type ChooseFilenameState = { kind: "idle" } | ChooseFilenameActiveState;

type ChooseFilenameFlow = {
  state: ChooseFilenameState;
  setState: Action<ChooseFilenameFlow, ChooseFilenameState>;
  setIdle: Action<ChooseFilenameFlow>;

  _resolve: Thunk<ChooseFilenameFlow, ChooseFilenameOutcome>;

  setUserInput: Action<ChooseFilenameFlow, string>;
  clearJustLaunched: Action<ChooseFilenameFlow>;
  submit: Thunk<ChooseFilenameFlow>;
  cancel: Thunk<ChooseFilenameFlow>;

  outcome: Thunk<
    ChooseFilenameFlow,
    FormatSpecifier,
    void,
    IPytchAppModel,
    Promise<ChooseFilenameOutcome>
  >;
};

// It would be better if the runtime assertions on whether we're "idle"
// or "active" weren't necessary, but it wasn't obvious to me how to
// cleanly get the type system to help.

function ensureFlowState<ReqKind extends ChooseFilenameState["kind"]>(
  label: string,
  flowState: State<ChooseFilenameFlow>,
  requiredKind: ReqKind
): asserts flowState is ChooseFilenameFlow & { state: { kind: ReqKind } } {
  const kind = flowState.state.kind;
  if (kind !== requiredKind)
    throw new Error(
      `${label}(): require state "${requiredKind}" but in "${kind}"`
    );
}

let chooseFilenameFlow: ChooseFilenameFlow = {
  state: { kind: "idle" },
  setState: propSetterAction("state"),
  setIdle: action((state) => {
    state.state = { kind: "idle" };
  }),

  _resolve: thunk((actions, outcome, helpers) => {
    const state = helpers.getState();
    ensureFlowState("_resolve", state, "active");
    state.state.resolve(outcome);
    actions.setIdle();
  }),

  setUserInput: action((state, userInput) => {
    ensureFlowState("setUserInput", state, "active");
    state.state.userInput = userInput;
  }),

  clearJustLaunched: action((state) => {
    ensureFlowState("clearJustLaunched", state, "active");
    state.state.justLaunched = false;
  }),

  submit: thunk((actions, _voidPayload, helpers) => {
    const state = helpers.getState();
    ensureFlowState("submit", state, "active");
    const filename = applyFormatSpecifier(
      state.state.formatSpecifier,
      state.state.userInput
    );
    actions._resolve({ kind: "submitted", filename });
  }),

  cancel: thunk((actions, _voidPayload, helpers) => {
    const state = helpers.getState();
    ensureFlowState("cancel", state, "active");
    actions._resolve({ kind: "cancelled" });
  }),

  outcome: thunk((actions, formatSpecifier, helpers) => {
    ensureFlowState("outcome", helpers.getState(), "idle");
    const userInput = uniqueUserInputFragment(formatSpecifier).initialValue;
    return new Promise<ChooseFilenameOutcome>((resolve) => {
      actions.setState({
        kind: "active",
        formatSpecifier,
        userInput,
        justLaunched: true,
        resolve,
      });
    });
  }),
};

export type GoogleDriveIntegration = {
  apiBootStatus: ApiBootStatus;
  setApiBootStatus: Action<GoogleDriveIntegration, ApiBootStatus>;

  authState: AuthenticationState;
  setAuthState: Action<GoogleDriveIntegration, AuthenticationState>;

  taskState: TaskState;
  setTaskState: Action<GoogleDriveIntegration, TaskState>;

  chooseFilenameFlow: ChooseFilenameFlow;

  maybeBoot: Thunk<GoogleDriveIntegration>;

  requireBooted: Thunk<
    GoogleDriveIntegration,
    void,
    void,
    IPytchAppModel,
    GoogleDriveApi
  >;
  ensureAuthenticated: Thunk<
    GoogleDriveIntegration,
    void,
    void,
    IPytchAppModel,
    Promise<AuthenticationInfo>
  >;

  doTask: Thunk<GoogleDriveIntegration, TaskDescriptor>;

  exportProject: Thunk<GoogleDriveIntegration, ExportProjectDescriptor>;
  importProjects: Thunk<GoogleDriveIntegration, void, void, IPytchAppModel>;
};

type SuccessfulFileImport = {
  filename: string;
  projectId: ProjectId;
};

async function tryImportAsyncFile(
  fileNameCell: ValueCell<string>,
  file: AsyncFile
): Promise<SuccessfulFileImport> {
  // Any of the following might throw an error:
  const fileName = await file.name();
  fileNameCell.set(fileName);

  const zipData = await file.data();
  const projectInfo = await projectDescriptor(fileName, zipData);

  // This clunky try/catch ensures consistency in how we
  // present error messages to the user in case of errors
  // occurring during project or asset creation.
  try {
    // The types overlap so can use projectInfo as creationOptions:
    const project = await createNewProject(projectInfo.name, projectInfo);
    const projectId = project.id;
    return { filename: fileName, projectId };
  } catch (err) {
    throw wrappedError(err as Error);
  }
}

export let googleDriveIntegration: GoogleDriveIntegration = {
  apiBootStatus: { kind: "not-yet-started" },
  setApiBootStatus: propSetterAction("apiBootStatus"),

  authState: { kind: "idle" },
  setAuthState: propSetterAction("authState"),

  taskState: { kind: "idle" },
  setTaskState: propSetterAction("taskState"),

  chooseFilenameFlow,

  maybeBoot: thunk(async (actions, _voidPayload, helpers) => {
    const state = helpers.getState();
    if (state.apiBootStatus.kind !== "not-yet-started") {
      return;
    }

    try {
      actions.setApiBootStatus({ kind: "pending" });
      const api = await bootApi().boot();
      actions.setApiBootStatus({ kind: "succeeded", api });
    } catch (err) {
      // TODO: Any useful way to report this to user?
      console.error("GoogleDriveIntegration.maybeBoot(): boot failed", err);
      actions.setApiBootStatus({ kind: "failed" });
    }
  }),

  requireBooted: thunk((_actions, _voidPayload, helpers) => {
    const apiBootStatus = helpers.getState().apiBootStatus;
    if (apiBootStatus.kind !== "succeeded")
      throw new Error(
        `ensureAuthenticated(): bad api boot status "${apiBootStatus.kind}"`
      );

    return apiBootStatus.api;
  }),

  ensureAuthenticated: thunk(async (actions, _voidPayload, helpers) => {
    const api = actions.requireBooted();
    const authState = helpers.getState().authState;

    switch (authState.kind) {
      case "pending":
        throw new Error(`ensureAuthenticated(): bad state "pending"`);
      case "succeeded":
        return authState.info;
      case "idle": {
        const abortController = new AbortController();
        actions.setAuthState({ kind: "pending", abortController });
        const signal = abortController.signal;
        const tokenInfo = await api.acquireToken({ signal });
        const user = await api.getUserInfo(tokenInfo);
        const authInfo = { tokenInfo, user };
        actions.setAuthState({ kind: "succeeded", info: authInfo });
        return authInfo;
      }
      default:
        return assertNever(authState);
    }
  }),

  doTask: thunk(async (actions, task) => {
    const api = actions.requireBooted();
    const summary = task.summary;

    try {
      const { tokenInfo, user } = await actions.ensureAuthenticated();
      actions.setTaskState({ kind: "pending", user, summary });
      const outcome = await task.run(api, tokenInfo);
      actions.setTaskState({ kind: "done", user, summary, outcome });
    } catch (err) {
      console.log("doTask(): caught", err);
      const errMessage = (err as Error).message;

      // It might not be the case that auth failed.  But one likely
      // reason for error is that auth has become invalid, so it might
      // be useful to throw away token and hope it works next time.
      // TODO: Is this reasonable?
      actions.setAuthState({ kind: "idle" });

      const outcome = { successes: [], failures: [errMessage] };
      const user = unknownGoogleUserInfo;
      actions.setTaskState({ kind: "done", user, summary, outcome });
    }
  }),

  exportProject: thunk(async (actions, descriptor) => {
    // Any errors thrown from run() will be caught by doTask().
    const run: GoogleDriveTask = async (api, tokenInfo) => {
      const formatSpecifier = filenameFormatSpecifier(
        descriptor.linkedContentLoadingState
      );
      const chooseFilenameOutcome = await actions.chooseFilenameFlow.outcome(
        formatSpecifier
      );

      if (chooseFilenameOutcome.kind === "cancelled")
        return {
          successes: [],
          failures: ["User cancelled export"],
        };

      const rawFilename = chooseFilenameOutcome.filename;
      const filename = rawFilename.endsWith(".zip")
        ? rawFilename
        : `${rawFilename}.zip`;

      const file: AsyncFile = {
        name: () => Promise.resolve(filename),
        mimeType: () => Promise.resolve("application/zip"),
        data: () => zipfileDataFromProject(descriptor.project),
      };

      await api.exportFile(tokenInfo, file);

      return {
        successes: [`Project exported to "${filename}"`],
        failures: [],
      };
    };

    actions.doTask({ summary: "Export to Google Drive", run });
  }),

  importProjects: thunk(async (actions, _voidPayload, helpers) => {
    const allActions = helpers.getStoreActions();

    // Any errors thrown from run() will be caught by doTask().
    const run: GoogleDriveTask = async (api, tokenInfo) => {
      const savedTaskState = helpers.getState().taskState;
      actions.setTaskState({ kind: "pending-already-modal" });

      const { files: filesPromise } = api.importFiles(tokenInfo);

      const files = await filesPromise;

      actions.setTaskState(savedTaskState);

      let successfulImports: Array<SuccessfulFileImport> = [];
      let failures: Array<FileProcessingFailure> = [];

      for (const file of files) {
        let fileName = "<file with unknown name>";
        try {
          // Either of the following might throw an error:
          fileName = await file.name();
          const zipData = await file.data();
          const projectInfo = await projectDescriptor(fileName, zipData);

          // This clunky nested try/catch ensures consistency in how we
          // present error messages to the user in case of errors
          // occurring during project or asset creation.
          try {
            // The types overlap so can use projectInfo as creationOptions:
            const project = await createNewProject(
              projectInfo.name,
              projectInfo
            );
            const projectId = project.id;
            successfulImports.push({ filename: fileName, projectId });
          } catch (err) {
            throw wrappedError(err as Error);
          }
        } catch (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          e: any
        ) {
          console.error("importProjects():", fileName, e);
          failures.push({ fileName, reason: e.message });
        }
      }

      const message = files.length === 0 ? "No files selected." : undefined;
      const taskSuccesses = successfulImports.map(
        (success) => `Imported "${success.filename}"`
      );
      const taskFailures = failures.map(
        (failure) => `"${failure.fileName}" — ${failure.reason}`
      );
      const outcome: TaskOutcome = {
        message,
        successes: taskSuccesses,
        failures: taskFailures,
      };

      const nSuccesses = successfulImports.length;
      const nFailures = failures.length;

      if (nSuccesses > 0) {
        allActions.projectCollection.noteDatabaseChange();
      }

      if (nFailures === 0 && nSuccesses === 1) {
        const soleProjectId = successfulImports[0].projectId;
        allActions.navigationRequestQueue.enqueue({
          path: `/ide/${soleProjectId}`,
        });
      }

      console.log("importProjects(): returning", outcome);
      return outcome;
    };

    actions.doTask({ summary: "Import from Google Drive", run });
  }),
};
