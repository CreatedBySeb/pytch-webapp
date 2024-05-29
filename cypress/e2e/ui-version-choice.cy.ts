/// <reference types="cypress" />

import { settleModalDialog } from "./junior/utils";

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

  ////////////////////////////////////////////////////////////////////////

  it("allows version toggling in front page", () => {
    chooseFrontPageV2();
    assertFrontPageIsV2();
    chooseFrontPageV1();
    assertFrontPageIsV1();
  });

  it("initially offers simple create-project for v1", () => {
    launchCreateNewProject();
    assertCreateNewIsV1();
    chooseCreateNewV2();
    assertCreateNewIsV2();
  });

  it("initially offers full create-project for v2", () => {
    chooseFrontPageV2();
    launchCreateNewProject();
    assertCreateNewIsV2();
    chooseCreateNewV1();
    assertCreateNewIsV1();
  });

  it("toggling version in create-project is global", () => {
    launchCreateNewProject();
    chooseCreateNewV2();
    settleModalDialog("Cancel");
    goToFrontPage();
    assertFrontPageIsV2();

    launchCreateNewProject();
    chooseCreateNewV1();
    settleModalDialog("Cancel");
    goToFrontPage();
    assertFrontPageIsV1();
  });

  it("initially offers only classic tutorials for v1", () => {
    goToTutorials();
    assertTutorialsListIsV1();
    chooseTutorialsV2();
    assertTutorialsListIsV2();
    chooseTutorialsV1();
    assertTutorialsListIsV1();
  });

  it("initially offers all tutorials for v2", () => {
    chooseFrontPageV2();
    goToTutorials();
    assertTutorialsListIsV2();
    chooseTutorialsV1();
    assertTutorialsListIsV1();
    chooseTutorialsV2();
    assertTutorialsListIsV2();
  });

  it("toggling version in tutorials is global", () => {
    goToTutorials();
    chooseTutorialsV2();
    goToFrontPage();
    assertFrontPageIsV2();

    goToTutorials();
    chooseTutorialsV1();
    goToFrontPage();
    assertFrontPageIsV1();
  });
});

context("Choose UIv2 with query param", () => {
  const enableV2Query = "ui-v2";

  type ChooseV2Spec = { urlSuffix: string; matchText: string };
  const chooseV2Specs: Array<ChooseV2Spec> = [
    {
      urlSuffix: "",
      matchText: "Thanks for trying the script by script way",
    },
    {
      urlSuffix: "tutorials",
      matchText: "Script-by-script catch the apple",
    },
    {
      urlSuffix: "my-projects",
      matchText: "My projects", // Doesn't look different
    },
  ];

  chooseV2Specs.forEach(({ urlSuffix, matchText }) => {
    it(`for url-suffix "${urlSuffix}"`, () => {
      cy.visit(`/${urlSuffix}?${enableV2Query}`);
      cy.contains(matchText);
      cy.location()
        .then((location) => location.toString())
        .should("not.contain", enableV2Query);
    });
  });
});
