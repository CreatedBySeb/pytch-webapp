import { DAPLink, DAPProtocol, WebUSB } from "dapjs";
import { envVarOrFail } from "../env-utils";
import store from "../store";
import { parseVersion, sleep } from "../utils";

type CommandErrorHandler = (error: MicroBitError) => unknown;
type CommandSuccessHandler = (result: string[]) => unknown;
type IdentifiableUSBDevice = USBDevice & { serialNumber: string };
type InflightCommand = [CommandSuccessHandler, CommandErrorHandler];
type QueuedCommand = [string, CommandSuccessHandler, CommandErrorHandler];
type USBListener = (this: USB, event: USBConnectionEvent) => unknown;

// The DAPProtocol enum is not importable, so this is a readable alternative
const DAP_PROTOCOL_SWD: DAPProtocol = 1;
const DIGITAL_PIN_LEVELS = [0, 1];
const HANDSHAKE_ATTEMPTS = 5;
const HANDSHAKE_DELAY = 2000;
const NEW_LINE = "\n";
const SERIAL_WARM_DELAY = 1500;
const SOUND_LEVELS = ["loud", "quiet"];

/** Information reported by a device in response to the 'hello' command */
interface DeviceInfo {
  /** The name of the device, unique for a type of device, e.g. 'microbit' */
  name: string;
  /** The reported version of the hardware */
  hardwareVersion: number[];
  /** The reported version of the 'bridge' software/firmware */
  softwareVersion: number[];
}

function parseDeviceInfo(response: string[]): DeviceInfo {
  if (response.length < 3) {
    throw new TypeError(
      `Response has incorrect number of fields (has: ${response.length}, expected: 3)`
    );
  }

  const [name, rawHwVer, rawSwVer] = response;
  let hardwareVersion: number[];
  let softwareVersion: number[];

  try {
    hardwareVersion = parseVersion(rawHwVer);
  } catch (e) {
    if (e instanceof TypeError) {
      throw new TypeError(
        `Response has invalid hardware version '${rawHwVer}'`
      );
    } else throw e;
  }

  try {
    softwareVersion = parseVersion(rawSwVer);
  } catch (e) {
    if (e instanceof TypeError) {
      throw new TypeError(
        `Response has invalid hardware version '${rawSwVer}'`
      );
    } else throw e;
  }

  return { name, hardwareVersion, softwareVersion };
}

export enum MicroBitStatus {
  /** The micro:bit is in an error state and cannot be used currently */
  ERRORED = -1,
  /** The micro:bit is available but has not been connected to yet */
  PENDING,
  /** The micro:bit has been connected over DAPLink, but isn't ready for use */
  CONNECTED,
  /** The micro:bit is connected and succeeded handshake, so is ready for use */
  READY,
  /** The micro:bit is currently being flashed over DAPLink and shouldn't be used */
  FLASHING,
}

export class MicroBitError extends Error {
  public readonly name = "MicroBitError";
  public readonly reason: string | undefined;
  public readonly type: string;

  constructor(type: string, reason?: string | undefined) {
    super(`${type}: ${reason ?? "(no reason available)"}`);
    this.type = type;
    this.reason = reason;
  }
}

export class MicroBitDevice {
  public static readonly BAUD_RATE = 115200;

  public static readonly FILTER: USBDeviceFilter = {
    vendorId: 0x0d28,
    productId: 0x0204,
  };

  public static readonly SEPARATOR = "|";
  public static readonly SERIAL_DELAY = 1;

  /**
   * A short string to identify the micro:bit, derived from the last 8
   * characters of the serial number
   */
  public get identifier(): string {
    return this.device.serialNumber.slice(-8);
  }

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

  public get status(): MicroBitStatus {
    return this._status;
  }

  private set status(value: MicroBitStatus) {
    this._status = value;
    // Whenever we change status we refresh the devices list to cause a
    // re-render of UI components
    const { devices } = store.getState().devices;
    store.getActions().devices.setDevices([...devices]);
  }

  private _status: MicroBitStatus = MicroBitStatus.PENDING;
  private buffer: string = "";
  private dap: DAPLink;
  private device: IdentifiableUSBDevice;
  private events: string[] = [];
  private flushing: boolean = false;
  private inflight: InflightCommand[] = [];
  private info: DeviceInfo | undefined;
  private queue: QueuedCommand[] = [];
  private serialHandler: (data: string) => void;

  constructor(device: IdentifiableUSBDevice) {
    this.device = device;
    this.serialHandler = (data: string) => this.handleData(data);

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
      this.status = MicroBitStatus.ERRORED;
      console.error("Failed to connect via DAPLink to micro:bit");
      throw e;
    }

    try {
      this.dap.setSerialBaudrate(MicroBitDevice.BAUD_RATE);
    } catch (e) {
      this.status = MicroBitStatus.ERRORED;
      console.error(
        "Failed to set serial baud rate to " + MicroBitDevice.BAUD_RATE
      );
      throw e;
    }

