/// <reference types="cypress" />

context("Front page", () => {
  type LaunchCodingJourneyModalOpts = { expectDeviceSizeWarning: boolean };
  const launchCodingJourneyModal = (opts: LaunchCodingJourneyModalOpts) => {
    cy.contains("coding journey").click();
    cy.get(".modal").should("be.visible");
    if (opts.expectDeviceSizeWarning)
      cy.contains("reasonably large screen").should("be.visible");
  };

  type ItRunsCodingJourneysOpts = LaunchCodingJourneyModalOpts;
  const itRunsCodingJourneys = (opts: ItRunsCodingJourneysOpts) =>
    it("runs coding journeys", () => {
      launchCodingJourneyModal(opts);
      cy.get("button.btn-close").click();
      cy.get(".modal").should("not.exist");

      launchCodingJourneyModal(opts);
      cy.contains("guided help and tutorials").click();
      cy.get(".modal").should("not.exist");
      cy.contains("This tutorial will introduce you");
      cy.location("href").should("eq", urlWithinBase("tutorials/"));
      cy.get(".home-link").click();

      launchCodingJourneyModal(opts);
      cy.contains("Start a new project").click();
      cy.contains("Start a new project").should("not.exist");
      cy.get(".modal-title").contains("Create a new project");
      cy.get("button").contains("Cancel").click();
      cy.get(".modal").should("not.exist");

      launchCodingJourneyModal(opts);
      cy.contains("Start a new project").click();
      cy.get(".modal-body input").type(
        "{selectAll}{del}E2E test project{enter}"
      );
      cy.get(".StageControls");
      cy.go("back");
    });
});
