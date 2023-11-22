import { useMemo } from "react";
import Alert from "react-bootstrap/Alert";
import Badge from "react-bootstrap/Badge";
import Button from "react-bootstrap/Button";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import ListGroup from "react-bootstrap/ListGroup";
import Spinner from "react-bootstrap/Spinner";
import Stack from "react-bootstrap/Stack";
import { deviceManager, MicroBitDevice } from "../skulpt-connection/device-manager";
import { useStoreActions, useStoreState } from "../store";

interface DeviceItemProps {
  device: MicroBitDevice;
  isActive: boolean;
  onDisconnect: (device: MicroBitDevice) => void;
  onForget: (device: MicroBitDevice) => void;
  onSetActive: (device: MicroBitDevice) => void;
}

const DeviceItem = ({ device, isActive, onDisconnect, onForget, onSetActive }: DeviceItemProps) => {
  return <Stack direction="horizontal" as={ListGroup.Item}>
    <Stack direction="horizontal" gap={2}>
      <span>{ `micro:bit (v${device.hardwareVersion?.join(".") ?? "?"})` }</span>
      { (isActive) && <Badge bg="primary">Active</Badge> }
      { (device.hardwareVersion === undefined) && <Spinner animation="border" size="sm" role="status"><span className="visually-hidden">Connecting...</span></Spinner>  }
    </Stack>
    <ButtonGroup className="ms-auto" aria-label="Device Controls">
      {/* TODO: Add a program/update button  */}
      <Button variant="outline-primary" disabled={isActive} onClick={() => onSetActive(device)}>Set Active</Button>
      <Button variant="outline-primary" onClick={() => device.identify()}>Identify</Button>
      <Button variant="outline-danger" onClick={() => onDisconnect(device)}>Disconnect</Button>
      <Button variant="outline-danger" onClick={() => onForget(device)}>Forget</Button>
    </ButtonGroup>
  </Stack>
};

const DevicesPane = () => {
  if (!deviceManager.supported) {
    return <div className="alert alert-warning m-4" role="alert">
      <h4 className="alert-heading">Unfortunately, USB devices (like the micro:bit) are not supported in your browser.</h4>
      <p className="mb-0">Please use an up-to-date version of a browser like Google Chrome or Microsoft Edge to use devices in your program.</p>
    </div>
  }

  const imports = useStoreState((state) => state.activeProject.imports),
    addImport = useStoreActions((actions) => actions.activeProject.addImport),
    microBitImport = useMemo(() => imports.find(({ module }) => module == "pytch.microbit"), [imports]),
    addMicroBitImport = () => addImport({ module: "pytch.microbit", as: "microbit" });
  
  const devices = useStoreState((state) => state.devices.devices),
    activeDevice = useStoreState((state) => state.devices.activeDevice);

  let alert: JSX.Element | undefined;

  if (microBitImport && !activeDevice) {
    alert = <Alert className="m-2" variant="warning">
      You are using the <code>pytch.microbit</code> module, but you do not have a micro:bit connected. micro:bit functions will throw an error and events will not trigger.
    </Alert>;
  } else if (!microBitImport && activeDevice) {
    alert = <Alert className="m-2" variant="warning"> 
      <Stack direction="horizontal">
        You have a micro:bit attached, but have not imported the <code>pytch.microbit</code> module. micro:bit functions and events will not be available.
        <Button className="ms-auto" variant="outline-dark" onClick={addMicroBitImport}>Add Import</Button>
      </Stack>
    </Alert>
  } else if (!activeDevice) {
    alert = <Alert className="m-2" variant="secondary">No micro:bit connected</Alert>
  }
  
  return <div className="p-2">
    { alert }
    {
      (devices.length > 0) &&
        <ListGroup variant="flush">
          { devices.map((device) => {
            return <DeviceItem
              key={device.serialNumber}
              device={device}
              isActive={activeDevice == device}
              onDisconnect={() => deviceManager.disconnectDevice(device)}
              onForget={() => deviceManager.forgetDevice(device)}
              onSetActive={() => deviceManager.makeActive(device)} />
          }) }
        </ListGroup>
    }
    <div className="m-2">
      <Button variant="primary" onClick={() => deviceManager.attemptPair()}>Pair a New Device</Button>
    </div>
  </div>
};

export default DevicesPane;
