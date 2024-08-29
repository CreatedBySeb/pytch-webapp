import React, { useEffect } from "react";
import NavBanner from "./NavBanner";
import { EmptyProps, assertNever } from "../utils";
import { useStoreActions, useStoreState } from "../store";
import { useSetActiveUiVersionFun } from "./hooks/active-ui-version";
import { EditorKindThumbnail } from "./EditorKindThumbnail";
import { Header } from "./front-page/Header";
import { CodingJourney } from "./front-page/CodingJourney";
import { CardCarousel } from "./front-page/CardCarousel";
import { LearnPython } from "./front-page/LearnPython";
import { ContactInvitation } from "./front-page/ContactInvitation";
import { Footer } from "./front-page/Footer";

const ToggleUiStylePanel_v1: React.FC<EmptyProps> = () => {
  const setUiVersion2 = useSetActiveUiVersionFun("v2");
  return (
    <div className="ToggleUiStylePanel">
      <div className="summary">
        <EditorKindThumbnail programKind="per-method" size="lg" />
        <div className="content">
          <p>
            We’re excited to invite you to try a new way of writing Pytch
            programs — script by script.
          </p>
        </div>
      </div>
      <div className="explanation">
        <p className="welcome-change-ui-style">
          <span className="pseudo-link" onClick={setUiVersion2}>
            Try it!
          </span>
        </p>
      </div>
    </div>
  );
};

const ToggleUiStylePanel_v2: React.FC<EmptyProps> = () => {
  const setUiVersion1 = useSetActiveUiVersionFun("v1");
  const createNewProjectAndNavigate = useStoreActions(
    (actions) => actions.projectCollection.createNewProjectAndNavigate
  );
  const createProjectFromTutorialAction = useStoreActions(
    (actions) => actions.tutorialCollection.createProjectFromTutorial
  );
  const setOperationState = useStoreActions(
    (actions) => actions.versionOptIn.setV2OperationState
  );

  // Bit of a fudge to manage the "operation in progress" state in the
  // next two functions, but it's likely to be temporary and so not
  // really worth making general.

  const createProject = async () => {
    setOperationState("in-progress");
    await createNewProjectAndNavigate({
      name: "Untitled script-by-script project",
      template: "simple-example-per-method",
    });
    setOperationState("idle");
  };

  const createProjectFromTutorial = async () => {
    setOperationState("in-progress");
    await createProjectFromTutorialAction("script-by-script-catch-apple");
    setOperationState("idle");
  };

  return (
    <div className="ToggleUiStylePanel">
      <div className="summary">
        <EditorKindThumbnail programKind="per-method" size="lg" />
        <div className="content">
          <p>
            Thanks for trying the <em>script by script</em> way of writing Pytch
            programs. Let us know what you think!
          </p>
        </div>
      </div>
      <div className="explanation">
        <p>You can try the new version by:</p>
        <ul>
          <li>
            <span className="pseudo-link" onClick={createProject}>
              Creating a project
            </span>{" "}
            which you edit as sprites and scripts.
          </li>
          <li>
            <span className="pseudo-link" onClick={createProjectFromTutorial}>
              Working with a tutorial
            </span>{" "}
            which leads you through writing a game as sprites and scripts.
          </li>
        </ul>
        <p>
          (Or you can{" "}
          <span className="pseudo-link" onClick={setUiVersion1}>
            go back to classic Pytch
          </span>
          .)
        </p>
      </div>
    </div>
  );
};

const ToggleUiStylePanel: React.FC<EmptyProps> = () => {
  const activeUiVersion = useStoreState(
    (state) => state.versionOptIn.activeUiVersion
  );

  switch (activeUiVersion) {
    case "v1":
      return <ToggleUiStylePanel_v1 />;
    case "v2":
      return <ToggleUiStylePanel_v2 />;
    default:
      return assertNever(activeUiVersion);
  }
};

const Welcome: React.FC<EmptyProps> = () => {
  useEffect(() => {
    document.title = "Pytch";
  });

  return (
    <>
      <NavBanner />
      <div className="welcome-text">
        <Header />
        <CodingJourney />
        <ToggleUiStylePanel />
        <CardCarousel />
        <LearnPython />
        <ContactInvitation />
        <Footer />
      </div>
    </>
  );
};

export default Welcome;
