/// <reference types="cypress" />

context("Front page", () => {
  const urlWithinBase = (path: string) => {
    const base = Cypress.config("baseUrl");
    const baseOk = base != null && base.endsWith("/");
    if (!baseOk) throw new Error("Cypress baseUrl config should end in a /");
    return `${base}${path}`;
  };

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

  context("narrow viewport", () => {
    const burgerMenuShouldBe = (expState: "collapsed" | "expanded") => {
      cy.get(`.burger-menu.is-${expState}`);
    };
    const openBurger = () => {
      cy.get(".burger-menu.is-collapsed").click();
      cy.get("li").contains("My projects").should("be.visible");
      burgerMenuShouldBe("expanded");
    };
    const closeBurger = () => {
      cy.get(".burger-menu.is-expanded").click();
      cy.get("li").contains("My projects").should("not.be.visible");
      burgerMenuShouldBe("collapsed");
    };
    const chooseBurgerItem = (match: string) => {
      cy.get(".NavBar ul.menuIsExpanded li").contains(match).click();
    };

    beforeEach(() => {
      cy.viewport(720, 960);
      cy.visit("/");
    });

    it("looks OK", () => {
      burgerMenuShouldBe("collapsed");
      cy.get(".burger-menu").should("be.visible");
      cy.get("li").contains("My projects").should("not.be.visible");
    });

    it("navigates to contact", () => {
      openBurger();
      cy.get("a.contact-us-link").click();
      burgerMenuShouldBe("collapsed");
      cy.contains("Please email us").should("be.visible");
    });

    it("burger menu", () => {
      openBurger();
      closeBurger();

      openBurger();
      chooseBurgerItem("My projects");
      cy.location("href").should("eq", urlWithinBase("my-projects/"));
      cy.get("h1").contains("My projects");
      cy.go("back");

      burgerMenuShouldBe("collapsed");
    });

    itRunsCodingJourneys({ expectDeviceSizeWarning: true });
  });
});
