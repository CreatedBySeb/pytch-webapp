import React from "react";
import { DeleteJuniorHandlerDescriptor } from "../../model/ui";
import Modal from "react-bootstrap/Modal";

export const confirmDeleteHandlerContent = (
  _descriptor: DeleteJuniorHandlerDescriptor
) => {
  return {
    header: <Modal.Title>Delete script?</Modal.Title>,
    body: (
      <>
        <p>Are you sure you want to delete this script?</p>
      </>
    ),
  };
};
