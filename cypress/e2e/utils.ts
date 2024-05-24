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
