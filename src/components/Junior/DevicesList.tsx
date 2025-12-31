import React from "react";
import { Alert, Badge, Button, ButtonGroup, Spinner } from "react-bootstrap";
import { deviceManager, MicroBitDevice, MicroBitStatus } from "../../skulpt-connection/device-manager";
import { useHasImport } from "../hooks/code-text";
import { useStoreActions, useStoreState } from "../../store";
import { AddSomethingSingleButton } from "./AddSomethingButton";
import { IModuleImport } from "../../model/project";

type DeviceItemProps = { device: MicroBitDevice };

const MICROBIT_IMPORT: IModuleImport = { as: "microbit", module: "pytch.microbit" };

const DeviceItem: React.FC<DeviceItemProps> = ({ device }) => {
  const activeDevice = useStoreState((state) => state.devices.active);
  const active = device.serialNumber === activeDevice;
  const disabled = active || device.status !== MicroBitStatus.READY;

  const setActive = () => deviceManager.setActive(device.serialNumber);
  const disconnect = () => deviceManager.disconnect(device.serialNumber);
  const forget = () => deviceManager.disconnect(device.serialNumber, true);

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

      case MicroBitStatus.READY:
        status = "Connected";
        statusStyle = "success";
        break;
    }
  }

  return <li>
    micro:bit
    <span>(<code>{device.serialNumber.slice(-8)}</code>)</span>
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
      <Button variant="outline-danger" onClick={disconnect}>
        Disconnect
      </Button>
      <Button variant="outline-danger" onClick={forget}>
        Forget
      </Button>
    </ButtonGroup>
  </li>;
};

export const DevicesList = () => {
  const activeDevice = useStoreState((state) => state.devices.active);
  const devices = useStoreState((state) => state.devices.devices);
  const hasImport = useHasImport("pytch.microbit");

  const addImport = useStoreActions((actions) => actions.activeProject.addModuleImport);
  const pair = () => deviceManager.pairDevice();


  return <>
    { activeDevice && !hasImport && (
      <Alert variant="warning">
        <span>
          You have a micro:bit connected, but have not yet imported
          the <code>pytch.microbit</code> module, so you cannot access it from
          your program
        </span>
        <Button variant="outline-primary" onClick={() => addImport(MICROBIT_IMPORT)}>Add import</Button>
      </Alert>
    ) }
    { hasImport && !activeDevice && (
      <Alert variant="warning">
        <span>
          You have imported the <code>pytch.microbit</code>, but have no micro:bit
          device active. Make sure your device is connected and has been set as
          active below, or click 'Add a device' to connect a new micro:bit
        </span>
      </Alert>
    ) }
    { !hasImport && !activeDevice && (
      <Alert variant="secondary">
        There is no micro:bit device active, make sure your device is connected
        and click 'Add a device' to connect a new micro:bit
      </Alert>
    ) }
    <ul>
      {
        devices.map((d) => <DeviceItem key={d.serialNumber} device={d} />)
      }
    </ul>
    <AddSomethingSingleButton what="device" label="Add a device" onClick={pair} />
  </>
}
