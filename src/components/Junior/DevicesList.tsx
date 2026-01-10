import React, { useMemo } from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import Spinner from "react-bootstrap/Spinner";
import { MICROBIT_IMPORT } from "../../model/devices";
import {
  deviceManager, MicroBitDevice, MicroBitErrorReason, MicroBitStatus
} from "../../skulpt-connection/device-manager";
import { useStoreActions, useStoreState } from "../../store";
import { useMissingDevice, useMissingMicroBitImport } from "../hooks/devices";
import { AddSomethingSingleButton } from "./AddSomethingButton";


const DeviceAlert: React.FC = () => {
  const activeDevice = useStoreState((state) => state.devices.active);
  const devices = useStoreState((state) => state.devices.devices);
  const missingDevice = useMissingDevice();
  const missingImport = useMissingMicroBitImport();

  const deviceWithError = useMemo(() => {
    return devices.find((d) => d.status === MicroBitStatus.ERRORED);
  }, [devices]);

  const onlyUnsupported = useMemo(() => {
    if (activeDevice || !devices.length) return false;
    return devices.every((d) => d.status === MicroBitStatus.UNSUPPORTED);
  }, [activeDevice, devices]);

  const addImport = useStoreActions((actions) => {
    return actions.activeProject.addModuleImport;
  });

  if (deviceWithError) {
    let details: string;

    switch (deviceWithError.errorReason) {
      case MicroBitErrorReason.BUSY:
        details = "is in use by another tab or application, try closing other" +
          " tabs that may be using the micro:bit, or try re-connecting it.";
        break;

      case MicroBitErrorReason.DAP_STATE:
        details = "is stuck, you will need to re-connect it to your computer.";
        break;

      case MicroBitErrorReason.NO_RESPONSE:
        details = "is not responding, try using the 'Flash' button below to " +
          "update the micro:bit's Pytch software.";
        break;

      default:
        details = "appears to be having a problem, try disconnecting it from " +
          "your computer and re-connecting it.";
        break;
    }

    return <Alert variant="danger">
      <span>
        A micro:bit device (<code>{deviceWithError.identifier}</code>) {details}
      </span>
    </Alert>;
  } else if (onlyUnsupported) {
    return <Alert variant="warning">
      The attached micro:bit is not supported by Pytch. Pytch currently only
      works with V2 micro:bit devices.
    </Alert>
  } else if (missingDevice) {
    return <Alert variant="warning">
      You are using micro:bit functionality, but have no micro:bit device
      active. Make sure your device is connected and has been set as active
      below, or click 'Add a device' to connect a new micro:bit.
    </Alert>;
  } else if (missingImport) {
    return <Alert variant="warning">
      <span>
        You have a micro:bit connected, but have not yet imported the
        {" "}<code>pytch.microbit</code> module, so you cannot access it from
        your program.
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
  const unsupported = device.status === MicroBitStatus.UNSUPPORTED;

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
      case MicroBitStatus.UNSUPPORTED:
        status = "Unsupported";
        statusStyle = "secondary";
        break;

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
    {
      (device.updatable) && (
        <Badge bg="warning">Needs Update</Badge>
      )
    }

    <ButtonGroup aria-label="Device controls">
      { !unsupported &&
        <>
          <Button
            className=""
            variant="outline-primary"
            disabled={disabled}
            onClick={setActive}
          >
            Set Active
          </Button>
          <Button
            variant="outline-warning"
            disabled={flashing}
            onClick={flash}
          >
            Flash
          </Button>
          <Button
            variant="outline-danger"
            disabled={flashing}
            onClick={disconnect}
          >
            Disconnect
          </Button>
        </>
      }
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
    <AddSomethingSingleButton
      what="device"
      label="Add a device"
      onClick={pair}
    />
  </>
}
