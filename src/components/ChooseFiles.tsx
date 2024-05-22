import React, { ChangeEventHandler } from "react";
import Modal from "react-bootstrap/Modal";
import Form from "react-bootstrap/Form";
import Button from "react-bootstrap/Button";
import Spinner from "react-bootstrap/Spinner";
import { failIfNull } from "../utils";

export const ChooseFiles: React.FC<{
  titleText: string;
  introText: string;
  actionButtonText: string;
  status: "awaiting-user-choice" | "trying-to-process";
  chosenFiles: FileList | null;
  setChosenFiles: (files: FileList) => void;
  tryProcess: (files: FileList) => void;
  dismiss: () => void;
}> = (props) => {
  const isAwaiting = props.status === "awaiting-user-choice";
  const isTrying = props.status === "trying-to-process";

  const spinnerExtraClass = isTrying ? "shown" : "hidden";
  const modalContentClass = isAwaiting ? "shown" : "hidden";

  const fileInputRef: React.RefObject<HTMLInputElement> = React.createRef();

  const handleFileSelection: ChangeEventHandler<HTMLInputElement> = (e) => {
    const files = failIfNull(e.target.files, 'no "files" in element');
    props.setChosenFiles(files);
  };

  const handleAdd = () => {
    const files = props.chosenFiles;

    // As far as flow analysis is concerned, the "atLeastOneFileChosen"
    // value computed below might be stale, so re-check:
    if (files == null || files.length === 0) {
      console.warn("trying to process missing/empty list of files");
      return;
    }

    props.tryProcess(files);
  };

  const atLeastOneFileChosen =
    props.chosenFiles != null && props.chosenFiles.length > 0;

  const modalContent = (
    <>
      <Modal.Body>
        <p>{props.introText}</p>
        <Form>
          <Form.Control
            type="file"
            ref={fileInputRef}
            multiple={true}
            onChange={handleFileSelection}
          />
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => props.dismiss()}>
          Cancel
        </Button>
        <Button
          disabled={!atLeastOneFileChosen}
          variant="primary"
          onClick={handleAdd}
        >
          {props.actionButtonText}
        </Button>
      </Modal.Footer>
    </>
  );

  return (
    <Modal
      className="add-assets"
      show={true}
      onHide={() => props.dismiss()}
      animation={false}
    >
      <Modal.Header closeButton={isAwaiting}>
        <Modal.Title>{props.titleText}</Modal.Title>
      </Modal.Header>
      <div className="body-container">
        <div className={`spinner-container ${spinnerExtraClass}`}>
          <Spinner animation="border" />
        </div>
        <div className={modalContentClass}>{modalContent}</div>
      </div>
    </Modal>
  );
};
