/// <reference types="cypress" />

context("Choice of UI version", () => {
  // Some of this behaviour is already implicitly tested, in that we
  // have to (and do) choose v2 for most existing tests to work.

  beforeEach(() => {
    cy.pytchResetDatabase({ uiVersion: "v1" });
    cy.contains("try a new way of writing Pytch");
  });
});
