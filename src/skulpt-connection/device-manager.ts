import { DAPLink, DAPProtocol, WebUSB } from "dapjs";
import store from "../store";

type IdentifiableUSBDevice = USBDevice & { serialNumber: string };
type USBListener = (this: USB, event: USBConnectionEvent) => unknown;

// The DAPProtocol enum is not importable, so this is a readable alternative
const DAP_PROTOCOL_SWD: DAPProtocol = 1;
const NEW_LINE = "\n";

export class MicroBitDevice {
  public static readonly BAUD_RATE = 115200;

  public static readonly FILTER: USBDeviceFilter = {
    vendorId: 0x0d28,
    productId: 0x0204,
  };

  public static readonly SEPARATOR = "|";
  public static readonly SERIAL_DELAY = 1;

  public get revision(): [number, number] {
    const prefix = this.serialNumber.slice(0, 4);

    switch (prefix) {
      case "9900":
        return [1, 3];
      case "9901":
        return [1, 5];
      case "9903":
      case "9904":
        return [2, 0];
      case "9905":
        return [2, 20];
      case "9906":
        return [2, 21];
      default:
        throw new Error(
          `Unknown micro:bit revision for serial prefix '${prefix}'`
        );
    }
  }

  public get serialNumber(): string {
    return this.device.serialNumber;
  }

  private buffer: string = "";
  private dap: DAPLink;
  private device: IdentifiableUSBDevice;

  constructor(device: IdentifiableUSBDevice) {
    this.device = device;

    const transport = new WebUSB(device);
    this.dap = new DAPLink(transport, DAP_PROTOCOL_SWD);
  }

  /**
   * Attempt to connect to the micro:bit via DAPLink
   */
  public async connect(): Promise<void> {
    try {
      await this.dap.connect();
    } catch (e) {
      console.error("Failed to connect via DAPLink to micro:bit");
      throw e;
    }

    try {
      this.dap.setSerialBaudrate(MicroBitDevice.BAUD_RATE);
    } catch (e) {
      console.error(
        "Failed to set serial baud rate to " + MicroBitDevice.BAUD_RATE
      );
      throw e;
    }

    this.dap.on(DAPLink.EVENT_SERIAL_DATA, (data) => this.handleData(data));
    this.dap.startSerialRead(MicroBitDevice.SERIAL_DELAY);
    console.log("Successfully connected to the micro:bit");
  }

  /**
   * Cleanly disconnect from the micro:bit, which is important to avoid leaving
   * it in a bad state where it cannot be re-connected to via DAPLink
   */
  public async disconnect(): Promise<void> {
    if (!this.dap.connected) return;

    this.dap.stopSerialRead();

    try {
      await this.dap.disconnect();
    } catch (e) {
      console.error("Failed to disconnect from micro:bit");
      throw e;
    }

    console.log("Cleanly disconnected from the micro:bit");
  }

  private handleData(data: string) {
    this.buffer += data;
    let message: string;

    while (this.buffer.includes(NEW_LINE)) {
      [message, this.buffer] = this.buffer.split(NEW_LINE, 2);
      const [event, ...args] = message.split(MicroBitDevice.SEPARATOR);
      console.log(`Received event '${event}' with args: ${args}`);
    }
  }
}

class DeviceManger {
  public readonly supported = ("usb" in navigator);

  private devices: Map<string, MicroBitDevice> = new Map();

  constructor() {
    if (!this.supported) {
      console.log("'usb' not present in navigator, WebUSB is not supported");
      return;
    }

    const connectionListener: USBListener = (event) => {
      this.deviceConnected(event.device);
    };

    const disconnectionListener: USBListener = (event) => {
      this.deviceDisconnected(event.device);
    };

    navigator.usb.addEventListener("connect", connectionListener);
    navigator.usb.addEventListener("disconnect", disconnectionListener);

    window.addEventListener("beforeunload", () => {
      navigator.usb.removeEventListener("connect", connectionListener);
      navigator.usb.removeEventListener("disconnect", disconnectionListener);

      this.devices.forEach((d) => d.disconnect());
    });

    navigator.usb.getDevices()
      .then((devices) => {
        devices.forEach((device) => this.deviceConnected(device));
      });
  }

  /**
   * Attempts to pair a new device using WebUSB
   *
   * Transient user activation is required for USB#requestDevice, so this must
   * be in response to a user interaction.
   * @returns A boolean indicating whether a new device was paired or not
   */
  public async pairDevice(): Promise<boolean> {
    let device: USBDevice;

    try {
      device = await navigator.usb.requestDevice({
        filters: [MicroBitDevice.FILTER],
      });
    } catch (e) {
      if (e instanceof Error && e.name === "NotFoundError") {
        // No device was selected
        return false;
      }

      console.error("Failed to pair micro:bit for unknown reason");
      throw e;
    }

    this.deviceConnected(device);
    return true;
  }

  private deviceConnected(device: USBDevice): void {
    if (!device.serialNumber) {
      console.error(
        "Connected device is missing serial number, and cannot be identified"
      );
      return;
    }

    console.log("Device connected: " + device.serialNumber);
    const microbit = new MicroBitDevice(device as IdentifiableUSBDevice);
    this.devices.set(device.serialNumber, microbit);
    store.getActions().devices.setDevices(Array.from(this.devices.values()));
    microbit.connect();
  }

  private deviceDisconnected(device: USBDevice): void {
    if (device.serialNumber && this.devices.has(device.serialNumber)) {
      console.log("Device disconnected: " + device.serialNumber);
      this.devices.delete(device.serialNumber);
      store.getActions().devices.setDevices(Array.from(this.devices.values()));
    }
  }
}

export const deviceManager = new DeviceManger();
