import { Actions } from "easy-peasy";
import { StructuredProgram } from "../../../src/model/junior/structured-program";
import { IActiveProject } from "../../../src/model/project";
import {
  loadAndRunDemo,
  selectStage,
  selectActorAspect,
  selectInfoPane,
  selectSprite,
  withPytchJrProgramIt,
} from "./utils";

context("Scroll error-line into view", () => {
  beforeEach(loadAndRunDemo("per-method-long-scripts"));

  function insertNameErrorIntoStage(
    program: StructuredProgram,
    scriptIdx: number,
    lineNo: number,
    programActions: Actions<IActiveProject>
  ) {
    const stage = program.actors[0];
    const handler = stage.handlers[scriptIdx];
    let lines = handler.pythonCode.split("\n");
    const lineIdx = lineNo - 1;
    lines[lineIdx] = `pront() ${lines[lineIdx]}`;
    programActions.setHandlerPythonCode({
      actorId: stage.id,
      handlerId: handler.id,
      code: lines.join("\n"),
    });
    cy.get(".Junior-CodeEditor").contains("pront");
  }

  function clickSoleGoToError() {
    cy.get(".go-to-line").should("have.length", 1).click();
  }

  function assertScrollCorrect(scriptIdx: number) {
    cy.get(".ace_line")
      .contains("pront")
      .should("be.visible")
      .then(($lines) => {
        const lineDiv = $lines[0] as HTMLElement;
        const lineBottom = lineDiv.getBoundingClientRect().bottom;
        cy.get(".AddSomethingButtonStrip").then(($divs) => {
          const stripDiv = $divs[0] as HTMLElement;
          const stripTop = stripDiv.getBoundingClientRect().top;
          const lineOffsetFromBottom = stripTop - lineBottom;

          // The threshold of "20" here is approx
          // (AceController.kScrollIntoViewLinesBelow × line-stride).
          cy.wrap(lineOffsetFromBottom).should("be.above", 20);

          if (lineOffsetFromBottom > 25) {
            cy.get(".PytchScriptEditor")
              .eq(scriptIdx)
              .find(".HatBlock")
              .should("be.visible");
          }
        });
      });
  }

  const goToErrorLocationSpecs = [
    { scriptIdx: 0, lineNo: 4 },
    { scriptIdx: 0, lineNo: 38 },
    { scriptIdx: 1, lineNo: 4 },
    { scriptIdx: 1, lineNo: 24 },
    { scriptIdx: 1, lineNo: 48 },
  ];

  goToErrorLocationSpecs.forEach((spec) =>
    withPytchJrProgramIt(
      `scrolls error at ${spec.scriptIdx}/${spec.lineNo} into view`,
      (program, actions) => {
        insertNameErrorIntoStage(program, spec.scriptIdx, spec.lineNo, actions);

        selectSprite("Snake");
        selectActorAspect("Sounds");
        selectInfoPane("Output");
        cy.pytchGreenFlag();

        cy.pytchShouldShowJuniorErrorCard(
          "name 'pront' is not defined",
          "user-space"
        );

        selectStage();
        selectActorAspect("Code");

        clickSoleGoToError();
        assertScrollCorrect(spec.scriptIdx);
        cy.pytchSendKeysToApp("x = ");
        cy.get(".ace_line").contains("x = pront");

        cy.get(".Junior-CodeEditor").scrollTo("top");
        clickSoleGoToError();
        assertScrollCorrect(spec.scriptIdx);
        cy.pytchSendKeysToApp("y");
        cy.get(".ace_line").contains("yx = pront");

        selectActorAspect("Sounds");
        selectActorAspect("Code");
        clickSoleGoToError();
        assertScrollCorrect(spec.scriptIdx);
        cy.pytchSendKeysToApp("z");
        cy.get(".ace_line").contains("zyx = pront");
      }
    )
  );
});
