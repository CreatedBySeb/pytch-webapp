/// <reference types="cypress" />

import { assertOnHomepage } from "./utils";

context("General site navigation", () => {
  it("handles unknown pages within app", () => {
    cy.visit("/no-such-route-blah-blah");
    cy.contains("Sorry, we could not find that page");
    cy.contains("Pytch homepage").click();
    assertOnHomepage();
  });

  it("handles uncaught exceptions", () => {
    // In dev mode, React still thinks the exception is unhandled, so
    // tell it to ignore uncaught exceptions:
    cy.on("uncaught:exception", () => false);

    const detail = "oh-no-something-went-wrong";
    cy.visit(`/deliberate-failure/${detail}`);
    cy.get(".ExceptionDisplay").contains(detail);
  });

  // For "out-of-range", generate a string of decimals which will parse
  // to an "unsafe integer", i.e., one which can't be stored exactly.
  [
    { label: "non-numeric", idString: "not-a-valid-id" },
    { label: "out-of-range", idString: `${Number.MAX_SAFE_INTEGER}1` },
  ].forEach((spec) => {
    it(`handles malformed project-id (${spec.label})`, () => {
      cy.visit(`/ide/${spec.idString}`);
      cy.contains("Sorry, there was a problem");
      cy.title().should("eq", "Pytch: Problem loading project");
      cy.contains("Return to").click();
      cy.get("h1").contains("My projects");
    });
  });
});
