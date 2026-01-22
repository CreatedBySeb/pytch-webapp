/// <reference types="cypress" />

import {
  assertTwoStateSwitchState,
  launchAdd,
  selectActorAspect,
} from "./junior/utils";
import { kExpNMediaLibEntries } from "./utils";

const launchChooseClipArt = () => {
  launchAdd.assetFromMediaLibrary();
  cy.contains("Add to project").should("be.disabled");
};

context("Add clipart from library, handling errors", () => {
  const clickAddN = (expAddN: number) => {
    const expLabel = `Add ${expAddN} to project`;
    cy.get("button").contains(expLabel).click();
  };

  const attemptChooseClipArt = (
    clipArtNames: Array<string>,
    expAddN: number
  ) => {
    launchChooseClipArt();
    clipArtNames.forEach((clipArtName) =>
      cy.get(".clipart-card").contains(clipArtName).click()
    );
    clickAddN(expAddN);
  };

  const chooseClipArt = (clipArtNames: Array<string>, expAddN: number) => {
    attemptChooseClipArt(clipArtNames, expAddN);
    cy.get(".modal-content").should("not.exist");
  };

  const startTestAssets = [
    "red-rectangle-80-60.png",
    "sine-1kHz-2s.mp3",
    "apple.png",
  ];

  beforeEach(() => {
    cy.pytchExactlyOneProject();
    cy.contains("Images and sounds").click();
    chooseClipArt(["apple.png"], 1);
    cy.pytchShouldShowAssets(startTestAssets);
  });

  it("can dismiss with keyboard", () => {
    launchChooseClipArt();
    cy.get(".modal").type("{esc}");
    cy.get(".modal").should("not.exist");
  });

  it("can add a single-item entry", () => {
    chooseClipArt(["bird.png"], 1);
    cy.pytchShouldShowAssets([...startTestAssets, "bird.png"]);
  });

  it("can add a multi-item entry", () => {
    chooseClipArt(["blocks"], 2);
    cy.pytchShouldShowAssets([
      ...startTestAssets,
      "block-lit.png",
      "block-unlit.png",
    ]);
  });

  it("can scroll through the gallery to find clipart", () => {
    chooseClipArt(["world.png"], 1);
    cy.pytchShouldShowAssets([...startTestAssets, "world.png"]);
  });

  const assertErrorContains = (content: string) => {
    cy.get(".modal.add-asset-failures .modal-body").contains(content);
  };

  it("rejects adding same clipart twice", () => {
    attemptChooseClipArt(["apple.png"], 1);

    assertErrorContains("Sorry, there was a problem adding files");
    assertErrorContains('Cannot add "apple.png" to your project');
    assertErrorContains("it already contains an image or sound of that name");

    cy.get("button").contains("OK").click();
    cy.pytchShouldShowAssets(startTestAssets);
  });

  it("handles one failure and one success", () => {
    attemptChooseClipArt(["apple.png", "orange.png"], 2);

    assertErrorContains("Sorry, there was a problem adding files");
    assertErrorContains('Cannot add "apple.png" to your project');
    assertErrorContains("it already contains an image or sound of that name");

    // TODO: Test for toast.

    cy.contains("OK").click();
    cy.pytchShouldShowAssets([...startTestAssets, "orange.png"]);
  });

  it("handles two failures and one success", () => {
    chooseClipArt(["orange.png"], 1);
    attemptChooseClipArt(["orange.png", "apple.png", "bird.png"], 3);

    assertErrorContains("Sorry, there was a problem adding files");
    assertErrorContains('Cannot add "apple.png" to your project');
    assertErrorContains('Cannot add "orange.png" to your project');
    assertErrorContains("it already contains an image or sound of that name");

    // TODO: Test for toast.

    cy.contains("OK").click();
    cy.pytchShouldShowAssets([...startTestAssets, "orange.png", "bird.png"]);
  });

  it("handles one failure and two successes", () => {
    attemptChooseClipArt(["apple.png", "orange.png", "bird.png"], 3);

    assertErrorContains("Sorry, there was a problem adding files");
    assertErrorContains('Cannot add "apple.png" to your project');
    assertErrorContains("it already contains an image or sound of that name");

    // TODO: Test for toast.

    cy.contains("OK").click();
    cy.pytchShouldShowAssets([...startTestAssets, "orange.png", "bird.png"]);
  });
});

const assertNEntries = (expNEntries: number) => {
  cy.get("ul.ClipArtEntriesList li").should("have.length", expNEntries);
};

context("All/just-tut switch", () => {
  const assertMediaLibSwitchState = (
    expState: "absent" | "all" | "just-this-tutorial"
  ) => {
    if (expState === "absent") {
      cy.get(".all-vs-tutorial-switch").should("not.exist");
    } else {
      assertTwoStateSwitchState("all-vs-tutorial-switch", expState === "all");
    }
  };

  [
    {
      label: "per-method",
      prepare: () => {
        cy.pytchBasicJrProject();
        selectActorAspect("Backdrops");
      },
    },
    {
      label: "flat",
      prepare: cy.pytchExactlyOneProject,
    },
  ].forEach((spec) =>
    it(`shows no switch if not linked (${spec.label})`, () => {
      spec.prepare();
      launchChooseClipArt();
      assertMediaLibSwitchState("absent");
      assertNEntries(kExpNMediaLibEntries);
    })
  );

  [
    {
      label: "per-method",
      tutorialSlug: "script-by-script-boing",
      expNEntries: 5,
      preLaunch: () => selectActorAspect("Backdrops"),
    },
    {
      label: "flat",
      tutorialSlug: "boing",
      expNEntries: 3,
      preLaunch: () => void 0,
    },
  ].forEach((spec) =>
    it(`shows all/just-tutorial assets (${spec.label})`, () => {
      cy.pytchProjectFollowingTutorial(spec.tutorialSlug);
      spec.preLaunch();
      launchChooseClipArt();

      assertMediaLibSwitchState("just-this-tutorial");
      assertNEntries(spec.expNEntries);

      cy.get(".all-vs-tutorial-switch").click();
      assertMediaLibSwitchState("all");
      assertNEntries(kExpNMediaLibEntries);

      cy.get(".all-vs-tutorial-switch").click();
      assertMediaLibSwitchState("just-this-tutorial");
      assertNEntries(spec.expNEntries);
    })
  );
});

context("Layout on short screens", () => {
  [1200, 1000, 800, 640].forEach((viewportHeight) =>
    it(`fits on screen (${viewportHeight}h)`, () => {
      cy.viewport(1600, viewportHeight);
      cy.pytchProjectFollowingTutorial();
      cy.contains("Images and sounds").click();
      launchChooseClipArt();
      cy.get(".all-vs-tutorial-switch").click();
      assertNEntries(kExpNMediaLibEntries);

      cy.get(".modal-body").then(($elts) => {
        const elt = $elts[0] as HTMLDivElement;
        cy.wrap(elt.clientHeight).should("be.lte", viewportHeight - 60);
      });
    })
  );
});
