import React, { CSSProperties } from "react";
import { useParams } from "react-router-dom";

import { EmptyProps, OnlyChildrenProps, assertNever } from "../utils";

import { envVarOrDefault } from "../env-utils";

import { useStoreActions, useStoreState } from "../store";
import { Actions, State } from "easy-peasy";

import { eqDisplaySize } from "../model/ui";

import {
  StandalonePlayDemoState,
} from "../model/standalone-play-demo";

import Spinner from "react-bootstrap/Spinner";
import Stage from "./Stage";
import QuestionInputPanel from "./QuestionInputPanel";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

////////////////////////////////////////////////////////////////////////
// Utilities for using slice's state/actions.

type SPDStateMapper<R> = (state: State<StandalonePlayDemoState>) => R;
type SPDActionsMapper<R> = (actions: Actions<StandalonePlayDemoState>) => R;

function useSPDState<R>(mapState: SPDStateMapper<R>): R {
  return useStoreState((state) => mapState(state.standalonePlayDemoState));
}

function useSPDActions<R>(mapActions: SPDActionsMapper<R>): R {
  return useStoreActions((actions) =>
    mapActions(actions.standalonePlayDemoState)
  );
}

////////////////////////////////////////////////////////////////////////
// Hook for computing width/height styles to match stage dimensions.

type UseStageDimensionsStyleArgs = {
  includeHeight: boolean;
};

const useStageDimensionsStyle = ({
  includeHeight,
}: UseStageDimensionsStyleArgs): CSSProperties => {
  const stageDimensions = useStoreState(
    (state) => state.ideLayout.stageDisplaySize,
    eqDisplaySize
  );

  let style: CSSProperties = { width: `${stageDimensions.width}px` };
  if (includeHeight) {
    style.height = `${stageDimensions.height}px`;
  }

  return style;
};

////////////////////////////////////////////////////////////////////////
// Sub-components.

const MadeWithPytchButton: React.FC<EmptyProps> = () => {
  const url = envVarOrDefault("BASE_URL", "https://pytch.org/");
  return (
    <div className="MadeWithPytchButton">
      <p>
        <a href={url} target="_blank" rel="noreferrer">
          <span className="pseudo-link">Made with Pytch</span>
        </a>
      </p>
    </div>
  );
};

const ErrorNotice: React.FC<OnlyChildrenProps> = ({ children }) => {
  const dimensionsStyle = useStageDimensionsStyle({ includeHeight: true });
  return (
    <div className="ErrorNotice mx-auto" style={dimensionsStyle}>
      <div>
        <FontAwesomeIcon
          className="mb-3"
          size="2x"
          icon="triangle-exclamation"
        />
        {children}
      </div>
    </div>
  );
};

const SizedSpinner: React.FC<EmptyProps> = () => {
  const dimensionsStyle = useStageDimensionsStyle({ includeHeight: true });
  return (
    <div className="spinner-container mx-auto" style={dimensionsStyle}>
      <Spinner animation="border" />
    </div>
  );
};

const DemoContent: React.FC<EmptyProps> = () => {
  const state = useSPDState((s) => s.coreState);

  switch (state.kind) {
    case "idle":
    case "booting":
      return <SizedSpinner />;
    case "boot-failed":
      return (
        <ErrorNotice>
          <p>Sorry, this Pytch program could not be loaded.</p>
        </ErrorNotice>
      );
    case "build-failed":
      return (
        <ErrorNotice>
          <p>Sorry, this Pytch program could not be started.</p>
        </ErrorNotice>
      );
    case "ready":
    case "launched":
      return (
        <div className="stage-and-text-input">
          <Stage />
          <QuestionInputPanel />
        </div>
      );
    case "runtime-error":
      return (
        <ErrorNotice>
          <p>Sorry, this Pytch program encountered an error.</p>
          <p>
            You can try re-running the program by clicking the green button
            above the stage.
          </p>
        </ErrorNotice>
      );
    default:
      return assertNever(state);
  }
};

////////////////////////////////////////////////////////////////////////
// Main component.

export const StandalonePlayDemo: React.FC<EmptyProps> = () => {
  const params = useParams();

  return (
    <div className="StandalonePlayDemo abs-0000">
    </div>
  );
};
