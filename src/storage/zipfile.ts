import JSZip from "jszip";
import { typeFromExtension } from "./mime-types";
import {
  AddAssetDescriptor,
  TransformedAssetDescriptor,
  assetData,
} from "../database/indexed-db";
import { AssetTransform, AssetTransformOps } from "../model/asset";
import { StoredProjectContent } from "../model/project";
import { assertNever, failIfNull, fetchArrayBuffer, hexSHA256 } from "../utils";
import { envVarOrFail } from "../env-utils";
import {
  PytchProgram,
  PytchProgramKind,
  PytchProgramOps,
} from "../model/pytch-program";

// This is the same as IAddAssetDescriptor; any way to avoid this
// duplication?
type RawAssetDescriptor = Omit<AddAssetDescriptor, "transform">;

type AssetTransformRecord = { name: string; transform: AssetTransform };

// TODO: Be stricter about this, by checking there are no properties
// besides the expected ones.
const _isAssetTransform = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  x: any
): x is AssetTransform => {
  switch (x.targetType) {
    case "image":
      for (const prop of ["originX", "originY", "width", "height", "scale"]) {
        if (typeof x[prop] !== "number") {
          return false;
        }
      }
      break;
    case "audio":
      // Currently no properties to check.
      break;
    default:
      return false;
  }
  return true;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const _isAssetTransformRecord = (x: any): x is AssetTransformRecord => {
  return typeof x.name === "string" && _isAssetTransform(x.transform);
};

const _isAssetTransformRecordArray = (
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  x: any
): x is Array<AssetTransformRecord> => {
  return Array.isArray(x) && x.every(_isAssetTransformRecord);
};

// Error machinery is a bit fiddly.  Sometimes we throw an error in the
// middle of a sequence of steps which might throw errors themselves.
// In that case, we do so in a try/catch, and in the "catch", we rethrow
// the error after wrapping in something a bit more friendly.  In other
// cases, we explicitly wrap the error at the point of throwing it.

type ErrorTransformation = (err: Error) => Error;

const bareError: ErrorTransformation = (err: Error): Error => err;

export const wrappedError: ErrorTransformation = (err: Error): Error => {
  return new Error(
    `There was a problem with the zipfile.  (Technical details: ${err}.)`
  );
};

const _zipObjOrFail = (
  zip: JSZip,
  path: string,
  errorTransformation: ErrorTransformation
) => {
  const maybeZipObj = zip.file(path);
  if (maybeZipObj == null)
    throw errorTransformation(
      new Error(`could not find "${path}" within zipfile`)
    );

  return maybeZipObj;
};

const _jsonOrFail = async (
  zip: JSZip,
  path: string,
  errorTransformation: ErrorTransformation
) => {
  const zipObj = _zipObjOrFail(zip, path, errorTransformation);
  const text = await zipObj.async("text");
  try {
    return JSON.parse(text);
  } catch (error) {
    throw errorTransformation(
      new Error(`could not parse contents of "${path}"`)
    );
  }
};

const _versionOrFail = async (zip: JSZip) => {
  const versionInfo = await _jsonOrFail(zip, "version.json", wrappedError);
  const maybeVersion = versionInfo.pytchZipfileVersion;
  if (maybeVersion == null)
    throw wrappedError(
      new Error("version object does not contain pytchZipfileVersion property")
    );
  return maybeVersion;
};

const _zipAsset = async (
  path: string,
  zipObj: JSZip.JSZipObject
): Promise<RawAssetDescriptor> => {
  if (path.length === 0)
    throw new Error("zipfile contains file with empty path");
  const parts = path.split(".");
  if (parts.length === 1)
    throw new Error(`zipfile contains file "${path}" with no extension`);
  const mimeType = typeFromExtension(parts[parts.length - 1]);
  if (mimeType === false)
    throw new Error(`could not determine mime-type of "${path}"`);
  const data = await zipObj.async("arraybuffer");
  return { name: path, mimeType, data };
};

const _loadZipOrFail = async (zipData: ArrayBuffer): Promise<JSZip> => {
  try {
    return await JSZip.loadAsync(zipData);
  } catch (err) {
    throw wrappedError(new Error("File does not seem to be a zipfile"));
  }
};

// TODO: Would it be meaningful to create a tutorial-tracking project
// from a zipfile?
/** A project described in a stand-alone form, i.e., with all asset data
 * as part of the descriptor. */
export type StandaloneProjectDescriptor = {
  name: string;
  summary?: string;
  program: PytchProgram;
  assets: Array<TransformedAssetDescriptor>;
};

// TODO: Not sure this is the best place for this:
export class AddAssetDescriptorOps {
  static async fingerprint(asset: AddAssetDescriptor) {
    const nameHash = await hexSHA256(asset.name);
    const mimeTypeHash = await hexSHA256(asset.mimeType);
    const contentHash = await hexSHA256(asset.data);
    const transform =
      asset.transform ?? AssetTransformOps.newNoop(asset.mimeType);
    const transformHash = await AssetTransformOps.contentHash(transform);
    return [nameHash, mimeTypeHash, contentHash, transformHash].join("/");
  }

  static async fingerprintArray(assets: Array<AddAssetDescriptor>) {
    let fingerprints = await Promise.all(
      assets.map((a) => AddAssetDescriptorOps.fingerprint(a))
    );
    fingerprints.sort();
    return `assets=${fingerprints.join(",")}`;
  }
}

export class StandaloneProjectDescriptorOps {
  static async fingerprint(desc: StandaloneProjectDescriptor) {
    const programFingerprint = await PytchProgramOps.fingerprint(desc.program);
    const assetsFingerprint = await AddAssetDescriptorOps.fingerprintArray(
      desc.assets
    );
    return `${programFingerprint}\n${assetsFingerprint}\n`;
  }

  static async contentHash(desc: StandaloneProjectDescriptor) {
    const fingerprint = await StandaloneProjectDescriptorOps.fingerprint(desc);
    return await hexSHA256(fingerprint);
  }
}

const parseZipfile_V1 = async (
  zip: JSZip,
  zipName?: string
): Promise<StandaloneProjectDescriptor> => {
  const codeZipObj = _zipObjOrFail(zip, "code/code.py", bareError);
  const codeText = await codeZipObj.async("text");
  const program = PytchProgramOps.fromPythonCode(codeText);

  const metadata = await _jsonOrFail(zip, "meta.json", bareError);
  const projectName = failIfNull(
    metadata.projectName,
    "could not find project name in metadata"
  );
  if (typeof projectName !== "string")
    throw new Error("project name is not a string");

  const assetsZip = failIfNull(
    zip.folder("assets"),
    `could not enter folder "assets" of zipfile`
  );

  let assetPromises: Array<Promise<RawAssetDescriptor>> = [];
  assetsZip.forEach((path, zipObj) =>
    assetPromises.push(_zipAsset(path, zipObj))
  );

  const rawAssets = await Promise.all(assetPromises);
  const assets: Array<TransformedAssetDescriptor> = rawAssets.map((a) => ({
    ...a,
    transform: AssetTransformOps.newNoop(a.mimeType),
  }));

  const summary =
    zipName == null ? undefined : `Created from zipfile "${zipName}"`;

  return { name: projectName, summary, program, assets };
};

/** Verify that the subdirectory "assets/files", as represented by the
 * given `assetsFilesZip` object, is correct for a program of the given
 * `programKind`.  If the structure is incorrect, throw an error.  If
 * the structure is correct, just return. */
const validateAssetsLayout = (
  programKind: PytchProgramKind,
  assetsFilesZip: JSZip
) => {
  // In the below, recall that forEach() iterates over all descendants,
  // not just immediate children.

  switch (programKind) {
    case "flat": {
      const fail = (message: string) => {
        throw new Error(
          'a "flat" program must have all its asset files' +
            ' directly within "assets/files", but ' +
            message
        );
      };
      assetsFilesZip.forEach((path, zipObj) => {
        if (zipObj.dir) {
          fail(`a directory "${path}" was found`);
        }
        // Not sure if we'll ever hit the following.  Depends on whether
        // zipfiles always have subdirectories before any entries within
        // that subdir.
        if (path.includes("/")) {
          fail(`a deeper entry "${path}" was found`);
        }
      });
      break;
    }
    case "per-method": {
      const fail = (message: string) => {
        throw new Error(
          'a "per-method" program must have all its asset files' +
            " exactly one subdirectory deep within assets/files, but " +
            message
        );
      };
      assetsFilesZip.forEach((path, zipObj) => {
        const pathParts = path.replace(/[/]$/, "").split("/");
        if (pathParts.length === 1) {
          if (!zipObj.dir) {
            fail(`top-level entry "${path}" is not a directory`);
          }
        } else {
          if (zipObj.dir) {
            fail(`"${path}" is a directory`);
          }
          // Same query as above re whether this will ever be hit:
          if (pathParts.length > 2) {
            fail(`a deeper entry "${path}" was found`);
          }
        }
      });
      break;
    }
    default:
      assertNever(programKind);
  }
};

const parseZipfile_V2_V3 = async (
  zip: JSZip,
  programPath: string,
  zipName?: string
): Promise<StandaloneProjectDescriptor> => {
  const codeZipObj = _zipObjOrFail(zip, programPath, bareError);
  const codeTextOrJson = await codeZipObj.async("text");
  const program = programPath.endsWith(".py")
    ? PytchProgramOps.fromPythonCode(codeTextOrJson)
    : PytchProgramOps.fromJson(codeTextOrJson);

  const projectMetadata = await _jsonOrFail(zip, "meta.json", bareError);
  const projectName = failIfNull(
    projectMetadata.projectName,
    "could not find project name in metadata"
  );
  if (typeof projectName !== "string")
    throw new Error("project name is not a string");

  const assetMetadataPath = "assets/metadata.json";
  const assetMetadata = await _jsonOrFail(zip, assetMetadataPath, bareError);
  if (!_isAssetTransformRecordArray(assetMetadata))
    throw new Error(
      `"${assetMetadataPath}" does not hold an array of transform records`
    );

  const transformFromName = new Map<string, AssetTransform>(
    assetMetadata.map((x) => [x.name, x.transform])
  );

  const assetsZip = failIfNull(
    zip.folder("assets/files"),
    `could not enter folder "assets/files" of zipfile`
  );

  validateAssetsLayout(program.kind, assetsZip);

  let assetPromises: Array<Promise<RawAssetDescriptor>> = [];
  assetsZip.forEach((path, zipObj) => {
    if (!zipObj.dir) {
      assetPromises.push(_zipAsset(path, zipObj));
    }
  });

  const rawAssets = await Promise.all(assetPromises);
  const assets: Array<TransformedAssetDescriptor> = rawAssets.map((a) => ({
    ...a,
    transform:
      transformFromName.get(a.name) ?? AssetTransformOps.newNoop(a.mimeType),
  }));

  const summary =
    zipName == null ? undefined : `Created from zipfile "${zipName}"`;

  return { name: projectName, summary, program, assets };
};

export const projectDescriptor = async (
  zipName: string | undefined,
  zipData: ArrayBuffer
): Promise<StandaloneProjectDescriptor> => {
  const zip = await _loadZipOrFail(zipData);
  const versionNumber = await _versionOrFail(zip);
  try {
    switch (versionNumber) {
      case 1:
        return await parseZipfile_V1(zip, zipName);
      case 2:
        return await parseZipfile_V2_V3(zip, "code/code.py", zipName);
      case 3:
        return await parseZipfile_V2_V3(zip, "code/code.json", zipName);
      default:
        throw new Error(`unhandled Pytch zipfile version ${versionNumber}`);
    }
  } catch (err) {
    throw wrappedError(err as Error);
  }
};

export const projectDescriptorFromURL = async (
  url: string
): Promise<StandaloneProjectDescriptor> => {
  const data = await fetchArrayBuffer(url);
  return projectDescriptor(undefined, data);
};

const pytchZipfileVersion = 3;
export const zipfileDataFromProject = async (
  project: StoredProjectContent
): Promise<Uint8Array> => {
  const zipFile = new JSZip();
  zipFile.file("version.json", JSON.stringify({ pytchZipfileVersion }));

  // TODO: Include project summary?
  // TODO: Preserve info on whether tracking tutorial?
  const projectName = project.name;
  const metaData = { projectName };
  zipFile.file("meta.json", JSON.stringify(metaData));

  zipFile.file("code/code.json", JSON.stringify(project.program));

  // Ensure folder exists, even if there are no assets.
  const assetsFolder = failIfNull(zipFile.folder("assets"), "no assets folder");
  assetsFolder.folder("files");
  await Promise.all(
    project.assets.map(async (asset) => {
      // TODO: Once we're able to delete assets, the following might fail:
      const data = await assetData(asset.id);
      zipFile.file(`assets/files/${asset.name}`, data);
    })
  );

  const assetMetadataJSON = JSON.stringify(
    project.assets.map((a) => ({
      name: a.name,
      transform: a.assetInProject.transform,
    }))
  );

  zipFile.file(`assets/metadata.json`, assetMetadataJSON);

  return await zipFile.generateAsync({ type: "uint8array" });
};

export const demoURLFromId = (id: string): string => {
  const demosDataRoot = envVarOrFail("VITE_DEMOS_BASE");
  return [demosDataRoot, `${id}.zip`].join("/");
};
