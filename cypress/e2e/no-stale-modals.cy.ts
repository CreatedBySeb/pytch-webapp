/// <reference types="cypress" />
import {
  createProjectFollowingTutorial,
  initSpecimenIntercepts,
  setInstantDelays,
} from "./utils";

context("Modals are cancelled when navigating away", () => {
  ////////////////////////////////////////////////////////////////////////
  // #region Common set-up

  before(() => {
    initSpecimenIntercepts();

    cy.pytchResetDatabase();
    cy.visit("/lesson/hello-world-lesson", { onLoad: setInstantDelays });
    cy.pytchHomeFromIDE();

    cy.get(".NavBar").contains("Tutorials").click();
    createProjectFollowingTutorial("Catch the apple");
    cy.pytchHomeFromIDE();

    cy.pytchTryUploadZipfiles([
      "newly-created-per-method.zip",
      "simple-pytchjr-project.zip",
    ]);

    // We will now be at the "My projects" page.  Each test must ensure
    // that it leaves the app at the "My projects" page.
  });

  beforeEach(initSpecimenIntercepts);

  // #endregion

  ////////////////////////////////////////////////////////////////////////
  // #region Helpers

  const kMp3AssetName = "sine-1kHz-2s.mp3";
  const kPngAssetName = "red-rectangle-80-60.png";
  const kExpFlatAssetNames = [kPngAssetName, kMp3AssetName];

  // In the before() function, we set up the following projects:
  const kExpAllProjectNames = [
    "Untitled project",
    "Per-method test project",
    'My "catch-apple"',
    "Hello World Specimen",
    "Test seed project",
  ];

  const kPerMethodProjectIdx = 1;
  const kTutorialFollowingProjectIdx = 2;
  const kSpecimenLinkedProjectIdx = 3;
  const kFlatProjectIdx = 4;

  const projectName = (idx: number): string => kExpAllProjectNames[idx];

  // #endregion
});
