/// <reference types="cypress" />

context("Choice of UI version", () => {
  // Some of this behaviour is already implicitly tested, in that we
  // have to (and do) choose v2 for most existing tests to work.

  beforeEach(() => {
    cy.pytchResetDatabase({ uiVersion: "v1" });
    cy.contains("try a new way of writing Pytch");
  });

  const goToFrontPage = () =>
    cy.get(".title-and-version").contains("Pytch").click();

  const getFrontPageChooseV1Link = () =>
    cy.get(".ToggleUiStylePanel .pseudo-link").contains("back to classic");

  const getFrontPageChooseV2Link = () =>
    cy.get(".ToggleUiStylePanel .pseudo-link").contains("Try it");

  function assertFrontPageIsV1() {
    cy.get(".ToggleUiStylePanel").contains("try a new way");
    getFrontPageChooseV2Link(); // Just check it exists.
  }

  function assertFrontPageIsV2() {
    cy.get(".ToggleUiStylePanel").contains("Thanks for trying");
    getFrontPageChooseV1Link(); // Just check it exists.
  }

  const chooseFrontPageV1 = () => getFrontPageChooseV1Link().click();

  const chooseFrontPageV2 = () => getFrontPageChooseV2Link().click();

  function launchCreateNewProject() {
    cy.get(".NavBar").contains("My projects").click();
    cy.get("button").contains("Create new").click();
    cy.get("button").contains("With example code");
  }

  const getCreateNewChooseV1Link = () =>
    cy.get(".change-ui-style").contains("back to classic");

  const getCreateNewChooseV2Link = () =>
    cy.get(".change-ui-style").contains("new script-by-script");

  function assertCreateNewIsV1() {
    // Without/With sample code, plus cancel and OK.
    cy.get(".modal button").should("have.length", 4);
    cy.get("button").contains("Without example");
    cy.get("button").contains("With example");
    getCreateNewChooseV2Link();
  }

  function assertCreateNewIsV2() {
    // Without/With sample code; flat/per-method; cancel and OK.
    cy.get(".modal button").should("have.length", 6);
    cy.get("button").contains("Without example");
    cy.get("button").contains("With example");
    cy.get("button").contains("one big");
    cy.get("button").contains("sprites and scripts");
    getCreateNewChooseV1Link();
  }

  const chooseCreateNewV1 = () => getCreateNewChooseV1Link().click();

  const chooseCreateNewV2 = () => getCreateNewChooseV2Link().click();

  const goToTutorials = () => cy.get(".NavBar").contains("Tutorials").click();

  const assertTutorialVersionFun = (predicate: string) => () =>
    cy
      .get(".TutorialCard")
      .contains("Script-by-script catch the apple")
      .should(predicate);

  const assertTutorialsListIsV1 = assertTutorialVersionFun("not.exist");

  const assertTutorialsListIsV2 = assertTutorialVersionFun("be.visible");

  const chooseTutorialsV1 = () =>
    cy.get(".tutorials-change-ui-style").contains("just the classic").click();

  const chooseTutorialsV2 = () =>
    cy.get(".tutorials-change-ui-style").contains("Show our new").click();
});
