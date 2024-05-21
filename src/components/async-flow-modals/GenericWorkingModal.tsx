import React from "react";
import Modal from "react-bootstrap/Modal";
import Spinner from "react-bootstrap/Spinner";

export const GenericWorkingModal = () => {
  return (
    <Modal
      className="GenericWorkingModal"
      show={true}
      animation={false}
      centered
    >
      <Modal.Header>
        <Modal.Title>Working...</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="spinner-container">
          <Spinner />
        </div>
      </Modal.Body>
    </Modal>
  );
};
