// Inspired by but heavily modified from
// https://github.com/4teamwork/cypress-drag-drop

const dataTransfer = new DataTransfer();
const dragDropArgs = {
  dataTransfer,
  eventConstructor: "DragEvent",
  force: true,
};

type CyElementWrapper = Cypress.Chainable<JQuery<HTMLElement>>;

const DragSimulator = () => {
  let sourceEltWrapper: CyElementWrapper;
  let targetEltWrapper: CyElementWrapper;

  function init(
    sourceSelector: Cypress.JQueryWithSelector,
    target: string | CyElementWrapper
  ) {
    sourceEltWrapper = cy.wrap(sourceSelector.get(0));
    const targetSelector = typeof target === "string" ? cy.get(target) : target;
    return targetSelector.then((targetWrapper) => {
      targetEltWrapper = cy.wrap(targetWrapper.get(0));
    });
  }

  function dragstart() {
    return sourceEltWrapper.trigger("dragstart", dragDropArgs);
  }

  function dragover() {
    return targetEltWrapper.trigger("dragover", dragDropArgs);
  }

  function drop() {
    return targetEltWrapper
      .trigger("drop", dragDropArgs)
      .then(() => sourceEltWrapper.trigger("dragend", dragDropArgs));
  }

  function drag(
    sourceWrapper: Cypress.JQueryWithSelector,
    target: string | CyElementWrapper
  ) {
    init(sourceWrapper, target).then(dragstart).then(dragover).then(drop);
  }

  return { drag };
};

Cypress.Commands.add(
  "drag",
  { prevSubject: "element" },
  (prevSubject, targetAlias) => DragSimulator().drag(prevSubject, targetAlias)
);
