import React, { useMemo } from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Spinner from "react-bootstrap/Spinner";
import { deviceManager, MicroBitDevice, MicroBitStatus } from "../../skulpt-connection/device-manager";
import { useHasImport } from "../hooks/code-text";
import { useStoreActions, useStoreState } from "../../store";
import { AddSomethingSingleButton } from "./AddSomethingButton";
import { IModuleImport } from "../../model/project";


const MICROBIT_IMPORT: IModuleImport = { as: "microbit", module: "pytch.microbit" };

const DeviceAlert: React.FC = () => {
  const activeDevice = useStoreState((state) => state.devices.active);
  const devices = useStoreState((state) => state.devices.devices);
  const hasImport = useHasImport("pytch.microbit");

  const deviceWithError = useMemo(() => {
    return devices.find((d) => d.status === MicroBitStatus.ERRORED);
  }, [devices]);

  const addImport = useStoreActions((actions) => actions.activeProject.addModuleImport);

  if (deviceWithError) {
    return <Alert variant="danger">
      <span>
        A micro:bit device (<code>{deviceWithError.identifier}</code>) appears
        to be having a problem, try disconnecting it from your computer and
        re-connecting it.
      </span>
    </Alert>;
  }

  if (!activeDevice && hasImport) {
    return <Alert variant="warning">
      <span>
        You have imported the <code>pytch.microbit</code> module, but have no
        micro:bit device active. Make sure your device is connected and has been
        set as active below, or click 'Add a device' to connect a new micro:bit.
      </span>
    </Alert>;
  } else if (activeDevice && !hasImport) {
    return <Alert variant="warning">
      <span>
        You have a micro:bit connected, but have not yet imported the
        <code>pytch.microbit</code> module, so you cannot access it from your
        program.
      </span>
      <Button
        variant="outline-primary"
        onClick={() => addImport(MICROBIT_IMPORT)}
      >
        Add import
      </Button>
    </Alert>;
  } else if (!activeDevice) {
    return <Alert variant="secondary">
      There is no micro:bit device active, make sure your device is connected
      and click 'Add a device' to connect a new micro:bit
    </Alert>;
  }
};

type DeviceItemProps = { device: MicroBitDevice };

const DeviceItem: React.FC<DeviceItemProps> = ({ device }) => {
  const activeDevice = useStoreState((state) => state.devices.active);
  const active = device.serialNumber === activeDevice;
  const disabled = active || device.status !== MicroBitStatus.READY;
  const flashing = device.status === MicroBitStatus.FLASHING;

  const setActive = () => deviceManager.setActive(device.serialNumber);
  const disconnect = () => deviceManager.disconnect(device.serialNumber);
  const forget = () => deviceManager.disconnect(device.serialNumber, true);
  const flash = () => device.flash();

  let connecting = false;
  let status: string;
  let statusStyle: string;

  if (active) {
    status = "Active";
    statusStyle = "primary";
  } else {
    switch (device.status) {
      case MicroBitStatus.ERRORED:
        status = "Error";
        statusStyle = "danger";
        break;

      case MicroBitStatus.PENDING:
      case MicroBitStatus.CONNECTED:
        connecting = true;
        status = "Connecting";
        statusStyle = "secondary";
        break;

      case MicroBitStatus.FLASHING:
        connecting = true;
        status = "Flashing";
        statusStyle = "secondary";
        break;

      case MicroBitStatus.READY:
        status = "Connected";
        statusStyle = "success";
        break;
    }
  }

  return <li>
    micro:bit
    <span>(<code>{device.identifier}</code>)</span>
    <Badge bg="secondary">V{device.revision.join(".")}</Badge>
    {
      (connecting) ? (
        <Spinner animation="border" role="status" size="sm">
          <span className="visually-hidden">{ status }</span>
        </Spinner>
      ) : (
        <Badge bg={statusStyle}>{status}</Badge>
      )
    }

    <ButtonGroup aria-label="Device controls">
      <Button variant="outline-primary" disabled={disabled} onClick={setActive}>
        Set Active
      </Button>
      <Button variant="outline-warning" disabled={flashing} onClick={flash}>
        Flash
      </Button>
      <Button variant="outline-danger" disabled={flashing} onClick={disconnect}>
        Disconnect
      </Button>
      <Button variant="outline-danger" disabled={flashing} onClick={forget}>
        Forget
      </Button>
    </ButtonGroup>
  </li>;
};

export const DevicesList = () => {
  const devices = useStoreState((state) => state.devices.devices);
  const pair = () => deviceManager.pairDevice();

  return <>
    <DeviceAlert />
    <ul>
      {
        devices.map((d) => <DeviceItem key={d.serialNumber} device={d} />)
      }
    </ul>
    <AddSomethingSingleButton what="device" label="Add a device" onClick={pair} />
  </>
}
