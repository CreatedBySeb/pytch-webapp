import { Action, action } from "easy-peasy";
import { MicroBitDevice } from "../skulpt-connection/device-manager";

export interface IDevices {
  activeDevice: MicroBitDevice | null;
  devices: MicroBitDevice[];

  setActiveDevice: Action<IDevices, MicroBitDevice | null>;
  setDevices: Action<IDevices, MicroBitDevice[]>;
}

export const devices: IDevices = {
  activeDevice: null,
  devices: [],

  setActiveDevice: action((state, device) => {
    state.activeDevice = device;
  }),

  setDevices: action((state, devices) => {
    state.devices = devices;
  }),
};
