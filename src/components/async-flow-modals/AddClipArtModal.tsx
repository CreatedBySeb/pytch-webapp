import React, { CSSProperties, MouseEventHandler, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import { Button } from "react-bootstrap";
import { useStoreState, useStoreActions } from "../../store";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { nSelectedItemsInGallery } from "../../model/clipart-gallery";
import {
  ClipArtGalleryData,
  ClipArtGalleryEntryId,
  ClipArtGalleryEntry,
  entryMatchesTags,
} from "../../model/clipart-gallery-core";

import { assertNever, discardReturnValue } from "../../utils";
import { MaybeErrorOrSuccessReport } from "../MaybeErrorOrSuccessReport";
import { asyncFlowModal } from "../async-flow-modals/utils";
import {
  isSucceeded,
  maybeLastFailureMessage,
  settleFunctions,
} from "../../model/user-interactions/async-user-flow";
import { OnTagClickFun } from "../../model/user-interactions/clipart-gallery-select";
import { useFlowActions, useFlowState } from "../../model";

const kMaxImageWidthOrHeight = 100;

const styleClampingToSize = (width: number, height: number): CSSProperties => {
  if (width > height && width > kMaxImageWidthOrHeight)
    return { width: kMaxImageWidthOrHeight };
  if (height >= width && height > kMaxImageWidthOrHeight)
    return { height: kMaxImageWidthOrHeight };
  return {};
};

type ClipArtTagButtonProps = {
  label: string;
  isSelected: boolean;
  onClick: MouseEventHandler;
};
const ClipArtTagButton: React.FC<ClipArtTagButtonProps> = ({
  label,
  isSelected,
  onClick,
}) => {
  const baseVariant = label === "All" ? "success" : "primary";
  const variantPrefix = isSelected ? "" : "outline-";
  const variant = `${variantPrefix}${baseVariant}`;
  return <Button {...{ variant, onClick }}>{label}</Button>;
};

type ClipArtTagButtonCollectionProps = {
  gallery: ClipArtGalleryData;
  selectedTags: Array<string>;
  onTagClick: OnTagClickFun;
};
const ClipArtTagButtonCollection: React.FC<ClipArtTagButtonCollectionProps> = ({
  gallery,
  selectedTags,
  onTagClick,
}) => {
  const allIsSelected = selectedTags.length === 0;

  type MouseEventHandlerFun = (tag: string) => MouseEventHandler;
  const clickFun: MouseEventHandlerFun = (tag: string) => (event) =>
    onTagClick({ tag, isMultiSelect: event.ctrlKey });

  return (
    <ul className="ClipArtTagButtonCollection">
      <li key="--all--">
        <ClipArtTagButton
          label="All"
          isSelected={allIsSelected}
          onClick={clickFun("--all--")}
        />
      </li>
      {gallery.tags.map((tag) => (
        <li key={tag}>
          <ClipArtTagButton
            label={tag}
            isSelected={selectedTags.indexOf(tag) !== -1}
            onClick={clickFun(tag)}
          />
        </li>
      ))}
    </ul>
  );
};

type ClipArtCardProps = {
  galleryEntry: ClipArtGalleryEntry;
  isSelected: boolean;
  selectItemById: (id: ClipArtGalleryEntryId) => void;
  deselectItemById: (id: ClipArtGalleryEntryId) => void;
};
const ClipArtCard: React.FC<ClipArtCardProps> = ({
  galleryEntry,
  isSelected,
  selectItemById,
  deselectItemById,
}) => {
  const extraClass = isSelected ? " selected" : " unselected";
  const clickHandler = isSelected ? deselectItemById : selectItemById;

  // Show the first item as representative of the entry.
  const galleryItem = galleryEntry.items[0];
  const nItems = galleryEntry.items.length;
  const nItemsLabel =
    nItems === 1 ? null : <div className="n-items-label">{nItems}</div>;

  const [rawImageWidth, rawImageHeight] = galleryItem.size;
  const thumbStyle = styleClampingToSize(rawImageWidth, rawImageHeight);

  return (
    <div className="clipart-card" onClick={() => clickHandler(galleryEntry.id)}>
      <div className="decorations">
        <p className="clipart-checkmark">
          <span className={`clipart-selection${extraClass}`}>
            <FontAwesomeIcon className="fa-lg" icon="check-circle" />
          </span>
        </p>
        {nItemsLabel}
      </div>
      <p className="clipart-thumbnail">
        <img alt="" style={thumbStyle} src={galleryItem.url} />
      </p>
      <p className="clipart-name">{galleryEntry.name}</p>
    </div>
  );
};

type SelectionProps = {
  selectedIds: Array<ClipArtGalleryEntryId>;
  selectedTags: Array<string>;
  selectItemById: (id: ClipArtGalleryEntryId) => void;
  deselectItemById: (id: ClipArtGalleryEntryId) => void;
  onTagClick: OnTagClickFun;
};

type ClipArtGalleryPanelReadyProps = {
  gallery: ClipArtGalleryData;
} & SelectionProps;

const ClipArtGalleryPanelReady: React.FC<ClipArtGalleryPanelReadyProps> = ({
  gallery,
  selectedIds,
  selectedTags,
  selectItemById,
  deselectItemById,
  onTagClick,
}) => {
  const selectedIdsSet = new Set(selectedIds);
  const selectedTagsSet = new Set<string>(selectedTags);

  return (
    <>
      <ClipArtTagButtonCollection {...{ gallery, selectedTags, onTagClick }} />
      <div className="modal-separator" />
      <div className="clipart-gallery">
        <ul>
          {gallery.entries.map((entry) => {
            if (!entryMatchesTags(entry, selectedTagsSet)) return null;

            const isSelected = selectedIdsSet.has(entry.id);
            return (
              <li key={entry.id}>
                <ClipArtCard
                  galleryEntry={entry}
                  isSelected={isSelected}
                  selectItemById={selectItemById}
                  deselectItemById={deselectItemById}
                />
              </li>
            );
          })}
        </ul>
      </div>
    </>
  );
};

const ClipArtGalleryPanel: React.FC<SelectionProps> = (selectionProps) => {
  const gallery = useStoreState((state) => state.clipArtGallery.state);

  switch (gallery.status) {
    case "fetch-failed":
      return (
        <>
          <p>Sorry, something went wrong fetching the media library.</p>
          <p>{gallery.message}</p>
        </>
      );
    case "fetch-not-started":
    case "fetch-pending":
      return <p>loading...</p>;
    case "ready":
      return <ClipArtGalleryPanelReady {...{ gallery, ...selectionProps }} />;
    default:
      return assertNever(gallery);
  }
};

export const AddClipArtModal = () => {
  const { fsmState, isSubmittable } = useFlowState((f) => f.addClipArtFlow);
  const { selectItemById, deselectItemById, onTagClick } = useFlowActions(
    (f) => f.addClipArtFlow
  );

  const galleryState = useStoreState((state) => state.clipArtGallery.state);

  const startFetchIfRequired = useStoreActions((actions) =>
    discardReturnValue(actions.clipArtGallery.startFetchIfRequired)
  );

  useEffect(startFetchIfRequired);

  return asyncFlowModal(fsmState, (activeState) => {
    const { selectedIds, selectedTags } = activeState.runState;

    const settle = settleFunctions(isSubmittable, activeState);

    const nSelected = nSelectedItemsInGallery(galleryState, selectedIds);
    const noneSelected = nSelected === 0;

    const addLabel = noneSelected
      ? "Add to project"
      : `Add ${nSelected} to project`;

    const selectionProps: SelectionProps = {
      selectedIds,
      selectedTags,
      selectItemById,
      deselectItemById,
      onTagClick,
    };

    return (
      <Modal animation={false} show={true} size="xl">
        <Modal.Header>
          <Modal.Title>Choose some images</Modal.Title>
        </Modal.Header>
        <Modal.Body className="clipart-body">
          <ClipArtGalleryPanel {...selectionProps} />
          <MaybeErrorOrSuccessReport
            messageWhenSuccess="Added!"
            attemptSucceeded={isSucceeded(activeState)}
            maybeLastFailureMessage={maybeLastFailureMessage(activeState)}
          />
        </Modal.Body>
        <Modal.Footer className="clipart-footer">
          <div className="licence-info">
            <p>For copyright and licensing information, see help pages.</p>
          </div>
          <div className="buttons">
            <Button variant="secondary" onClick={settle.cancel}>
              Cancel
            </Button>
            <Button
              disabled={!isSubmittable}
              variant="primary"
              onClick={settle.submit}
            >
              {addLabel}
            </Button>
          </div>
        </Modal.Footer>
      </Modal>
    );
  });
};
