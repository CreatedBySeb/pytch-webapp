import { DAPLink, WebUSB } from "dapjs";
import store from "../store";

class DeviceManagerEvent extends Event {
  declare target: DeviceManager;
}

class MicroBitEvent extends Event {
  declare target: MicroBitDevice;
}

export class MicroBitError extends Error {
  public name = "MicroBitError";
  public type: string;

  constructor(type: string, message: string) {
    super(message);
    this.type = type;
  }
}

export enum MicroBitStatus {
  Initialising,
  Ready,
  Failed,
  AlreadyInUse,
  BadState,
}

function oneOf<T>(value: T | undefined, options: T[]): boolean {
  return options.some((option) => option == value);
}

interface BoardInfo {
  firmwareVersion: [number, number];
  hardwareVersion: [number, number, number];
}

// TODO: Allow people to label devices to help differentiate? (using the firmware)
export class MicroBitDevice extends EventTarget {
  public static readonly BAUD_RATE = 115200;
  public static readonly USB_IDENTIFIER = { vendorId: 0x0d28, productId: 0x0204 };

  public get firmwareVersion() {
    return this.boardInfo?.firmwareVersion;
  }

  public get hardwareVersion() {
    return this.boardInfo?.hardwareVersion;
  }

  public get serialNumber() {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- micro:bits should always have a serial number
    return this.device.serialNumber!;
  }

  public status: MicroBitStatus = MicroBitStatus.Initialising;

  protected boardInfo: BoardInfo | undefined;
  protected buffer = "";
  protected readonly daplink: DAPLink;
  protected readonly device: USBDevice;
  protected inflight: ((response: string[] | MicroBitError) => void)[] = [];
  protected initialising: (() => void) | undefined;
  protected pendingMessages: string[] = [];
  protected undrainedEvents: string[] = [];

  constructor(device: USBDevice) {
    super();
    this.device = device;

    const transport = new WebUSB(device);
    this.daplink = new DAPLink(transport, 1);
  }

  public async disconnect(): Promise<void> {
    console.log(`MicroBit: Disconnecting micro:bit (${this.serialNumber})`);

    if (this.daplink.connected) {
      this.daplink.stopSerialRead();
      await this.daplink.disconnect();
    }
  }

  public drainNewEvents(): string[] {
    const events = this.undrainedEvents;
    this.undrainedEvents = [];
    return events;
  }

  public async forget(): Promise<void> {
    await this.device.forget();
  }

  public getNextMessage(): string | undefined {
    return this.pendingMessages.shift();
  }

  public async identify(): Promise<void> {
    await this.send("identify");
  }

  public async reset(): Promise<void> {
    await this.stop();
    this.undrainedEvents = [];
    this.pendingMessages = [];
    await this.send("show_image", ["00000:00000:00000:00000:00000"]);
  }

  public async send(command: string, args: string[] = []): Promise<string[] | MicroBitError> {
    await this.daplink.serialWrite([command, ...args].join("|") + "\n");

    return await new Promise((resolve) => {
      this.inflight.push(resolve);
    });
  }

