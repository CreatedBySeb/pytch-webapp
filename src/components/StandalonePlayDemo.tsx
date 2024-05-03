import React, { CSSProperties } from "react";
import { useParams } from "react-router-dom";

import { EmptyProps, OnlyChildrenProps } from "../utils";

import { envVarOrDefault } from "../env-utils";

import { useStoreActions, useStoreState } from "../store";
import { Actions, State } from "easy-peasy";

import { eqDisplaySize } from "../model/ui";

import {
  StandalonePlayDemoState,
} from "../model/standalone-play-demo";

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

////////////////////////////////////////////////////////////////////////
// Main component.

export const StandalonePlayDemo: React.FC<EmptyProps> = () => {
  const params = useParams();

  return (
    <div className="StandalonePlayDemo abs-0000">
    </div>
  );
};
