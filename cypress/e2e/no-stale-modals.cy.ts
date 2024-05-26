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

  // #endregion
});
