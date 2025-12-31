import { Badge, Button, ButtonGroup, Spinner } from "react-bootstrap";
import { deviceManager, MicroBitStatus } from "../../skulpt-connection/device-manager";
import { useStoreState } from "../../store";
import { AddSomethingSingleButton } from "./AddSomethingButton";

export const DevicesList = () => {
  const pair = () => deviceManager.pairDevice();
  const activeDevice = useStoreState((state) => state.devices.active);
  const devices = useStoreState((state) => state.devices.devices);

  return <>
    <ul>
      {
        devices.map((d) => {
          const active = d.serialNumber === activeDevice;
          const disabled = active || d.status !== MicroBitStatus.READY;

          let connecting = false;
          let status: string;
          let statusStyle: string;

          if (active) {
            status = "Active";
            statusStyle = "primary";
          } else {
            switch (d.status) {
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

          return <li key={d.serialNumber}>
            micro:bit
            <span>(<code>{d.serialNumber.slice(-8)}</code>)</span>
            <Badge bg="secondary">V{d.revision.join(".")}</Badge>
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
              <Button variant="outline-primary" disabled={disabled} onClick={() => deviceManager.setActive(d.serialNumber)}>
                Set Active
              </Button>
              <Button variant="outline-danger" onClick={() => deviceManager.disconnect(d.serialNumber)}>
                Disconnect
              </Button>
              <Button variant="outline-danger" onClick={() => deviceManager.disconnect(d.serialNumber, true)}>
                Forget
              </Button>
            </ButtonGroup>
          </li>;
        })
      }
    </ul>
    <AddSomethingSingleButton what="device" label="Add a device" onClick={pair} />
  </>
}
