import { Thunk, thunk } from "easy-peasy";
import { IModalUserInteraction, modalUserInteraction } from ".";
import { PytchAppModelActions } from "..";

// It's a bit sledgehammer/nut to use this machinery for the simple
// "display screenshot" modal, since there is no action to attempt, but
// doing so keeps the approach consistent.

type IDisplayScreenshotBase = IModalUserInteraction<void>;

interface IDisplayScreenshotSpecific {
  launch: Thunk<IDisplayScreenshotBase & IDisplayScreenshotSpecific>;
}

const doNothing = async (
  _actions: PytchAppModelActions,
  _descriptor: void
) => {};

const displayScreenshotSpecific: IDisplayScreenshotSpecific = {
  launch: thunk((actions) => actions.superLaunch()),
};

export type IDisplayScreenshotInteraction = IDisplayScreenshotBase &
  IDisplayScreenshotSpecific;

export const displayScreenshotInteraction = modalUserInteraction(
  doNothing,
  displayScreenshotSpecific
);
