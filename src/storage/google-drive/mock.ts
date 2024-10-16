import { AsyncFile, GoogleDriveApi, GoogleDriveBootApi } from "./shared";
import { ValueCell, assertNever, delaySeconds } from "../../utils";

type CallBehaviour = {
  boot: "ok" | "fail" | "stall";
  acquireToken: "ok" | "wait" | "fail";
  getUserInfo: "ok" | "fail";
  exportFile: "ok" | "fail";
  importFiles:
    | { kind: "fail"; message: string }
    | { kind: "wait"; wasCancelled: ValueCell<boolean> }
    | { kind: "ok"; files: Array<AsyncFile>; wasCancelled: ValueCell<boolean> };
};

export type MockApiBehaviour = {
  [Prop in keyof CallBehaviour]: Array<CallBehaviour[Prop]>;
};

const mockBehaviourSpec = async (): Promise<MockApiBehaviour> => {
  let spec = null;

  while (spec == null) {
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    spec = (window as any).$GoogleDriveApiBehaviour;
    await delaySeconds(0.2);
  }

  return spec as MockApiBehaviour;
};

function shiftBehaviourOrFail<Prop extends keyof CallBehaviour>(
  spec: MockApiBehaviour,
  prop: Prop
): CallBehaviour[Prop] {
  const behaviour = spec[prop].shift();
  if (behaviour === undefined) {
    throw new Error(`internal error; not enough ${prop} behaviours in spec`);
  }
  return behaviour;
}

function mockApi(spec: MockApiBehaviour): GoogleDriveApi {
  const acquireToken: GoogleDriveApi["acquireToken"] = async ({ signal }) => {
    const behaviour = shiftBehaviourOrFail(spec, "acquireToken");
    switch (behaviour) {
      case "ok":
        return { token: "access-granted", expiration: new Date() };
      case "wait": {
        return await new Promise((_resolve, reject) => {
          const doUserCancel = () =>
            reject(new Error("User cancelled login operation"));
          signal.addEventListener("abort", doUserCancel, { once: true });
        });
      }
      case "fail":
        throw new Error(
          "Could not log in to Google account" +
            ` (technical details: "something_went_wrong")`
        );
      default:
        return assertNever(behaviour);
    }
  };

  const getUserInfo: GoogleDriveApi["getUserInfo"] = async (/* tokInfo */) => {
    const behaviour = shiftBehaviourOrFail(spec, "getUserInfo");
    switch (behaviour) {
      case "ok":
        return {
          displayName: "J. Random User",
          emailAddress: "j.random.user@example.com",
        };
      case "fail":
        throw new Error("Could not get user information");
      default:
        return assertNever(behaviour);
    }
  };

  const importFiles: GoogleDriveApi["importFiles"] = (/* tokInfo */) => {
    const behaviour = shiftBehaviourOrFail(spec, "importFiles");
    switch (behaviour.kind) {
      case "fail":
        throw new Error(behaviour.message);
      case "wait":
        return {
          cancel: () => behaviour.wasCancelled.set(true),
          files: new Promise<Array<AsyncFile>>((/* resolve, reject */) => {
            // Never do anything.
          }),
        };
      case "ok":
        return {
          cancel: () => behaviour.wasCancelled.set(true),
          files: Promise.resolve(behaviour.files),
        };
      default:
        return assertNever(behaviour);
    }
  };

  const exportFile: GoogleDriveApi["exportFile"] =
    async (/* tokInfo, file */) => {
      const behaviour = shiftBehaviourOrFail(spec, "exportFile");
      switch (behaviour) {
        case "fail":
          throw new Error("Something went wrong exporting file");
        case "ok":
          return;
        default:
          return assertNever(behaviour);
      }
    };

  return { acquireToken, getUserInfo, importFiles, exportFile };
}

export const mockBootApi: GoogleDriveBootApi = {
  boot: async () => {
    let spec = await mockBehaviourSpec();
    const behaviour = shiftBehaviourOrFail(spec, "boot");
    switch (behaviour) {
      case "ok":
        return mockApi(spec);
      case "fail":
        throw new Error("pretending to fail to load APIs");
      case "stall":
        return new Promise<GoogleDriveApi>((/* resolve, reject */) => {
          // Never do anything.
        });
    }
  },
};
