import {
  deleteAllCodeOfSoleHandler,
  selectActorAspect,
  selectSprite,
} from "./utils";

context("Use Python stdlib modules", () => {
  beforeEach(() => {
    cy.pytchBasicJrProject();
  });

  const setScriptCode = (codeText: string) => {
    selectSprite("Snake");
    selectActorAspect("Code");
    cy.get(".ace_editor").contains("Hi there").should("be.visible");
    deleteAllCodeOfSoleHandler();
    cy.get(".PytchScriptEditor .ace_editor").type(codeText);
  };

  it("can use math module", () => {
    setScriptCode("print(math.gcd(30, 45))");
    cy.pytchGreenFlag();
    cy.pytchStdoutShouldEqual("15\n");
  });
});
