import React from "react";
import { UpsertSpriteModal } from "./UpsertSpriteModal";
import { UpsertHandlerModal } from "./UpsertHandlerModal";
import { DeleteHandlerModal } from "../async-flow-modals/DeleteHandlerModal";

export const Modals = () => {
  return (
    <>
      <UpsertSpriteModal />
      <UpsertHandlerModal />
      <DeleteHandlerModal />
    </>
  );
};
