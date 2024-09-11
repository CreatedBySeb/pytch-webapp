// Is there a cleaner way of getting at these types?
import { IAceEditorProps } from "react-ace";
type AceEditorT = Parameters<Required<IAceEditorProps>["onLoad"]>[0];
type AceRange = ReturnType<AceEditorT["getSelectionRange"]>;
type AceToken = ReturnType<AceEditorT["session"]["getTokens"]>[number];

const styleStringFromClass = (() => {
  // The following was manually extracted from the rendered CSS of our
  // Pytch theme.  If it becomes cumbersome to keep these in sync, we
  // can try harder to find a better system.
  const defFromClass = new Map<string, string>([
    ["comment", "#00835f/italic"],
    ["constant.language", "#306998/"],
    ["constant.numeric", "#306998/"],
    ["entity.name.function", "#bb5300/bold"],
    ["function.support", "#bb5300/"],
    ["identifier", "/"],
    ["keyword", "black/bold"],
    ["keyword.operator", "black/bold"],
    ["paren.lparen", "black/bold"],
    ["paren.rparen", "black/bold"],
    ["punctuation", "black/bold"],
    ["string", "#b94887/"],
    ["support.function", "#bb5300/"],
    ["text", "/"],
    ["variable.language", "#306998/"],
  ]);

  let styleFromClass = new Map<string, string>();
  for (const [cls, def] of defFromClass.entries()) {
    const [colourStyle, fontStyle] = def.split("/");

    let styleString = "";
    if (colourStyle !== "") styleString += `color:${colourStyle};`;
    if (fontStyle === "bold") styleString += `font-weight:bold;`;
    if (fontStyle === "italic") styleString += `font-style:italic;`;

    styleFromClass.set(cls, styleString);
  }

  return styleFromClass;
})();

export function lineAsElement(tokens: Array<AceToken>) {
  let codeElt = document.createElement("code");
  for (const token of tokens) {
    let spanElt = document.createElement("span");
    spanElt.innerText = token.value;

    const maybeStyleString = styleStringFromClass.get(token.type);
    if (maybeStyleString != null)
      spanElt.setAttribute("style", maybeStyleString);

    codeElt.appendChild(spanElt);
  }

  return codeElt;
}

export function lineAsPreElement(tokens: Array<AceToken>) {
  let preElt = document.createElement("pre");
  const codeElt = lineAsElement(tokens);
  preElt.appendChild(codeElt);
  return preElt;
}

export const lineIntersectsSelection = (
  queryRow: number,
  selection: Array<AceRange>
) =>
  selection.some(
    (range) => queryRow >= range.start.row && queryRow <= range.end.row
  );

const acePythonMode = (() => {
  let mode: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  return () => {
    if (mode == null) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      mode = (window as any).ace.require("ace/mode/python").Mode;
    }
    return mode;
  };
})();

const newPythonTokenizer = () => {
  const PythonMode = acePythonMode();
  const pythonMode = new PythonMode();
  return pythonMode.getTokenizer();
};

export function highlightedPreEltsFromCode(
  codeText: string
): Array<HTMLPreElement> {
  if (codeText === "") {
    return [];
  }

  const lines = codeText.split("\n");
  let preElements: Array<HTMLPreElement> = [];

  const tokenizer = newPythonTokenizer();
  let state: any = null; // eslint-disable-line @typescript-eslint/no-explicit-any
  for (const line of lines) {
    const { tokens, newState } = tokenizer.getLineTokens(line, state);
    preElements.push(lineAsPreElement(tokens));
    state = newState;
  }

  return preElements;
}
