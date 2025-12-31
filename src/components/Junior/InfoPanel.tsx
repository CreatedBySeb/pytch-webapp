import React, { useId, useMemo, useRef } from "react";
import { useHasImport } from "../hooks/code-text";
import { useStoreState } from "../../store";
import { useJrEditActions, useJrEditState } from "./hooks";
import { InfoPanelTabKey as TabKey } from "../../model/junior/edit-state";
import { deviceManager } from "../../skulpt-connection/device-manager";
import { Tabs, TabWithTypedKey } from "../TabWithTypedKey";
import { DevicesList } from "./DevicesList";
import { ErrorReportList } from "./ErrorReportList";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";
import { Button } from "react-bootstrap";

const StandardOutput = () => {
  // TODO: Remove duplication between this and non-jr component.
  const text = useStoreState((state) => state.standardOutputPane.text);

  const maybePlaceholder =
    text === "" ? (
      <p className="info-pane-placeholder">
        Anything your program prints will appear here.
      </p>
    ) : null;

  return (
    <div className="StandardOutputPane">
      {maybePlaceholder}
      <pre className="SkulptStdout">{text}</pre>
    </div>
  );
};

const Errors = () => {
  const errorList = useStoreState((state) => state.errorReportList.errors);

  const nErrors = errorList.length;

  const content =
    nErrors === 0 ? (
      <p className="info-pane-placeholder">
        Any errors your project encounters will appear here.
      </p>
    ) : (
      <ErrorReportList />
    );

  return <div className="ErrorsPane">{content}</div>;
};

const Devices = () => {
  const content =
    (!deviceManager.supported) ? (
      <p className="info-pane-placeholder">
        Unfortunately, devices are not supported in your browser.
        See INSERT_LINK for more information.
      </p>
    ) : (
      <DevicesList />
    );

  return <div className="DevicesPane">{content}</div>;
};

type InfoDisclosureProps = { tabContentId: string };
const InfoDisclosure: React.FC<InfoDisclosureProps> = ({ tabContentId }) => {
  const toggleStateAction = useJrEditActions((a) => a.toggleInfoPanelState);
  const toggleState = () => toggleStateAction();

  return (
    <div>
      <Button
        variant="outline-secondary"
        size="sm"
        className="disclosure-button expand-button m-1"
        onClick={toggleState}
        aria-label="Show output, errors and devices"
        aria-expanded={false}
        aria-controls={tabContentId}
      >
        <FontAwesomeIcon className="me-2" icon="angle-right" />
        Output, errors and devices
      </Button>
    </div>
  );
};

export const InfoPanel = () => {
  const activeTab = useJrEditState((s) => s.infoPanelActiveTab);
  const isCollapsed = useJrEditState((s) => s.infoPanelState === "collapsed");
  const setActiveTab = useJrEditActions((a) => a.expandAndSetActive);
  const toggleStateAction = useJrEditActions((a) => a.toggleInfoPanelState);
  const tabContentId = useId();
  const wasCollapsed = useRef<boolean | null>(null);

  const toggleState = () => toggleStateAction();

  const classes = classNames(
    "Junior-InfoPanel-container",
    "compact-tablist-container",
    { isCollapsed }
  );

  const ariaLabel = "Output, errors and devices";

  const tabPanelClasses = classNames(
    "Junior-InfoPanel",
    isCollapsed && "d-none"
  );

  const maybeFocusButton = (elt: HTMLElement | null) => {
    if (elt != null && wasCollapsed.current !== isCollapsed) {
      if (wasCollapsed.current != null) {
        const mButton = elt.querySelector(
          ":scope .disclosure-button"
        ) as HTMLButtonElement | null;
        mButton?.focus();
      }
      wasCollapsed.current = isCollapsed;
    }
  };

  const activeDevice = useStoreState((state) => state.devices.active);
  const hasMicroBitImport = useHasImport("pytch.microbit");

  const devicesTitle = useMemo(() => {
    const hasDevice = activeDevice !== null;

    // It's only ever an issue if the two don't match
    if (hasDevice !== hasMicroBitImport) {
      return <span>
        Devices <FontAwesomeIcon icon="triangle-exclamation" />
      </span>
    } else {
      return "Devices";
    }
  }, [activeDevice, hasMicroBitImport])


  const Tab = TabWithTypedKey<TabKey>;
  return (
    <section className={classes} aria-label={ariaLabel} ref={maybeFocusButton}>
      <Tabs
        id={tabContentId}
        className={tabPanelClasses}
        transition={false}
        activeKey={activeTab}
        onSelect={(k) => k && setActiveTab(k as TabKey)}
      >
        <Tab eventKey="output" title="Output">
          <StandardOutput />
        </Tab>
        <Tab eventKey="errors" title="Errors">
          <Errors />
        </Tab>
        <Tab eventKey="devices" title={devicesTitle}>
          <Devices />
        </Tab>
      </Tabs>
      {isCollapsed ? (
        <InfoDisclosure tabContentId={tabContentId} />
      ) : (
        <Button
          variant="outline-secondary"
          className="disclosure-button collapse-button"
          onClick={toggleState}
          aria-label="Hide output, errors and devices"
          aria-expanded={true}
          aria-controls={tabContentId}
        >
          <FontAwesomeIcon icon={"window-minimize"} />
        </Button>
      )}
    </section>
  );
};
