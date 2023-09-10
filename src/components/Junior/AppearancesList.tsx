import React from "react";
import {
  ActorKind,
  ActorKindOps,
  StructuredProgramOps,
} from "../../model/junior/structured-program";
import { AssetPresentation } from "../../model/asset";
import { AppearanceCard } from "./AppearanceCard";
import { AddSomethingButton } from "./AddSomethingButton";

import { NoContentHelp } from "./NoContentHelp";
import { useJrEditActions, useJrEditState, useMappedProgram } from "./hooks";
import { useStoreState } from "../../store";

type AppearancesContentProps = {
  actorKind: ActorKind;
  appearances: Array<AssetPresentation>;
};
const AppearancesContent: React.FC<AppearancesContentProps> = ({
  actorKind,
  appearances,
}) => {
  if (appearances.length === 0) {
    const appearanceName = ActorKindOps.names(actorKind).appearancesDisplay;
    return <NoContentHelp actorKind={actorKind} contentKind={appearanceName} />;
  }

  // Any costume of a sprite can be deleted, including if that would
  // mean the sprite is left with no costumes.  Also, if there is more
  // than one backdrop, then deletion is possible.  Deletion is only
  // *not* possible if this is the stage and it has exactly one
  // backdrop.
  const canBeDeleted = actorKind === "sprite" || appearances.length > 1;

  return (
    <>
      {appearances.map((a) => (
        <AppearanceCard
          key={a.id}
          actorKind={actorKind}
          assetPresentation={a}
          fullPathname={a.name}
          canBeDeleted={canBeDeleted}
        />
      ))}
    </>
  );
};

export const AppearancesList = () => {
  const assets = useStoreState((state) => state.activeProject.project.assets);
  const focusedActorId = useJrEditState((s) => s.focusedActor);

  // The following can throw; what happens?
  const focusedActor = useMappedProgram("<AppearancesList>", (program) =>
    StructuredProgramOps.uniqueActorById(program, focusedActorId)
  );

  const content = (() => {
    // These startswith() calls feel a bit dodgy.
    const actorAssets = assets.filter(
      (a) =>
        a.name.startsWith(focusedActorId) &&
        a.assetInProject.mimeType.startsWith("image/")
    );
    return (
      <AppearancesContent
        actorKind={focusedActor.kind}
        appearances={actorAssets}
      />
    );
  })();

  const launchAction = useJrEditActions((a) => a.addAssetsInteraction.launch);
  const addAppearance = () => launchAction();

  return (
    <div className="abs-0000-oflow">
      <div className="Junior-AppearancesList">{content}</div>
      <AddSomethingButton onClick={addAppearance} />
    </div>
  );
};