  public async setup(): Promise<void> {
    try {
      await this.daplink.connect();
    } catch (error) {
      console.error(`MicroBit[${this.serialNumber}]: Failed to connect to device.`)
      console.error(error);

      if (error instanceof DOMException && error.message.includes("Unable to claim interface")) {
        this.setStatus(MicroBitStatus.AlreadyInUse);
      } else if (error instanceof Error && error.message.includes("Bad response for")) {
        this.setStatus(MicroBitStatus.BadState);
      } else {
        this.setStatus(MicroBitStatus.Failed);
      }

      return;
    }

    const currentBaudRate = await this.daplink.getSerialBaudrate();
    if (currentBaudRate != MicroBitDevice.BAUD_RATE) await this.daplink.setSerialBaudrate(MicroBitDevice.BAUD_RATE);

    this.daplink.on(DAPLink.EVENT_SERIAL_DATA, (data) => this.handleData(data));
    this.daplink.startSerialRead(1);

    /*
     * This 1s timeout seems to be necessary to make Serial behave consistently
     * Potentially something to do with writing to the Serial connection before it is fully setup
     */
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    console.log(`MicroBit[${this.serialNumber}]: Finished setup, sending hello`);

    let helloInterval: number | undefined;

    new Promise<void>((resolve) => {
      this.initialising = resolve;
      this.daplink.serialWrite("hello\n");
      let attempts = 1;
      helloInterval = window.setInterval(() => {
        if (attempts > 4) {
          console.error(`MicroBit[${this.serialNumber}]: Failed to initialise after 5 attempts`);
          window.clearInterval(helloInterval);
          return;
        }

        attempts++;
        this.daplink.serialWrite("hello\n");
        console.log(`MicroBit[${this.serialNumber}]: Re-attempting hello (attempt #${attempts})`);
      }, 2000);
    }).then(() => {
      window.clearInterval(helloInterval);
      this.initialising = undefined;
      this.dispatchEvent(new MicroBitEvent("ready"));
      this.setStatus(MicroBitStatus.Ready);
    }).catch((error) => {
      console.error(`MicroBit[${this.serialNumber}]: An error occurred during the setup process`);
      console.error(error);
      this.setStatus(MicroBitStatus.Failed);
    });
  }

  public async stop(): Promise<void> {
    await this.send("stop_music");
  }

  protected handleData(value: string) {
    this.buffer += value;
    let breakIndex = this.buffer.indexOf("\n");

    while (breakIndex != -1) {
      const message = this.buffer.slice(0, breakIndex);
      this.buffer = this.buffer.slice(breakIndex + 1);

      const [event, ...args] = message.split("|");
      console.log(`MicroBit[${this.serialNumber}]: Received event '${event}' (${args})`);

      switch (event) {
        case "err":
        case "ok": {
          const inflight = this.inflight.shift();
          if (!inflight) return console.error(`MicroBit[${this.serialNumber}]: Received '${event}' but there is no in-flight command`);
          inflight((event === "err") ? new MicroBitError(args[0], args[1]) : args);
          break;
        }

        case "button": {
          if (oneOf(args[0], ["a", "b", "logo"])) this.undrainedEvents.push("button:" + args[0]);
          else console.warn(`MicroBit[${this.serialNumber}]: Received malformed button event ('${args[0]}')`);
          break;
        }

        case "gesture": {
          if (oneOf(args[0], ["down", "face down", "face up", "left", "right", "shake", "up"])) this.undrainedEvents.push("gesture:" + args[0]);
          else console.warn(`MicroBit[${this.serialNumber}]: Received malformed gesture event ('${args[0]}')`);
          break;
        }

        case "pin": {
          const pinLevel = (args[1] == "1") ? "high" : "low" as const;
          if (oneOf(args[0], ["0", "1", "2"])) this.undrainedEvents.push(`pin_${pinLevel}:${args[0]}`);
          else console.warn(`MicroBit[${this.serialNumber}]: Received malformed pin event (pin: ${args[0]}, level: ${args[1]})`);
          break;
        }

        case "message": {
          this.pendingMessages.push(args[0]);
          this.undrainedEvents.push("message");
          break;
        }

        case "mic": {
          if (oneOf(args[0], ["quiet", "loud"])) this.undrainedEvents.push(`mic:${args[0]}`);
          else console.warn(`MicroBit[${this.serialNumber}]: Received malformed mic event (level: ${args[0]})`);
          break;
        }

        case "hello": {
          if (args[0] != "microbit") throw new TypeError("Device identified as something other than a micro:bit");

          const [hardwareVersion, firmwareVersion] = [args[1], args[2]].map((versionString) => {
            return versionString.split(" ")[1].split(".").map((part) => Number(part));
          }) as [[number, number, number], [number, number]];

          this.boardInfo = { hardwareVersion, firmwareVersion };
          if (this.initialising) this.initialising();
          this.dispatchEvent(new MicroBitEvent("statusChanged"));
          break;
        }

        default: {
          console.warn(`MicroBit[${this.serialNumber}]: Received unknown event '${event}'`);
        }
      }

      breakIndex = this.buffer.indexOf("\n");
    }
  }

