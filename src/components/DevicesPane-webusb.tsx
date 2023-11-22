import { DAPLink, WebUSB } from "dapjs";
import { useEffect, useState } from "react";

const BAUD_RATE = 115200;
// const CMSIS_HEADER_SIZE = 4;
const DAP_CLASS_CODE = [0xff, 0, 0];
// const DAP_PACKET_SIZE = 64;
const MICROBIT_IDENTIFIER = { vendorId: 0x0d28, productId: 0x0204 };

let didInit = false;

// TODO: Allow people to label devices to help differentiate? (using the firmware)
class MicrobitDevice extends EventTarget {
  public readonly revision: [number, number];
  public readonly serialNumber: string;
  public readonly usbDevice: USBDevice;
  protected daplink:  DAPLink;
  // declare protected dapInterface: USBInterface;
  // declare protected endpointIn: USBEndpoint;
  // declare protected endpointOut: USBEndpoint;
  // protected sending: boolean = false;

  constructor(device: USBDevice) {
    super();
    this.usbDevice = device;

    if (!device.serialNumber ||
        device.productId != MICROBIT_IDENTIFIER.productId ||
        device.vendorId != MICROBIT_IDENTIFIER.vendorId) {
      throw new TypeError("Provided device is not a micro:bit");
    }

    this.serialNumber = device.serialNumber;

    if (this.serialNumber.startsWith("9901")) this.revision = [1, 5];
    else if (this.serialNumber.startsWith("9903") || this.serialNumber.startsWith("9904")) this.revision = [2, 0];
    else if (this.serialNumber.startsWith("9906")) this.revision = [2, 2]; // TODO: Need to validate this, might not be true
    else this.revision = [1, 3];

    const transport = new WebUSB(device);
    this.daplink = new DAPLink(transport);
    this.daplink.on(DAPLink.EVENT_SERIAL_DATA, (data) => {
      console.log("Message received:")
      console.log(data); // TODO: Probably need to buffer data and only act when we get a full command
    });
  }

  public async setup(): Promise<void> {
    console.log("Connecting to the DAPLink interface");
    await this.daplink.connect();
    console.log("Setting baud rate to " + BAUD_RATE);
    await this.daplink.setSerialBaudrate(BAUD_RATE);

    console.log("Starting to poll the serial interface");
    this.daplink.startSerialRead(1, false);
    // console.log("Saying hello");
    // await this.daplink.serialWrite("hello\n\r");

    // let rawResponse = await this.daplink.serialRead();

    // while (!rawResponse) {
    //   console.log("No response to hello, waiting 5000ms");
    //   await new Promise((resolve) => setTimeout(resolve, 5000));
    //   rawResponse = rawResponse = await this.daplink.serialRead();
    // }

    // console.log(rawResponse);

    // if (!rawResponse) throw new Error("Didn't receive a response after 1000ms");
    
    // const response = new Uint8Array(rawResponse).toString();
    // console.log(response);

    // if (!this.usbDevice.opened) await this.usbDevice.open();

    // if (!this.usbDevice.configuration) await this.usbDevice.selectConfiguration(1);
    // const configuration = this.usbDevice.configuration!;
    
    // const dapInterface = configuration.interfaces.find((inter) => {
    //   const alternate = inter.alternate,
    //     [classCode, subclassCode, protocolCode] = DAP_CLASS_CODE;

    //   return alternate.interfaceClass == classCode &&
    //     alternate.interfaceSubclass == subclassCode &&
    //     alternate.interfaceProtocol == protocolCode;
    // });

    // if (!dapInterface) throw new TypeError("Device is missing a DAP interface");
    // this.dapInterface = dapInterface;

    // const endpoints = dapInterface.alternates[0].endpoints,
    //   endpointIn = endpoints.find((endpoint) => endpoint.direction == "in"),
    //   endpointOut = endpoints.find((endpoint) => endpoint.direction == "out");

    // if (!endpointIn) throw new TypeError("Device is missing an incoming endpoint");
    // this.endpointIn = endpointIn;

    // if (!endpointOut) throw new TypeError("Device is missing an outgoing endpoint");
    // this.endpointOut = endpointOut

    // await this.usbDevice.claimInterface(dapInterface.interfaceNumber);
    // await this.connect();
  }

  // protected async connect(): Promise<void> {
    
  // }

  // protected async read(): Promise<DataView> {
  //   if (!this.endpointIn) throw new Error("Device is not initialised");

  //   const result = await this.usbDevice.transferIn(this.endpointIn.endpointNumber, DAP_PACKET_SIZE);
  //   return result.data!;
  // }

  // protected async send(command: number, data?: ArrayBuffer): Promise<DataView> {
  //   while (this.sending) {
  //     // Moves us to the end of the promise queue
  //     await new Promise((resolve) => setTimeout(resolve, 1));
  //   }

  //   this.sending = true;

  //   let packet: Uint8Array;

  //   if (!data) packet = new Uint8Array([command]);
  //   else {
  //     packet = new Uint8Array(data.byteLength + 1);
  //     packet.set([command]);
  //     packet.set(new Uint8Array(data), 1);
  //   }

  //   try {
  //     await this.write(packet);
  //     const response = await this.read();

