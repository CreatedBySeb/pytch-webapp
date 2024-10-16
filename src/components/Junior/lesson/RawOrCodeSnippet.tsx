import React from "react";
import { makeScratchSVG } from "../../../model/scratchblocks-render";
import RawElement from "../../RawElement";
import { highlightedPreEltsFromCode } from "../../../model/highlight-as-ace";

const elementIsCodeOfLanguage = (
  elt: HTMLElement,
  languageTag: string
): boolean => {
  const languageClass = `language-${languageTag}`;
  return (
    elt instanceof HTMLPreElement &&
    elt.firstChild instanceof HTMLElement &&
    elt.firstChild.tagName === "CODE" &&
    elt.firstChild.classList.contains(languageClass)
  );
};

const elementIsScratchCode = (elt: HTMLElement) =>
  elementIsCodeOfLanguage(elt, "scratch");

const elementIsPythonCode = (elt: HTMLElement) =>
  elementIsCodeOfLanguage(elt, "python");

type RawOrCodeSnippetProps = { element: HTMLElement };
export const RawOrCodeSnippet: React.FC<RawOrCodeSnippetProps> = ({
  element,
}) => {
  if (elementIsScratchCode(element)) {
    const sbSvg = makeScratchSVG(element.innerText, 0.8);
    return <RawElement className="display-scratchblocks" element={sbSvg} />;
  } else if (elementIsPythonCode(element)) {
    const codeDiv = document.createElement("div");
    codeDiv.classList.add("python-snippet");
    const codeText = element.innerText.trimEnd();
    const codeElts = highlightedPreEltsFromCode(codeText);
    codeElts.forEach((elt) => codeDiv.appendChild(elt));
    return <RawElement element={codeDiv} />;
  } else {
    return <RawElement element={element} />;
  }
};
