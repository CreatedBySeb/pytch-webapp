/** Set up request intercepts for a specimen for use intests. */
export function initSpecimenIntercepts() {
  cy.intercept("GET", "**/hello-world-lesson.zip", {
    fixture: "lesson-specimens/hello-world-lesson.zip",
  });
  cy.intercept("GET", "**/_by_content_hash_/*f4db652fe09e1663.zip", {
    fixture: "lesson-specimens/hello-world-lesson.zip",
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function setInstantDelays(window: any) {
  window.PYTCH_CYPRESS.instantDelays = true;
}

/** Object with function properties to help with testing behaviour of
 * the Save button.  In most cases, tests should be able to use:
 *
 * * `shouldReactToInteraction(interaction)` — assert that the Save
 *   button is unlit; perform the given `interaction()`; assert that the
 *   Save button is lit; click it; assert that it's not lit.
 *
 * The following finer-grained functions also exist if more control is
 * needed:
 *
 * * `click()` — click the Save button
 * * `shouldShowNoUnsavedChanges()` — assert that the Save button is in
 *   its normal, unhighlighted state, indicating that there are no
 *   unsaved changes
 * * `shouldShowUnsavedChanges()` — assert that the Save button is in
 *   its highlighted state, indicating that there **are** unsaved
 *   changes
 *   */
export const saveButton = (() => {
  const button = () => cy.get("button.save-button");
  const assertClass = (cls: string) => () => button().should("have.class", cls);

  const click = () => button().click();
  const shouldShowNoUnsavedChanges = assertClass("no-changes-since-last-save");
  const shouldShowUnsavedChanges = assertClass("unsaved-changes-exist");

  return {
    click,
    shouldShowNoUnsavedChanges,
    shouldShowUnsavedChanges,
    shouldReactToInteraction(interaction: () => void) {
      shouldShowNoUnsavedChanges();
      interaction();
      shouldShowUnsavedChanges();
      click();
      shouldShowNoUnsavedChanges();
    },
  };
})();

/** Set up a Cypress `intercept()` for the demo zipfile whose filename
 * has the given `demoStem`. */
export function interceptDemoZipfile(demoStem: string) {
  cy.intercept("GET", `**/fake-build-id-for-tests/${demoStem}.zip`, {
    fixture: `project-zipfiles/${demoStem}.zip`,
  });
}

export function createProjectFollowingTutorial(tutorialMatch: string) {
  cy.contains(tutorialMatch)
    .parent()
    .within(() => {
      cy.get("button").contains("Tutorial").click();
    });

  cy.contains("images and sounds");
  cy.get(".ReadOnlyOverlay").should("not.exist");
}

/** Assuming we're on the "My projects" page, open the dropdown menu for
 * the unique project whose name matches the given `projectName`, and
 * choose the unique dropdown item whose name matches the given
 * `actionName`. */
export const launchProjectInListDropdownAction = (
  projectName: string,
  actionName: string
) => {
  cy.get(".project-name")
    .contains(projectName)
    .should("have.length", 1)
    .parent()
    .parent()
    .parent()
    .within(() => {
      cy.get(".dropdown").click();
      cy.contains(actionName).should("have.length", 1).click();
    });
  cy.get(".modal").should("have.length", 1).should("be.visible");
};

/** Assuming we're on the "My projects" page, select (for potential
 * deletion) the unique project matching the given `name`. */
export const selectUniqueProject = (name: string) => {
  cy.contains(name)
    .should("have.length", 1)
    .parent()
    .parent()
    .find("span.selection-check")
    // "force" in case list is long and project is out of viewport:
    .click({ force: true });
};

/** Assuming we're on the "Tutorials" page, launch the Share modal for
 * the unique tutorial whose name matches the given `nameMatch`. */
export const launchShareTutorialModal = (nameMatch: string) => {
  cy.get("ul.tutorial-list li")
    .contains(nameMatch)
    .should("have.length", 1)
    .parent()
    .within(() => {
      cy.get("button").contains("Share").click();
    });
};

/** Assuming we're on the "My project" page, launch the "Create project"
 * modal and, if `name` is supplied, type that `name` into the text-box
 * to provide a name for the to-be-created project. */
export function launchCreateProjectModal(name?: string) {
  cy.get("button").contains("Create new").click();
  if (name != null) {
    cy.get("input[type=text]").clear().type(name);
  }
}
