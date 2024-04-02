/// <reference types="cypress" />

const initIntercept = () => {
  cy.intercept({ pathname: "ok.txt" }, { body: "OK\n" }).as("ok-endpoint");
};

const awaitInstrumentationEvent = () =>
  cy.wait("@ok-endpoint").its("request.query").should("have.property", "evt");

// These tests only work in production build, because in dev builds,
// React renders everything twice, which means we send the "render"
// event twice.

context("Send anonymous instrumentation events", () => {
  it("sends start-up event", () => {
    initIntercept();
    cy.visit("/");
    awaitInstrumentationEvent().should("equal", "render");
  });

  it("sends build events", () => {
    initIntercept();
    cy.pytchExactlyOneProject();
    awaitInstrumentationEvent().should("equal", "render");
    awaitInstrumentationEvent().should("match", /^project-loaded/);
    cy.pytchGreenFlag();
    awaitInstrumentationEvent().should("match", /^build-flat-success\./);
    cy.pytchSetCodeRaw("syntax(error");
    cy.pytchGreenFlag();
    awaitInstrumentationEvent().should("match", /^build-flat-failure\./);
  });
});