    // Ensure listener is removed first to avoid any duplicates
    this.dap.removeListener(DAPLink.EVENT_SERIAL_DATA, this.serialHandler);
    this.dap.on(DAPLink.EVENT_SERIAL_DATA, this.serialHandler);
    this.dap.startSerialRead(MicroBitDevice.SERIAL_DELAY);
    this.status = MicroBitStatus.CONNECTED;
    console.log("Successfully connected to the micro:bit");

    // Adding a 1.5s wait helps avoid serial I/O problems after connection
    await sleep(SERIAL_WARM_DELAY);

    for (let i = 1; i <= HANDSHAKE_ATTEMPTS; i++) {
      // While the connection may be unstable it is necessary to clear queues
      // for each attempt
      await this.reset();

      this.send("hello")
        .then((result) => {
          try {
            this.info = parseDeviceInfo(result);
          } catch (e) {
            console.error(`Handshake returned invalid response (attempt ${i})`);
            throw e;
          }

          this.status = MicroBitStatus.READY;
          console.log(`Handshake succeeded (attempt ${i})`);
        });

      // FIXME: there's a delay between the device passing and the promise
      //   resolving due to this delay mechanism, so we may need something else
      await sleep(HANDSHAKE_DELAY);

      // @ts-expect-error -- TypeScript cannot tell that the status can be
      //   affected externally by the Promise above
      if (this.status === MicroBitStatus.READY) break;

      console.log(
        `Handshake did not succeed within ${HANDSHAKE_DELAY}ms (attempt ${i})`
      );
    }

    // @ts-expect-error -- TypeScript cannot tell that the status can be
    //   affected externally by the Promise above
    if (this.status !== MicroBitStatus.READY) {
      console.error("Failed to handshake with the micro:bit within 5 attempts");
      this.status = MicroBitStatus.ERRORED;
    }
  }

  /**
   * Cleanly disconnect from the micro:bit, which is important to avoid leaving
   * it in a bad state where it cannot be re-connected to via DAPLink. Should
   * only be called by the DeviceManager class.
   */
  public async disconnect(forget?: boolean): Promise<void> {
    if (!this.dap.connected) return;

    this.dap.stopSerialRead();

    try {
      await this.dap.disconnect();
    } catch (e) {
      console.error("Failed to disconnect from micro:bit DAP");
      throw e;
    }

    try {
      await this.device.close();
    } catch (e) {
      console.error("Failed to disconnect from micro:bit USB")
      throw e;
    }

    if (forget) {
      try {
        await this.device.forget();
      } catch (e) {
        console.error("Failed to forget the micro:bit")
        throw e;
      }
    }

    console.log("Cleanly disconnected from the micro:bit");
  }

  /**
   * Flash the micro:bit with the latest firmware
   */
  public async flash(): Promise<void> {
    console.log("Starting to flash micro:bit " + this.serialNumber);

    if (this.revision[0] !== 2) {
      throw Error("Only V2 micro:bits can be flashed directly");
    }

    const hexURL = envVarOrFail("VITE_MICROBIT_BASE")
      + "/pytch-microbit-v2.hex";

    const response = await fetch(hexURL);

    if (!response.ok) {
      throw Error("Failed to retrieve HEX file to flash micro:bit");
    }

    const buffer = await response.arrayBuffer();

    this.status = MicroBitStatus.FLASHING;
    const wasActive = deviceManager.getActive() === this;

    // If this is the active device, we need to deactivate it first
    if (wasActive) {
      deviceManager.setActive(null);
    }

    try {
      await this.dap.flash(buffer);
    } catch (e) {
      this.status = MicroBitStatus.ERRORED;
      console.error("Failed to flash the micro:bit");
      throw e;
    }

    console.log("Successfully flashed micro:bit " + this.serialNumber);

    this.connect()
      .then(() => {
        // If this was the active device and nothing is currently active, try to
        // reactivate if we succeeded re-connecting
        if (wasActive && !deviceManager.getActive()) {
          deviceManager.setActive(this.serialNumber);
        }
      });
  }

  /**
   * Retrieves the received events for processing, resetting the event queue
   */
  public getEvents(): string[] {
    const events = this.events;
    this.events = [];
    return events;
  }

  /**
   * Reset the state of the micro:bit, important for each fresh run of a project
   */
  public async reset(): Promise<void> {
    // No point trying to send reset unless we are successfully connected
    if (this.status === MicroBitStatus.READY) {
      await this.send("reset");
    }

    this.inflight = [];
    this.queue = [];
    this.events = [];
    this.buffer = "";
  }

  /**
   * Queues a command to be sent to the micro:bit
   * @param command The command to send to the micro:bit
   * @param args An array of stringified args for the command
   * @returns The stringified return values of the command
   * @throws {MicroBitError} If the command failed, with the type and reason
   */
  public send(command: string, args: string[] = []): Promise<string[]> {
    const payload = [command, ...args].join(MicroBitDevice.SEPARATOR)
      + NEW_LINE;

    const promise = new Promise(
      (resolve: CommandSuccessHandler, reject: CommandErrorHandler) => {
        const length = this.queue.push([payload, resolve, reject]);
        console.log(
          `Queued '${payload.trim()}', queue length is now ${length}`
        );
      }
    );

    // Only allow hello commands to trigger a flush if the device isn't marked
    // as ready. It is theoretically possible for another command to sneak in,
    // but other guardrails limit this and it shouldn't have a big impact.
    if (this.status === MicroBitStatus.READY || command === "hello") {
      this.flushQueue();
    }

    return promise;
  }

  /**
   * Handles a new data chunk received from the micro:bit via serial, which make
   * up events and command results
   *
   * @param data A string read from the serial interface, may be incomplete
   */
  private handleData(data: string) {
    this.buffer += data;
    let message: string;

    while (this.buffer.includes(NEW_LINE)) {
      [message, this.buffer] = this.buffer.split(NEW_LINE, 2);
      const [event, ...args] = message.split(MicroBitDevice.SEPARATOR);
      console.log(`Received event '${event}' with args: ${args}`);

      let handled: boolean = false;

      switch (event) {
        case "err":
        case "ok": {
          const handlers = this.inflight.shift();

          if (!handlers) {
            console.error(
              `Received '${event}' without inflight command: ${message}`
            );
            handled = true; // Custom failure handling for these events
            break;
          }

          const [resolve, reject] = handlers;

          if (event === "ok") resolve(args);
          else {
            const error = new MicroBitError(args[0], args[1]);
            reject(error);
          }

          handled = true;
          break;
        }

        case "button": {
          if (args[0]) {
            this.events.push([event, args[0]].join(":"));
            handled = true;
          }

          break;
        }

        case "gesture": {
          if (args[0]) {
            this.events.push([event, args[0]].join(":"));
            handled = true;
          }

          break;
        }

        case "pin": {
          if (DIGITAL_PIN_LEVELS.includes(Number(args[1]))) {
            const level = (args[1] === "1") ? "high" : "low";
            this.events.push(`pin_${args[0]}:${level}`);
            handled = true;
          }

          break;
        }

        case "sound": {
          if (SOUND_LEVELS.includes(args[0])) {
            this.events.push([event, args[0]].join(":"));
            handled = true;
          }

          break;
        }
      }

      if (!handled) {
        console.warn(`Received malformed event '${event}': ${args}`);
      }
    }
  }

  /**
   * Flushes queued commands to the serial interface if a flush isn't already in
   * progress, and adds the handlers to the inflight array
   */
  private async flushQueue(): Promise<void> {
    if (this.flushing) return;
    this.flushing = true;
    console.log("Started flushing command queue");

    try {
      let command: QueuedCommand | undefined

      while ((command = this.queue.shift()) !== undefined) {
        const [payload, ...handlers] = command;
        this.inflight.push(handlers); // Q: Should it be the other way around?
        await this.dap.serialWrite(payload);
        console.log(`Flushed '${payload.trim()}' to serial port`);
      }
    } catch (e) {
      console.error("Encountered an error while flushing queue");
      throw e;
    } finally {
      this.flushing = false;
    }
  }
}

