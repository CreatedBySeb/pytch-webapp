import {
  selectActorAspect,
  selectSprite,
  selectStage,
  settleModalDialog,
} from "./utils";

context("Create/modify/delete event handlers", () => {
  beforeEach(() => {
    cy.pytchBasicJrProject();
  });

  const launchAddHandler = () => {
    selectSprite("Snake");
    selectActorAspect("Code");
    cy.get(".Junior-ScriptsEditor .AddSomethingButton").click();
  };

  const addHandler = (addFun: () => void) => {
    launchAddHandler();
    addFun();
    settleModalDialog("OK");
  };

  const chooseHandlerDropdownItem = (
    scriptIndex: number,
    itemMatch: string
  ) => {
    cy.get(".PytchScriptEditor .HatBlock")
      .eq(scriptIndex)
      .find("button")
      .click();
    cy.get(".dropdown-item").contains(itemMatch).click();
  };

  const noOperation = () => void 0;

  it("shows help when no handlers", () => {
    selectStage();
    selectActorAspect("Code");
    cy.get(".NoContentHelp").contains("Your stage has no scripts");
  });
});