  protected setStatus(status: MicroBitStatus) {
    this.status = status;
    this.dispatchEvent(new MicroBitEvent("statusChanged"));
  }
}

export class DeviceManager extends EventTarget {
  public devices: MicroBitDevice[] = [];
  public readonly supported = ("usb" in navigator);

  public get activeDevice(): MicroBitDevice | null {
    return this._activeDevice;
  }
  protected _activeDevice: MicroBitDevice | null = null;
  protected connectListener = (event: USBConnectionEvent) => this.registerDevice(event.device);
  protected disconnectListener = (event: USBConnectionEvent) => this.disconnectDevice(event.device);

  constructor() {
    super();
    if (!this.supported) return;

    navigator.usb.addEventListener("connect", this.connectListener);
    navigator.usb.addEventListener("disconnect", this.disconnectListener);

    window.addEventListener("beforeunload", () => {
      navigator.usb.removeEventListener("connect", this.connectListener);
      navigator.usb.removeEventListener("disconnect", this.disconnectListener);
      this.devices.forEach((device) => this.disconnectDevice(device));
    });

    navigator.usb.getDevices()
      .then((devices) => {
        return Promise.all(devices.map((device) => this.registerDevice(device)));
      });
  }

  public async attemptPair(): Promise<MicroBitDevice | null> {
    let device: USBDevice | undefined;

    try {
      device = await navigator.usb.requestDevice({ filters: [MicroBitDevice.USB_IDENTIFIER] });
      return await this.registerDevice(device);
    } catch (error) {
      if (device && device.opened) await device.close();
      throw error;
    }
  }

  public async disconnectDevice(device: MicroBitDevice | USBDevice): Promise<void> {
    let microbit: MicroBitDevice | undefined;

    if (device instanceof MicroBitDevice) microbit = device;
    else microbit = this.devices.find((d) => d.serialNumber == device.serialNumber);

    if (!microbit) return;

    this.devices = this.devices.filter((d) => d != microbit);
    store.getActions().devices.setDevices([...this.devices]);

    if (this.activeDevice == microbit) {
      this._activeDevice = (this.devices.length) ? this.devices[0] : null;
      store.getActions().devices.setActiveDevice(null);
    }

    await microbit.disconnect();
  }

  public async forgetDevice(device: MicroBitDevice): Promise<void> {
    await this.disconnectDevice(device);
    await device.forget();
  }

  public makeActive(device: MicroBitDevice): void {
    if (!this.devices.includes(device)) throw new Error("Attempted to make unregistered device active");
    this._activeDevice = device;
    store.getActions().devices.setActiveDevice(device);
    console.log(`DeviceManager: Made micro:bit (${device.serialNumber}) active`);
  }

  protected async registerDevice(device: USBDevice): Promise<MicroBitDevice> {
    const existing = this.devices.find((d) => d.serialNumber == device.serialNumber);
    if (existing) return existing;

    const microbit = new MicroBitDevice(device);
    microbit.addEventListener("ready", () => (!this._activeDevice) && this.makeActive(microbit));
    microbit.addEventListener("statusChanged", () => store.getActions().devices.setDevices([...this.devices]));
    this.devices.push(microbit);
    store.getActions().devices.setDevices([...this.devices]);
    await microbit.setup();
    console.log(`DeviceManager: Registered new micro:bit (${microbit.serialNumber})`);

    return microbit;
  }
}

export const deviceManager = new DeviceManager();
