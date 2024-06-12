import {
  assertHatBlockLabels,
  clickUniqueButton,
  selectActorAspect,
  selectSprite,
  selectStage,
  settleModalDialog,
  soleEventHandlerCodeShouldEqual,
  typeIntoScriptEditor,
  ScriptOps,
  launchDeleteHandlerByIndex,
} from "./utils";
import { saveButton } from "../utils";

context("Create/modify/delete event handlers", () => {
  beforeEach(() => {
    cy.pytchBasicJrProject();
  });

  it("shows help when no handlers", () => {
    selectStage();
    selectActorAspect("Code");
    cy.get(".NoContentHelp").contains("Your stage has no scripts");
  });

  it("can cancel adding event handler", () => {
    const assertHandlersUnchanged = () =>
      assertHatBlockLabels(["when green flag clicked"]);

    ScriptOps.launchAddHandler();
    cy.assertCausesToVanish(".UpsertHandlerModal", () =>
      cy.get(".UpsertHandlerModal").type("{esc}")
    );
    assertHandlersUnchanged();

    ScriptOps.launchAddHandler();
    cy.assertCausesToVanish(".UpsertHandlerModal", () =>
      cy.get(".UpsertHandlerModal .btn-close").click()
    );
    assertHandlersUnchanged();

    ScriptOps.launchAddHandler();
    settleModalDialog("Cancel");
    assertHandlersUnchanged();
  });

  const addEventHandlerSpecs = [
    {
      label: "stage",
      selectAction: selectStage,
      expWhenClickedLabel: "when stage clicked",
    },
    {
      label: "sprite",
      selectAction: () => selectSprite("Snake"),
      expWhenClickedLabel: "when this sprite clicked",
    },
  ];
  addEventHandlerSpecs.forEach((spriteKindSpec) =>
    it(`can choose which event handler to add (${spriteKindSpec.label})`, () => {
      spriteKindSpec.selectAction();
      selectActorAspect("Code");
      cy.get(".Junior-CodeEditor .AddSomethingButton").click();

      let eventKindMatches: Array<string> = [
        "when green flag clicked",
        spriteKindSpec.expWhenClickedLabel,
        "when I receive",
        "key pressed",
      ];
      if (spriteKindSpec.label === "sprite") {
        eventKindMatches.push("when I start as a clone");
      }

      cy.get(".modal-footer button").contains("OK").as("ok-btn");

      for (const eventKindMatch of eventKindMatches) {
        cy.get("li.EventKindOption").contains(eventKindMatch).click();
        cy.get("li.EventKindOption.chosen")
          .should("have.length", 1)
          .contains(eventKindMatch);

        cy.get("@ok-btn").should("be.enabled");
      }

      // If we provide a message, that hat-block should become active.
      ScriptOps.typeMessageValue("go-for-it");
      cy.get("li.EventKindOption.chosen")
        .should("have.length", 1)
        .contains("when I receive");
    })
  );

  it("can choose key for when-key-pressed", () => {
    const launchKeyChooser = () =>
      cy.get("li.EventKindOption .KeyEditor").click();

    const assertKeySelected = (match: string) =>
      cy
        .get(".KeyChoiceModal .KeyOption.isSelected")
        .should("have.length", 1)
        .contains(match);

    ScriptOps.launchAddHandler();
    launchKeyChooser();
    assertKeySelected("space");

    cy.get(".KeyOption").contains("f").click();
    assertKeySelected("f");

    // Can't use settleModalDialog(): dismissing the Key Chooser leaves
    // the Hat Block Chooser modal visible, and settleModalDialog()
    // checks that, after performing the action, no modal dialog is
    // visible.
    clickUniqueButton("OK");

    cy.get(".KeyEditor .key-display-name").should("have.text", "f");

    launchKeyChooser();
    assertKeySelected("f");

    cy.get(".KeyOption").contains("x").click();
    assertKeySelected("x");

    // As above, close key chooser:
    clickUniqueButton("OK");
    // and then close hat-block chooser:
    settleModalDialog("OK");

    assertHatBlockLabels(["when green flag clicked", 'when "x" key pressed']);

    typeIntoScriptEditor(1, 'print("got x"){enter}');

    cy.pytchGreenFlag();

    cy.get("#pytch-speech-bubbles").should("be.focused");

    cy.pytchSendKeysToApp("x");
    cy.pytchStdoutShouldEqual("got x\n");
  });

  it("can add and delete handlers", () => {
    selectSprite("Snake");

    saveButton.shouldReactToInteraction(() => {
      ScriptOps.addSomeHandlers();
    });
    assertHatBlockLabels(ScriptOps.allExtendedHandlerLabels);

    launchDeleteHandlerByIndex(2);
    settleModalDialog("Cancel");
    assertHatBlockLabels(ScriptOps.allExtendedHandlerLabels);
    saveButton.shouldShowNoUnsavedChanges();

    saveButton.shouldReactToInteraction(() => {
      launchDeleteHandlerByIndex(2);
      settleModalDialog("DELETE");
    });
    assertHatBlockLabels(ScriptOps.someExtendedHandlerLabels([0, 1, 3]));

    saveButton.shouldReactToInteraction(() => {
      launchDeleteHandlerByIndex(2);
      settleModalDialog("DELETE");
    });
    assertHatBlockLabels(ScriptOps.someExtendedHandlerLabels([0, 1]));

    saveButton.shouldReactToInteraction(() => {
      launchDeleteHandlerByIndex(0);
      settleModalDialog("DELETE");
    });
    assertHatBlockLabels(ScriptOps.someExtendedHandlerLabels([1]));

    saveButton.shouldReactToInteraction(() => {
      launchDeleteHandlerByIndex(0);
      settleModalDialog("DELETE");
    });
    assertHatBlockLabels([]);
  });

  it("can drag/drop handler from help", () => {
    const dragHatBlockByIdx = (iHatBlock: number) => {
      cy.get(".pytch-method")
        .eq(iHatBlock)
        .find(".scratch-block-wrapper")
        .drag(".Junior-CodeEditor");
    };
    let expHatBlockLabels: Array<string> = [];
    assertHatBlockLabels(expHatBlockLabels.slice());

    cy.get(".HelpSidebarSection.category-events").click();
    cy.contains("pytch.broadcast");

    dragHatBlockByIdx(2);
    expHatBlockLabels.push("when stage clicked");
    assertHatBlockLabels(expHatBlockLabels.slice());
    cy.get(".ace_editor.ace_focus");

    cy.pytchSendKeysToApp("# Hello world");
    soleEventHandlerCodeShouldEqual("# Hello world");

    dragHatBlockByIdx(1);
    expHatBlockLabels.push('when "b" key pressed');
    assertHatBlockLabels(expHatBlockLabels.slice());

    dragHatBlockByIdx(0);
    expHatBlockLabels.push("when green flag clicked");
    assertHatBlockLabels(expHatBlockLabels.slice());
  });

  it("restricts characters for when-receive", () => {
    ScriptOps.launchAddHandler();

    ScriptOps.typeMessageValue("go\\for'it");
    settleModalDialog("OK");

    assertHatBlockLabels([
      "when green flag clicked",
      'when I receive "goforit"',
    ]);
  });

  it("helps user re non-empty message", () => {
    const doubleClickWhenIReceive = () =>
      cy
        .get(".EventKindOption")
        .contains("receive")
        .click("left")
        .dblclick("left");

    ScriptOps.launchAddHandler();
    doubleClickWhenIReceive();

    assertHatBlockLabels([
      "when green flag clicked",
      'when I receive "message-1"',
    ]);

    ScriptOps.launchAddHandler();
    cy.get(".EventKindOption").contains("receive").click("left");
    cy.get('input[type="text"]').click().type("{selectAll}{del}");
    doubleClickWhenIReceive();
    cy.get(".empty-message-hint").should("be.visible");
    cy.get('input[type="text"]').click().type("h");
    cy.get(".empty-message-hint").should("not.be.visible");
    cy.get('input[type="text"]').type("ello-world");
    settleModalDialog("OK");

    assertHatBlockLabels([
      "when green flag clicked",
      'when I receive "message-1"',
      'when I receive "hello-world"',
    ]);
  });
});
