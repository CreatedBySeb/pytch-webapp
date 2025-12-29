import { action, Action } from "easy-peasy";
import { MicroBitDevice } from "../skulpt-connection/device-manager";

export interface Devices {
  active: string | null;
  devices: MicroBitDevice[];

  setActive: Action<Devices, string | null>;
  setDevices: Action<Devices, MicroBitDevice[]>;
}

export const devices: Devices = {
  active: null,
  devices: [],
  setActive: action((state, serial) => {
    state.active = serial;
  }),
  setDevices: action((state, devices) => {
    state.devices = devices;
  }),
};
