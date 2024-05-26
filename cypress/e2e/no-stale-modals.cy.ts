/// <reference types="cypress" />
import {
  createProjectFollowingTutorial,
  initSpecimenIntercepts,
  setInstantDelays,
} from "./utils";
import {
  assertActorNames,
  assertCostumeNames,
  assertHatBlockLabels,
  selectActorAspect,
  selectSprite,
} from "./junior/utils";

context("Modals are cancelled when navigating away", () => {
  ////////////////////////////////////////////////////////////////////////
  // #region Common set-up

  before(() => {
    initSpecimenIntercepts();

    cy.pytchResetDatabase();
    cy.visit("/lesson/hello-world-lesson", { onLoad: setInstantDelays });
    cy.pytchHomeFromIDE();

    cy.get(".NavBar").contains("Tutorials").click();
    createProjectFollowingTutorial("Catch the apple");
    cy.pytchHomeFromIDE();

    cy.pytchTryUploadZipfiles([
      "newly-created-per-method.zip",
      "simple-pytchjr-project.zip",
    ]);

    // We will now be at the "My projects" page.  Each test must ensure
    // that it leaves the app at the "My projects" page.
  });

  beforeEach(initSpecimenIntercepts);

  // #endregion

  ////////////////////////////////////////////////////////////////////////
  // #region Helpers

  const kMp3AssetName = "sine-1kHz-2s.mp3";
  const kPngAssetName = "red-rectangle-80-60.png";
  const kExpFlatAssetNames = [kPngAssetName, kMp3AssetName];

  // In the before() function, we set up the following projects:
  const kExpAllProjectNames = [
    "Untitled project",
    "Per-method test project",
    'My "catch-apple"',
    "Hello World Specimen",
    "Test seed project",
  ];

  const kPerMethodProjectIdx = 1;
  const kTutorialFollowingProjectIdx = 2;
  const kSpecimenLinkedProjectIdx = 3;
  const kFlatProjectIdx = 4;

  const projectName = (idx: number): string => kExpAllProjectNames[idx];

  // Assertions that we are at various pages and have no modals:

  const assertNoModals = () => cy.get(".modal").should("not.exist");

  const assertHomePageNoModals = () => {
    cy.contains("Pytch is a bridge from Scratch to Python");
    assertNoModals();
  };

  function assertMyProjectsNoModals() {
    cy.get(".ProjectList h1").contains("My projects");
    assertNoModals();
  }

  function assertTutorialsNoModals() {
    cy.get(".TutorialList h1").contains("Tutorials");
    assertNoModals();
  }

  function assertProjectIdeNoModals() {
    cy.get("#pytch-stage-layers");
    assertNoModals();
  }

  // Navigation helpers:

  const navBack = () => cy.go("back");

  const openProjectByIdx = (idx: number): void => {
    cy.pytchOpenProject(projectName(idx));
    assertProjectIdeNoModals();
  };

  const goToMyProjectsAssertNoModals = () => {
    cy.get(".NavBar li").contains("My projects").click();
    assertMyProjectsNoModals();
  };

  const goToTutorialsAssertNoModals = () => {
    cy.get(".NavBar li").contains("Tutorials").click();
    assertTutorialsNoModals();
  };

  // Selection helpers for within the per-method IDE:

  const selectSnakeCode = () => {
    selectSprite("Snake");
    selectActorAspect("Code");
  };

  const selectSnakeCostumes = () => {
    selectSprite("Snake");
    selectActorAspect("Costumes");
  };

  // Machinery to describe a "navigating back abandons modal" test:

  // Which page should the test take place on:
  type PageIdentifier =
    | { kind: "my-projects" }
    | { kind: "ide"; projectIdx: number }
    | { kind: "tutorials" }
    | { kind: "specimen-linked-project" };

  // Type for bundle of functions to conduct the test, based on which
  // kind of page the test takes place on.  Declare these as function
  // properties rather than methods to get stricter type checking.
  // https://www.typescriptlang.org/docs/handbook/release-notes/typescript-2-6.html#strict-function-types
  type AbandonmentTestFuncs = {
    goToPageUnderTest: (page: PageIdentifier) => void;
    returnToPageUnderTest: (page: PageIdentifier) => void;
    returnToMyProjects: () => void;
  };

  type AbandonmentTestFuncsFromKind = Record<
    PageIdentifier["kind"],
    AbandonmentTestFuncs
  >;

  // Bundles of functions for each page-kind:
  const abandonmentTestFuncsFromKind: AbandonmentTestFuncsFromKind = {
    "my-projects": {
      goToPageUnderTest: () => void 0, // Already on "My projects"
      returnToPageUnderTest: () => {
        assertHomePageNoModals();
        goToMyProjectsAssertNoModals();
      },
      returnToMyProjects: () => void 0, // Already on "My projects"
    },
    ide: {
      goToPageUnderTest: (page: PageIdentifier) => {
        if (page.kind !== "ide") throw new Error("bad page.kind");
        openProjectByIdx(page.projectIdx);
      },
      returnToPageUnderTest: (page: PageIdentifier) => {
        if (page.kind !== "ide") throw new Error("bad page.kind");
        assertMyProjectsNoModals();
        openProjectByIdx(page.projectIdx);
      },
      returnToMyProjects: () => {
        navBack();
        assertMyProjectsNoModals();
      },
    },
    tutorials: {
      goToPageUnderTest: () => goToTutorialsAssertNoModals(),
      returnToPageUnderTest: () => {
        assertMyProjectsNoModals();
        goToTutorialsAssertNoModals();
      },
      returnToMyProjects: () => {
        navBack();
        assertMyProjectsNoModals();
      },
    },
    "specimen-linked-project": {
      goToPageUnderTest: () => {
        openProjectByIdx(kSpecimenLinkedProjectIdx);
      },
      returnToPageUnderTest: () => {
        assertMyProjectsNoModals();
        openProjectByIdx(kSpecimenLinkedProjectIdx);
      },
      returnToMyProjects: () => {
        navBack();
        assertMyProjectsNoModals();
      },
    },
  };

  // Test-specific information:
  type ItCanAbandonDescriptor = {
    only?: boolean;
    page: PageIdentifier;
    runModal: () => void;
    afterwardsExpect?: () => void;
  };

  // Register a test that navigating back abandons a particular modal.
  function itCanAbandon(label: string, descr: ItCanAbandonDescriptor) {
    const createTest = descr.only ?? false ? it.only : it;

    createTest(label, () => {
      const page = descr.page;
      const funcs = abandonmentTestFuncsFromKind[page.kind];

      funcs.goToPageUnderTest(page);
      descr.runModal();
      navBack();
      funcs.returnToPageUnderTest(page);
      descr.afterwardsExpect && descr.afterwardsExpect();
      funcs.returnToMyProjects();
    });
  }

  // Common assertions, intended for use as the `afterwardsExpect`
  // property of a test.

  const assertProjectNamesUnchanged = () =>
    cy.pytchProjectNamesShouldDeepEqual(kExpAllProjectNames);

  const assertFlatAssetsUnchanged = () =>
    cy.pytchShouldShowAssets(kExpFlatAssetNames);

  const assertActorNamesUnchanged = () => assertActorNames(["Stage", "Snake"]);

  const assertSnakeCostumesUnchanged = () => {
    selectSnakeCostumes();
    assertCostumeNames(["python-logo.png"]);
  };

  const assertSnakeHatBlocksUnchanged = () => {
    selectSnakeCode();
    assertHatBlockLabels(["when green flag clicked"]);
  };

  // #endregion

  ////////////////////////////////////////////////////////////////////////
  // #region Tests

  // #endregion
});
