import React, { CSSProperties } from "react";
import { useParams } from "react-router-dom";

import { EmptyProps } from "../utils";

import { useStoreActions, useStoreState } from "../store";
import { Actions, State } from "easy-peasy";

import { eqDisplaySize } from "../model/ui";

import {
  StandalonePlayDemoState,
} from "../model/standalone-play-demo";

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
// Main component.

export const StandalonePlayDemo: React.FC<EmptyProps> = () => {
  const params = useParams();

  return (
    <div className="StandalonePlayDemo abs-0000">
    </div>
  );
};
