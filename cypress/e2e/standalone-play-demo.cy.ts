import { blueColour, emptyColour } from "./crop-scale-constants";
import { interceptDemoZipfile } from "./utils";

context("Standalone play-demo", () => {
  it("runs a demo", () => {
    interceptDemoZipfile("one-cropped-scaled-sprite");
    cy.visit("/play-demo/fake-build-id-for-tests/one-cropped-scaled-sprite");
    cy.pytchCanvasShouldBeSolidColour(blueColour);
    cy.pytchClickStage(0, 0);
    cy.pytchCanvasShouldBeSolidColour(emptyColour);
    cy.pytchGreenFlag();
    cy.pytchCanvasShouldBeSolidColour(blueColour);
  });
});
