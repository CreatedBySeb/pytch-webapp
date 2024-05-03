import {
  Action as GenericAction,
  Thunk as GenericThunk,
  action,
  thunk,
} from "easy-peasy";
import { IPytchAppModel } from ".";
import { propSetterAction } from "../utils";
import { ProjectContent } from "./project-core";
import { AssetPresentation, IAssetInProject } from "./asset";
import { assetServer } from "../skulpt-connection/asset-server";
import { TransformedAssetDescriptor } from "../database/indexed-db";
import { demoURLFromId, projectDescriptorFromURL } from "../storage/zipfile";

// TODO: Record some information about the various kinds of error?
type CoreState =
  | { kind: "idle" }
  | { kind: "booting" }
  | { kind: "boot-failed" }
  | { kind: "ready"; project: ProjectContent<AssetPresentation> }
  | { kind: "build-failed" }
  | { kind: "launched"; project: ProjectContent<AssetPresentation> }
  | { kind: "runtime-error"; project: ProjectContent<AssetPresentation> };

const kIdleState: CoreState = { kind: "idle" };
const kBootingState: CoreState = { kind: "booting" };

type CoreStateWithProject = CoreState & {
  kind: "ready" | "launched" | "runtime-error";
};

const kindsWithProject: Array<CoreState["kind"]> = [
  "ready",
  "launched",
  "runtime-error",
];

export function stateHasProject(
  state: CoreState
): state is CoreStateWithProject {
  return kindsWithProject.includes(state.kind);
}

async function createAssetPresentation(asset: TransformedAssetDescriptor) {
  await assetServer.prepareFromData(asset);
  const fakeAssetInProject: IAssetInProject = {
    id: "nonsense", // TODO: Could compute hash but don't think it matters.
    name: asset.name,
    mimeType: asset.mimeType,
    transform: asset.transform,
  };
  const createOpts = { prepareAssetServer: false };
  return await AssetPresentation.create(fakeAssetInProject, createOpts);
}

// "Slice action" — Action<> specialised for this slice-type.
type SAction<ArgT> = GenericAction<StandalonePlayDemoState, ArgT>;

// "Slice thunk" — Thunk<> specialised for this slice-type.
type SThunk<ArgT, ResultT = void> = GenericThunk<
  StandalonePlayDemoState,
  ArgT,
  void,
  IPytchAppModel,
  ResultT
>;

type DemoPath = { buildId: string; demoId: string };

export type StandalonePlayDemoState = {
  coreState: CoreState;
  setCoreState: SAction<CoreState>;
  noteBootFailed: SAction<void>;
  noteBuildFailed: SAction<void>;
  noteLaunched: SAction<void>;
  noteRuntimeError: SAction<void>;

  bootIfRequired: SThunk<DemoPath, Promise<void>>;
};

export let standalonePlayDemoState: StandalonePlayDemoState = {
  coreState: kIdleState,
  setCoreState: propSetterAction("coreState"),

  noteBootFailed: action((state) => {
    state.coreState = { kind: "boot-failed" };
  }),

  noteBuildFailed: action((state) => {
    const coreState = state.coreState;
    if (coreState.kind !== "ready")
      throw new Error("can only note build failure if ready");

    state.coreState = { kind: "build-failed" };
  }),

  noteLaunched: action((state) => {
    const coreState = state.coreState;
    if (!stateHasProject(coreState))
      throw new Error("can only launch if state has project");

    state.coreState = { kind: "launched", project: coreState.project };
  }),

  noteRuntimeError: action((state) => {
    const coreState = state.coreState;
    if (coreState.kind !== "launched")
      throw new Error("can only note error if launched");

    state.coreState = {
      kind: "runtime-error",
      project: coreState.project,
    };
  }),

  bootIfRequired: thunk(async (actions, demoPath, helpers) => {
    if (helpers.getState().coreState.kind !== "idle") {
      return;
    }

    actions.setCoreState(kBootingState);

    try {
      const demoURL = demoURLFromId(`${demoPath.buildId}/${demoPath.demoId}`);
      const descriptor = await projectDescriptorFromURL(demoURL);

      assetServer.clear();

      const assetPromises = descriptor.assets.map(createAssetPresentation);
      const assets = await Promise.all(assetPromises);
      const project = { program: descriptor.program, assets };

      actions.setCoreState({ kind: "ready", project });
    } catch /* TODO: Do something with error? */ {
      actions.noteBootFailed();
    }
  }),
};
