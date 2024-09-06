import React, { CSSProperties, useState } from "react";
import { EmptyProps } from "../../utils";
import { welcomeAssetUrl } from "./utils";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { useRunFlow } from "../../model";
import { useStoreState } from "../../store";
import { useNavigate } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./CodingJourney.scss";

type CodingJourneysModalProps = {
  isShown: boolean;
  dismiss: () => void;
};
const CodingJourneysModal: React.FC<CodingJourneysModalProps> = ({
  isShown,
  dismiss,
}) => {
  const navigate = useNavigate();
  const activeUiVersion = useStoreState((s) => s.versionOptIn.activeUiVersion);
  const runCreateProjectFlow = useRunFlow((f) => f.createProjectFlow);
  const runCreateProject = () => runCreateProjectFlow({ activeUiVersion });

  return (
    <Modal
      className="CodingJourneysModal"
      centered={true}
      show={isShown}
      onHide={dismiss}
      animation={false}
    >
      <Modal.Header closeButton>
        <Modal.Title>I want to...</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <section className="narrow-screen-warning">
          <p className="icon">
            <FontAwesomeIcon icon="exclamation-triangle" />
          </p>
          <p className="text-content">
            We advise using Pytch on a device with a reasonably large screen.
          </p>
        </section>
        <Button onClick={() => navigate("tutorials/")}>
          Start learning from basics with guided help and tutorials
        </Button>
        <Button
          onClick={() => {
            dismiss();
            runCreateProject();
          }}
        >
          Start a new project and work on my own
        </Button>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={dismiss}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export const CodingJourney: React.FC<EmptyProps> = () => {
  const [modalShown, setModalShown] = useState(false);

  // Supply background-image here to ensure correct behaviour if app
  // entered via non-root route.
  const contentStyle: CSSProperties = {
    backgroundImage: `url(${welcomeAssetUrl("swirls-and-icons.png")})`,
  };

  return (
    <>
      <div className="CodingJourney">
        <div className="separator" />
        <div
          className="button"
          style={contentStyle}
          onClick={() => setModalShown(true)}
        >
          <div className="hover-darken" />
          <p className="label-text">
            &gt;&gt;&gt; Start your
            <br />
            coding journey
          </p>
        </div>
      </div>
      <CodingJourneysModal
        isShown={modalShown}
        dismiss={() => setModalShown(false)}
      />
    </>
  );
};
