/// <reference types="cypress" />

type SidebarTestContext = {
  label: string;
  containerSelector: string;
  initialVisibilityPredicate: string;
  hiddenPredicate: string;
  openControlSelector: string;
  closeControlSelector: string;
  before(): void;
  ensureSidebarHidden(): void;
};

const flatIdeContext: SidebarTestContext = {
  label: "flat",
  containerSelector: ".help-sidebar > .content-wrapper",
  initialVisibilityPredicate: "not.be.visible",
  hiddenPredicate: "not.be.visible",
  openControlSelector: ".help-sidebar .control",
  closeControlSelector: ".help-sidebar > .content-wrapper .dismiss-help",
  before() {
    cy.pytchExactlyOneProject();
  },
  ensureSidebarHidden: () => null,
};

const perMethodContainerSelector = ".ActivityContent > .HelpSidebar";
const perMethodToggleSelector = '.tabkey-icon svg[data-icon="circle-question"]';
const perMethodIdeContext: SidebarTestContext = {
  label: "per-method",
  containerSelector: perMethodContainerSelector,
  initialVisibilityPredicate: "be.visible",
  hiddenPredicate: "not.exist",
  openControlSelector: perMethodToggleSelector,
  closeControlSelector: perMethodToggleSelector,
  before() {
    cy.pytchBasicJrProject();
  },
  ensureSidebarHidden() {
    cy.get(perMethodToggleSelector).click();
    cy.get(perMethodContainerSelector).should("not.exist");
  },
};

const sidebarTestContexts = [flatIdeContext, perMethodIdeContext];

sidebarTestContexts.forEach((ctx) =>
  context(`Help sidebar (${ctx.label})`, () => {
    const useSectionHeadings = (
      callback: (headings: Array<string>) => void
    ) => {
      cy.request("data/help-sidebar.json").then((response) => {
        const headingBlocks = response.body.filter(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (item: any) => item.kind === "heading"
        );

        const headings = headingBlocks
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((item: any) => item.heading);

        callback(headings);
      });
    };

    const getHelpContainer = () => cy.get(ctx.containerSelector);

    const assertAllSectionsCollapsed = (headings: Array<string>) => {
      const allHeadingsFlat = headings.join("");
      getHelpContainer().should("contain.text", allHeadingsFlat);
    };

    const assertAllCollapsedExcept = (
      allHeadings: Array<string>,
      expandedHeading: string
    ) => {
      for (const heading of allHeadings) {
        getHelpContainer()
          .find("h1")
          .contains(heading)
          .parent()
          .parent()
          .as("header");
        cy.get("@header").should("have.class", "HelpSidebarSection");

        if (heading !== expandedHeading) {
          cy.get("@header").should("have.text", heading);
        } else {
          cy.get("@header")
            .should("contain.text", heading)
            .should("not.have.text", heading);
        }
      }
    };

    before(() => {
      ctx.before();
      getHelpContainer().should(ctx.initialVisibilityPredicate);
      ctx.ensureSidebarHidden();
    });

    const openSidebar = () => {
      getHelpContainer().should(ctx.hiddenPredicate);
      cy.get(ctx.openControlSelector).click();
      getHelpContainer().should("be.visible");
    };

    const closeSidebar = () => {
      getHelpContainer().should("be.visible");
      cy.get(ctx.closeControlSelector).click();
      getHelpContainer().should(ctx.hiddenPredicate);
    };

    it("allows user to open/close sidebar", () => {
      openSidebar();
      closeSidebar();
    });

    it("has section list in sidebar", () =>
      useSectionHeadings((headings) => {
        openSidebar();
        assertAllSectionsCollapsed(headings);
        closeSidebar();
      }));

    it("can expand/contract one section", () =>
      useSectionHeadings((headings) => {
        openSidebar();
        getHelpContainer().contains("Operators").click();
        getHelpContainer().contains("math.floor");
        assertAllCollapsedExcept(headings, "Operators");
        getHelpContainer().contains("Operators").click();
        assertAllSectionsCollapsed(headings);
        closeSidebar();
      }));

    it("can expand one section then another", () =>
      useSectionHeadings((headings) => {
        openSidebar();
        getHelpContainer().contains("Operators").click();
        getHelpContainer().contains("math.floor");

        getHelpContainer().contains("Working with variables").click();
        getHelpContainer().contains("pytch.show_variable");
        assertAllCollapsedExcept(headings, "Working with variables");
        getHelpContainer().contains("Working with variables").click();

        // Click centre-left to check for absence of bug SF noticed with
        // hover tooltips in "per-method" editor.
        getHelpContainer().contains("Motion").click("left");
        assertAllCollapsedExcept(headings, "Motion");
        getHelpContainer().contains("Motion").click("left");

        assertAllSectionsCollapsed(headings);
        closeSidebar();
      }));

    it("collapses sections when hiding sidebar", () => {
      useSectionHeadings((headings) => {
        openSidebar();
        getHelpContainer().contains("Operators").click();
        getHelpContainer().contains("math.floor");

        closeSidebar();
        openSidebar();

        assertAllSectionsCollapsed(headings);
        closeSidebar();
      });
    });

    it("allows help text to be shown", () => {
      openSidebar();
      getHelpContainer().contains("Looks").click();
      cy.contains("self.backdrop_number")
        .parentsUntil(".pytch-method")
        .parent()
        .within(() => {
          cy.get(".help-button").click();
          cy.contains("Python counts list entries");
          cy.get(".help-button").click();
        });
      getHelpContainer().contains("Looks").click();
      closeSidebar();
    });
  })
);

context("Help sidebar (cross-mode)", () => {
  it("opens project with sidebar collapsed", () => {
    cy.pytchExactlyOneProject();
    cy.pytchBasicJrProject();

    cy.pytchSwitchProject("Test seed project");
    cy.get(flatIdeContext.openControlSelector).click();
    cy.get(flatIdeContext.containerSelector).should("be.visible");

    cy.pytchSwitchProject("Per-method test project");
    cy.get(perMethodIdeContext.containerSelector).should("be.visible");
    cy.get(perMethodIdeContext.containerSelector).contains("Sound").click();

    cy.pytchSwitchProject("Test seed project");
    cy.contains("play_sound_until_done").should("not.exist");
  });
});
