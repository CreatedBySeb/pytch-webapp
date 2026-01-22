/// <reference types="cypress" />

import { assertJrTutChapterNumber, settleModalDialog } from "./junior/utils";
import { assertInIDE, assertOnFrontPage } from "./utils";

context("Start jr tutorial at chapter", () => {
  beforeEach(() => {
    cy.pytchResetDatabase();
  });

  function assertTutorialNameIncludes(match: string) {
    cy.get(".TutorialCard.start-at-chapter .card-title").should(
      "include.text",
      match
    );
  }

  function assertChapterStartContent(expChapterIndex: number) {
    cy.get(".TutorialCard.start-at-chapter .chapter-index-content").should(
      "have.text",
      `Starting at chapter ${expChapterIndex}`
    );
  }

  function attemptCreateProject() {
    cy.get(".TutorialCard.start-at-chapter button").click();
  }

  function assertError(messageMatch: string) {
    cy.get(".GenericErrorModal").contains(messageMatch);

    // Dismissing the modal should give the full page structure, but
    // with error message.
    settleModalDialog("OK");
    cy.get(".NavBar.inert");
    cy.get(".TutorialList");
    cy.get(".ExceptionDisplay").contains(messageMatch);
  }

  it("start tutorial at specified chapter", () => {
    cy.visit("/tutorial-checkpoint/script-by-script-boing/6");
    assertTutorialNameIncludes("a Pong-like game");
    assertChapterStartContent(6);

    attemptCreateProject();
    assertJrTutChapterNumber(6);
    cy.contains("Bounce the ball off the bats");
  });

  it("reject invalid tutorial slug", () => {
    cy.visit("/tutorial-checkpoint/no-such-tutorial/0");
    assertError("failed to fetch");
  });

  it("reject invalid chapter index for valid tutorial", () => {
    cy.visit("/tutorial-checkpoint/script-by-script-boing/42");
    attemptCreateProject();
    assertError("chapter 42 not found");
  });

  it("navigate with replacement", () => {
    cy.visit("/tutorial-checkpoint/script-by-script-boing/6");
    attemptCreateProject();
    assertInIDE("per-method");
    cy.go("back");
    assertOnFrontPage();
  });
});
