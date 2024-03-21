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
});
