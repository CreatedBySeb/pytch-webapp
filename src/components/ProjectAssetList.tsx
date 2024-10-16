import React from "react";
import { useStoreState } from "../store";
import { AssetPresentation } from "../model/asset";
import Card from "react-bootstrap/Card";
import Button from "react-bootstrap/Button";
import Dropdown from "react-bootstrap/Dropdown";
import DropdownButton from "react-bootstrap/DropdownButton";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { AssetThumbnail } from "./AssetThumbnail";
import { useRunFlow } from "../model";

type AssetCardProps = {
  asset: AssetPresentation;
};
const AssetCard: React.FC<AssetCardProps> = ({ asset }) => {
  const projectId = useStoreState((state) => state.activeProject.project.id);

  const runDeleteAsset = useRunFlow((f) => f.deleteAssetFlow);
  const runRenameAsset = useRunFlow((f) => f.renameAssetFlow);
  const runCropScaleImage = useRunFlow((f) => f.cropScaleImageFlow);

  const presentation = asset.presentation;
  const isImage = presentation.kind === "image";

  const onDelete = () =>
    runDeleteAsset({
      kindDisplayName: presentation.kind,
      name: asset.name,
      displayName: asset.name,
    });

  const onCopy = () => navigator.clipboard.writeText(`"${asset.name}"`);

  const operationContextKey = `flat/${presentation.kind}` as const;
  const onRename = () =>
    runRenameAsset({
      operationContextKey,
      fixedPrefix: "",
      oldNameSuffix: asset.assetInProject.name,
    });

  const onCropScale = () => {
    if (!isImage) {
      throw new Error(`asset "${asset.name}" is not of kind "image"`);
    }

    const existingCrop = asset.assetInProject.transform;
    const transformTargetType = existingCrop.targetType;
    if (transformTargetType !== "image")
      throw new Error(
        `existing transform for image "${asset.name}"` +
          ` targets kind "${transformTargetType}"`
      );

    const fullSourceImage = presentation.fullSourceImage;
    const originalSize = {
      width: fullSourceImage.width,
      height: fullSourceImage.height,
    };

    runCropScaleImage({
      projectId,
      assetName: asset.name,
      existingCrop,
      sourceURL: new URL(fullSourceImage.src),
      originalSize,
    });
  };

  const maybeCropDropdownItem = isImage && (
    <Dropdown.Item onClick={onCropScale}>
      <span className="with-icon">
        <span>Crop/scale</span>
        <FontAwesomeIcon icon="crop" />
      </span>
    </Dropdown.Item>
  );

  return (
    <Card className="AssetCard">
      <Card.Header>
        <code>{asset.name}</code>
        <DropdownButton align="end" title="⋮">
          <Dropdown.Item onClick={onCopy}>
            <span className="with-icon">
              <span>Copy name</span>
              <FontAwesomeIcon icon="copy" />
            </span>
          </Dropdown.Item>
          {maybeCropDropdownItem}
          <Dropdown.Item onClick={onRename}>Rename...</Dropdown.Item>
          <Dropdown.Item className="danger" onClick={onDelete}>
            DELETE
          </Dropdown.Item>
        </DropdownButton>
      </Card.Header>
      <Card.Body>
        <AssetThumbnail presentationData={presentation} />
      </Card.Body>
    </Card>
  );
};

const ProjectAssetList = () => {
  const projectId = useStoreState((state) => state.activeProject.project.id);
  const loadState = useStoreState(
    (state) => state.activeProject.syncState.loadState
  );
  const assets = useStoreState((state) => state.activeProject.project.assets);

  const runAddAssets = useRunFlow((f) => f.addAssetsFlow);
  const operationContextKey = "flat/any" as const;
  const launchUploadModal = () =>
    runAddAssets({ projectId, operationContextKey, assetNamePrefix: "" });

  const runAddClipArt = useRunFlow((f) => f.addClipArtFlow);

  const launchClipArtModal = () =>
    runAddClipArt({ projectId, operationContextKey, assetNamePrefix: "" });

  switch (loadState) {
    case "pending":
      return <div>Assets loading....</div>;
    case "failed":
      // TODO: Handle more usefully
      return <div>Assets failed to load, oh no</div>;
    case "succeeded":
      break; // Handle normal case below.
    default:
      throw new Error(`unknown loadState "${loadState}"`);
  }

  const intro =
    assets.length === 0 ? (
      <p className="info-pane-placeholder">
        Your project does not yet have any images or sounds. Use the button
        below to add some.
      </p>
    ) : (
      <h1>Your project’s images and sounds</h1>
    );

  return (
    <div className="AssetCardPane">
      {intro}
      <div className="AssetCardList">
        {assets.map((asset) => (
          <AssetCard key={asset.name} asset={asset} />
        ))}
      </div>
      <div className="buttons">
        <Button className="assets-button" onClick={launchUploadModal}>
          Add an image or sound
        </Button>
        or
        <Button className="assets-button" onClick={launchClipArtModal}>
          Choose from library
        </Button>
      </div>
    </div>
  );
};

export default ProjectAssetList;
