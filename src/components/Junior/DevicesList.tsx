import React from "react";
import { Badge, Button, ButtonGroup, Spinner } from "react-bootstrap";
import { deviceManager, MicroBitDevice, MicroBitStatus } from "../../skulpt-connection/device-manager";
import { useStoreState } from "../../store";
import { AddSomethingSingleButton } from "./AddSomethingButton";

type DeviceItemProps = { device: MicroBitDevice };

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
  const pair = () => deviceManager.pairDevice();
  const devices = useStoreState((state) => state.devices.devices);

  return <>
    <ul>
      {
        devices.map((d) => <DeviceItem key={d.serialNumber} device={d} />)
      }
    </ul>
    <AddSomethingSingleButton what="device" label="Add a device" onClick={pair} />
  </>
}
