import { Action, action } from "easy-peasy";

export type HeadingElementDescriptor = {
  kind: "heading";
  heading: string;
};

export type BlockElementDescriptor = {
  kind: "block";
  python: string;
  scratch: string; // TODO: Convert to Scratchblocks SVG
  help: string; // TODO: Convert to DOM element
  helpIsVisible: boolean;
};

export type HelpElementDescriptor =
  | HeadingElementDescriptor
  | BlockElementDescriptor;

export type HelpContentDescriptor = Array<HelpElementDescriptor>;

export interface IHelpSidebar {
  isVisible: boolean;
  toggleVisibility: Action<IHelpSidebar>;
}

export const helpSidebar: IHelpSidebar = {
  isVisible: false,
  toggleVisibility: action((state) => {
    state.isVisible = !state.isVisible;
  }),
};
