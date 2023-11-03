import { Uuid } from "./core-types";

// Compatible with AssetPresentation
export interface AssetMetaData {
  name: string;
  assetInProject: { mimeType: string };
}
