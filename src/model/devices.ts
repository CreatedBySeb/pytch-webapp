import { action, Action } from "easy-peasy";
import { MicroBitDevice } from "../skulpt-connection/device-manager";

export interface Devices {
  devices: MicroBitDevice[];

  setDevices: Action<Devices, MicroBitDevice[]>;
}

export const devices: Devices = {
  devices: [],
  setDevices: action((state, devices) => {
    state.devices = devices;
  }),
};
