import { Actions } from "easy-peasy";
import { StructuredProgram } from "../../../src/model/junior/structured-program";
import { IActiveProject } from "../../../src/model/project";
import { loadAndRunDemo } from "./utils";

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
});
