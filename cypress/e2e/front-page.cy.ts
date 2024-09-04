/// <reference types="cypress" />

context("Front page", () => {
  type LaunchCodingJourneyModalOpts = { expectDeviceSizeWarning: boolean };
  const launchCodingJourneyModal = (opts: LaunchCodingJourneyModalOpts) => {
    cy.contains("coding journey").click();
    cy.get(".modal").should("be.visible");
    if (opts.expectDeviceSizeWarning)
      cy.contains("reasonably large screen").should("be.visible");
  };
});
