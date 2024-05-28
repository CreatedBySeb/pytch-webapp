import React from "react";
import Modal from "react-bootstrap/Modal";
import { FileProcessingFailure } from "../model/user-interactions/process-files";

export const FileProcessingFailures: React.FC<{
  titleText: string;
  introText: string;
  failures: Array<FileProcessingFailure>;
  dismiss: () => void;
}> = (props) => {
  const failureEntries = props.failures.map((failure) => (
    <li key={failure.filename}>
      <code>{failure.filename}</code> — {failure.reason}
    </li>
  ));

  return (
    <Modal
      show={true}
      animation={false}
      className="add-asset-failures"
      onHide={() => props.dismiss()}
    >
      <Modal.Header closeButton={true}>
        <Modal.Title>{props.titleText}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <p>{props.introText}</p>
        <ul>{failureEntries}</ul>
        <p>Please check the files and try again.</p>
      </Modal.Body>
    </Modal>
  );
};
