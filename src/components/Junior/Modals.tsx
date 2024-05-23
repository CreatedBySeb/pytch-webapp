import React from "react";
import { UpsertSpriteModal } from "./UpsertSpriteModal";
import { UpsertHandlerModal } from "./async-flow-modals/UpsertHandlerModal";
import { DeleteSpriteModal } from "../async-flow-modals/DeleteSpriteModal";
import { DeleteHandlerModal } from "../async-flow-modals/DeleteHandlerModal";

export const Modals = () => {
  return (
    <>
      <UpsertSpriteModal />
      <UpsertHandlerModal />
      <DeleteSpriteModal />
      <DeleteHandlerModal />
    </>
  );
};