  //     if (response.getUint8(0) !== command) throw new Error(`Bad response for command ${command} (received ${response.getUint8(0)})`);

  //     // TODO: check OK status for certain commands

  //     return response;
  //   } finally {
  //     this.sending = false;
  //   }
  // }

  // protected async write(data: ArrayBuffer): Promise<void> {
  //   if (!this.endpointOut) throw new Error("Device is not initialised");
  //   if (data.byteLength > DAP_PACKET_SIZE) throw new Error(`Packet is larger than max size (${data.byteLength} vs ${DAP_PACKET_SIZE})`);
    
  //   const packet = new Uint8Array(DAP_PACKET_SIZE);
  //   packet.set(new Uint8Array(data));
  //   await this.usbDevice.transferOut(this.endpointOut.endpointNumber, packet);
  // }
}

interface DeviceItemProps {
  device: MicrobitDevice;
  isActive: boolean;
  onForget: (device: MicrobitDevice) => void;
  onSetActive: (device: MicrobitDevice) => void;
}

const DeviceItem = ({ device, isActive, onForget, onSetActive }: DeviceItemProps) => {
  return <li>
    { `micro:bit (v${device.revision.join(".")})` ?? "Unknown device" }
    { isActive ? " (Active)" : <button onClick={() => onSetActive(device)}>Set Active</button> }
    {/* TODO: Add a program/update button  */}
    {/* TODO: Add some sort of 'Identify' button to help differentiate between identically named devices  */}
    <button onClick={() => onForget(device)}>Forget</button>
  </li>
};

const DevicesPane = () => {
  if (!("usb" in navigator)) {
    return <div>
      Unfortunately, USB devices (like the micro:bit) are not supported in your browser.<br />
      Please use an up-to-date version of a browser like Google Chrome or Microsoft Edge.
    </div>
  }

  const [devices, setDevices] = useState([] as MicrobitDevice[]),
    [activeDevice, setActiveDevice] = useState(null as MicrobitDevice | null);

  async function setupDevice(device: USBDevice): Promise<MicrobitDevice> {
    // Connect to device, check if has Pytch firmware, record firmware version & board revision
    const microbit = new MicrobitDevice(device);
    await microbit.setup();
    return microbit;
  }

  async function attemptPair(): Promise<void> {
    // const port = await navigator.serial.requestPort({ filters: [{ usbProductId: MICROBIT_IDENTIFIER.productId, usbVendorId: MICROBIT_IDENTIFIER.vendorId }] });
    // await port.open({ baudRate: BAUD_RATE });

    // Attempt to pair to the new device
    const device = await navigator.usb.requestDevice({ filters: [MICROBIT_IDENTIFIER] }).catch(() => null);
    if (!device) return;

    // If the device is already setup, we don't need to set it up again, just make it active
    const existingDevice = devices.find((d) => d.usbDevice == device);    
    if (existingDevice) return await makeActive(existingDevice);

    const pytchDevice = await setupDevice(device);
    setDevices([...devices, pytchDevice]);
    await makeActive(pytchDevice);
  }

  async function forgetDevice(device: MicrobitDevice) {
    // Close device, remove from devices, forget
    // TODO: Close DAPLink serial read
    if (activeDevice == device) setActiveDevice(null);
    setDevices(devices.filter((d) => d != device));
    await device.usbDevice.close();
    await device.usbDevice.forget();
  }

  async function makeActive(device: MicrobitDevice): Promise<void> {
    // Set as the active device, connect to bridge?
    setActiveDevice(device);
    // device.usbDevice.transferIn(5, 4).then(console.log)
  }

  async function handleConnect(event: USBConnectionEvent) {
    const pytchDevice = await setupDevice(event.device);
    setDevices([...devices, pytchDevice]);
  }

  function handleDisconnect(event: USBConnectionEvent) {
    setDevices(devices.filter((d) => event.device != d.usbDevice));
    if (activeDevice?.usbDevice == event.device) setActiveDevice(null);
  }

  useEffect(() => {
    /*
    This is needed for now as React runs useEffect hooks twice in development.
    Better solution is to move it out to a non-React module after prototyping.
    */
    if (didInit) return;
    didInit = true;

    navigator.usb.addEventListener("connect", handleConnect);
    navigator.usb.addEventListener("disconnect", handleDisconnect);

    navigator.usb.getDevices()
      .then(async (devices) => {
        const pytchDevices = await Promise.all(devices.map((device) => setupDevice(device)));
        setDevices(pytchDevices);
        if (!activeDevice && pytchDevices.length) await makeActive(pytchDevices[0]);
      });

    return () => {
      navigator.usb.removeEventListener("connect", handleConnect);
      navigator.usb.removeEventListener("disconnect", handleDisconnect);
    };
  }, []);
  
  return <div>
    {
      (!devices.length) ?
        <p>No devices connected</p> :
        <ul>
          {devices.map((device, i) => {
            return <DeviceItem
              key={device.usbDevice.serialNumber ?? i} // TODO: Use a proper key
              device={device}
              isActive={activeDevice == device}
              onForget={forgetDevice}
              onSetActive={makeActive} />
          })}
        </ul>
    }
    <button onClick={attemptPair}>Pair</button>
  </div>
};

export default DevicesPane;
