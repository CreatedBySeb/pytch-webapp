import React from "react";
import { useParams } from "react-router-dom";

import { EmptyProps } from "../utils";

import { useStoreActions, useStoreState } from "../store";
import { Actions, State } from "easy-peasy";

import {
  StandalonePlayDemoState,
} from "../model/standalone-play-demo";

////////////////////////////////////////////////////////////////////////
// Main component.

export const StandalonePlayDemo: React.FC<EmptyProps> = () => {
  const params = useParams();

  return (
    <div className="StandalonePlayDemo abs-0000">
    </div>
  );
};
