/* eslint-disable @typescript-eslint/no-explicit-any */

import { failIfNull, loadScript } from "../../utils";
import {
  postResumableUpload,
  postFileContent,
  getFileMetadata,
  getFileContent,
  getAbout,
} from "./http-api";
import {
  kApiKey,
  kAppId,
  kClientId,
  kDriveDiscoveryUrl,
  kGoogleApiJsUrl,
  kGoogleClientJsUrl,
  kScopes,
} from "./constants";
import {
  AsyncFile,
  GoogleDriveApi,
  GoogleDriveBootApi,
  GoogleUserInfo,
  TokenInfo,
  AcquireTokenOptions,
  ImportFilesFlow,
} from "./shared";

const loadGapiClient = (gapi: any, libraries: string): Promise<void> =>
  new Promise((resolve, reject) => {
    gapi.load(libraries, {
      callback: () => resolve(),
      onerror: () => reject(new Error("Failed to load gapi library")),
    });
  });

const realApi = (google: any, tokenClient: any): GoogleDriveApi => {
  function acquireToken(options: AcquireTokenOptions): Promise<TokenInfo> {
    const { signal } = options;

    return new Promise<TokenInfo>((resolve, reject) => {
      const doUserCancel = () => reject(new Error(signal.reason));
      signal.addEventListener("abort", doUserCancel, { once: true });

      tokenClient.callback = (response: any) => {
        const maybeError = response.error;
        if (maybeError !== undefined) {
          console.error("tokenClient.callback(): error:", response);
          if (signal.aborted) {
            console.log("already abort()'d with", signal.reason);
          } else {
            signal.removeEventListener("abort", doUserCancel);
            reject(
              new Error(`Could not log in to Google (code "${maybeError}")`)
            );
          }
        } else {
          if (signal.aborted) {
            console.log("already abort()'d with", signal.reason);
          } else {
            signal.removeEventListener("abort", doUserCancel);
            resolve({
              token: response.access_token,
              expiration: new Date(), // TODO: Get from response.expires_in
            });
          }
        }
      };

      // Empty prompt means "The user will be prompted only the first
      // time your app requests access".
      tokenClient.requestAccessToken({ prompt: "" });
    });
  }

  async function getUserInfo(tokenInfo: TokenInfo): Promise<GoogleUserInfo> {
    const token = tokenInfo.token;
    return await getAbout(token);
  }

  const fileFromDocument = (token: string, document: any): AsyncFile => {
    const fileId = document[google.picker.Document.ID];

    const metadataPromise = (() => {
      let promise: Promise<any> | null = null;
      return () => {
        promise = promise ?? getFileMetadata(token, fileId);
        return promise;
      };
    })();

    async function name() {
      const metadata = await metadataPromise();
      return metadata.name;
    }

    async function mimeType() {
      const metadata = await metadataPromise();
      return metadata.mimeType;
    }

    async function data() {
      return await getFileContent(token, fileId);
    }

    return { name, mimeType, data };
  };

  function importFiles(tokenInfo: TokenInfo): ImportFilesFlow {
    const builder = new google.picker.PickerBuilder()
      .enableFeature(google.picker.Feature.NAV_HIDDEN)
      .enableFeature(google.picker.Feature.MULTISELECT_ENABLED)
      .setDeveloperKey(kApiKey())
      .setAppId(kAppId());

    const token = tokenInfo.token;
    builder.setOAuthToken(token);

    // The standard mime-type for zip files is "application/zip", but
    // it seems Windows uses "application/x-zip-compressed".
    let docsView = new google.picker.View(google.picker.ViewId.DOCS);
    docsView.setMimeTypes("application/zip,application/x-zip-compressed");
    builder.addView(docsView);

    const rawFiles = new Promise<Array<AsyncFile>>((resolve, reject) => {
      const callback = async (data: any) => {
        switch (data.action) {
          case google.picker.Action.PICKED: {
            try {
              const documents = data[google.picker.Response.DOCUMENTS];
              const asyncFiles = documents.map((document: any) =>
                fileFromDocument(token, document)
              );
              resolve(asyncFiles);
            } catch (err: any) {
              // TODO: What in the above might throw an error?
              console.error("picker callback:", err);
              reject(err);
            }
            break;
          }
          case google.picker.Action.CANCEL: {
            // It's not an error as such if the user cancels.  The
            // caller will interpret an empty list as "user cancelled".
            resolve([]);
            break;
          }
          default:
            // Only PICKED / CANCEL are documented, but anyway:
            console.log("unhandled data.action", data.action);
            break;
        }
      };

      builder.setCallback(callback);
    });

    const picker = builder.build();

    const files = rawFiles.finally(() => picker.dispose());

    function cancel() {
      picker.setVisible(false);
      picker.dispose();
    }

    picker.setVisible(true);

    return { cancel, files };
  }

  const exportFile = async (
    tokenInfo: TokenInfo,
    file: AsyncFile
  ): Promise<void> => {
    const token = tokenInfo.token;

    const resource = {
      name: await file.name(),
      mimeType: await file.mimeType(),
    };
    const contentUrl = await postResumableUpload(token, resource);

    const data = await file.data();
    await postFileContent(token, contentUrl, data);
  };

  return { acquireToken, getUserInfo, importFiles, exportFile };
};

export const realBootApi: GoogleDriveBootApi = {
  boot: async () => {
    const dynamicScriptsDiv = failIfNull(
      document.getElementById("dynamic-scripts"),
      "could not find dynamic-scripts DIV"
    );
    await loadScript(dynamicScriptsDiv, kGoogleApiJsUrl);
    await loadScript(dynamicScriptsDiv, kGoogleClientJsUrl);

    const gapi = (globalThis as any).gapi;
    const google = (globalThis as any).google;

    if (gapi == null || google == null) {
      throw new Error("failed to initialise gapi and google APIs");
    }

    await loadGapiClient(gapi, "client:picker");
    await gapi.client.load(kDriveDiscoveryUrl);

    const tokenClient = google.accounts.oauth2.initTokenClient({
      client_id: kClientId(),
      scope: kScopes,
      callback: "", // Will set later.
    });

    return realApi(google, tokenClient);
  },
};
