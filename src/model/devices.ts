import { action, Action } from "easy-peasy";
import { MicroBitDevice } from "../skulpt-connection/device-manager";
import { NotableChangeDescription } from "./notable-changes";

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

////////////////////////////////////////////////////////////////////////

export type DeviceActivated = {
  kind: "device-activated";
  deviceType: string | null;
};

export function deviceActivatedDescription(
  change: DeviceActivated,
): NotableChangeDescription {
  if (change.deviceType) {
    return {
      header: change.deviceType + " connected",
      body: "A " + change.deviceType + " is now active",
    };
  } else {
    return {
      header: "Device disconnected",
      body: "A device is no longer active",
    };
  }
}

export type DeviceFlashFinished = {
  kind: "device-flash-finished";
  deviceType: string;
  error?: string;
};

export function deviceFlashFinishedDescription(
  change: DeviceFlashFinished,
): NotableChangeDescription {
  if (change.error) {
    return {
      header: "Failed to flash " + change.deviceType,
      body: change.error,
    };
  } else {
    return {
      header: "Flashed " + change.deviceType,
      body: change.deviceType + " was updated successfully",
    };
  }
}

export type DeviceFlashStarted = {
  kind: "device-flash-started";
  deviceType: string;
};

export function deviceFlashStartedDescription(
  change: DeviceFlashStarted,
): NotableChangeDescription {
  return {
    header: "Flashing " + change.deviceType,
    body: "Started updating " + change.deviceType,
  };
}
