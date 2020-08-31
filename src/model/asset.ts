// Assets are identified by a hash of their contents.
type AssetId = string;

export interface IAssetInProject {
  name: string;
  id: AssetId;
}