class DeviceManger {
  public readonly supported = ("usb" in navigator);

  private activeDevice: string | null = null;
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
   * Cleanly disconnect a device, designed for a user-initiated request so the
   * device can be used with another program without closing Pytch.
   * @param serial The serial number of the device to disconnect
   * @param forget Forgets the access grant so the device will not auto-connect
   *  in the future
   */
  public async disconnect(serial: string, forget?: boolean): Promise<void> {
    const device = this.devices.get(serial);

    if (!device) {
      throw new Error(`Cannot disconnect unknown device '${serial}'`);
    }

    await device.disconnect(forget);
    this.deviceDisconnected(device);
  }


  /**
   * Gets the nominated active device, which is used in running projects
   * @returns The currently active device, or null if there isn't one
   */
  public getActive(): MicroBitDevice | null {
    if (this.activeDevice === null) return this.activeDevice;

    const device = this.devices.get(this.activeDevice);

    if (!device) {
      throw new Error(`Active device '${this.activeDevice}' does not exist`);
    }

    return device;
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

  /**
   * Sets a connected device as the active one for projects
   * @param serial The serial number of the desired device, or null to unset
   */
  public setActive(serial: string | null): void {
    if (serial !== null && !this.devices.has(serial)) {
      throw new Error(`Cannot make unknown device '${serial}' active`);
    }

    this.activeDevice = serial;
    store.getActions().devices.setActive(serial);
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

    microbit.connect()
      .then(() => {
        if (microbit.status === MicroBitStatus.READY
          && this.activeDevice === null) {
          this.setActive(device.serialNumber);
          console.log("No active device selected, making device active");
        }
      });
  }

  private deviceDisconnected(device: USBDevice | MicroBitDevice): void {
    if (device.serialNumber && this.devices.has(device.serialNumber)) {
      console.log("Device disconnected: " + device.serialNumber);

      if (this.activeDevice === device.serialNumber) {
        this.setActive(null);
        console.log("Active device disconnected, setting active to null");
      }

      this.devices.delete(device.serialNumber);
      store.getActions().devices.setDevices(Array.from(this.devices.values()));
    }
  }
}

export const deviceManager = new DeviceManger();
