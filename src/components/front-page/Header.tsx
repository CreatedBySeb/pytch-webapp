import React, { CSSProperties, useState } from "react";
import { EmptyProps } from "../../utils";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { envVarOrFail } from "../../env-utils";
import { welcomeAssetUrl } from "./utils";
import "./Header.scss";

type OverviewVideoModalProps = {
  isShown: boolean;
  dismiss: () => void;
};
const OverviewVideoModal: React.FC<OverviewVideoModalProps> = ({
  isShown,
  dismiss,
}) => {
  const blobsRoot = envVarOrFail("VITE_STATIC_BLOBS_BASE");
  const videoUrl = `${blobsRoot}/assets/welcome/Overview.mp4`;

  return (
    <Modal
      className="OverviewVideoModal"
      show={isShown}
      onHide={dismiss}
      animation={false}
      centered={true}
    >
      <Modal.Header closeButton></Modal.Header>
      <Modal.Body>
        <video className="w-100" controls loop>
          <source src={videoUrl} type="video/mp4" />
        </video>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={dismiss}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export const Header: React.FC<EmptyProps> = () => {
  const [modalShown, setModalShown] = useState(false);

  // Supply background-image here to ensure correct behaviour if app
  // entered via non-root route.
  const contentStyle: CSSProperties = {
    backgroundImage: `url(${welcomeAssetUrl("two-students-using-Pytch.jpg")})`,
  };

  return (
    <header className="Header" style={contentStyle}>
      <div className="background-darken abs-0000" />
      <div className="content">
        <section className="content-text">
          <h2 className="header">Pytch</h2>
          <h3 className="header">
            A bridge from <strong>Scratch</strong> to <strong>Python</strong>
          </h3>
        </section>

        <section className="subgrid-video">
          <div
            className="video-container"
            onClick={() => setModalShown(true)}
            aria-label="Video overview of Pytch"
          >
            <svg
              fill="#fff"
              version="1.1"
              id="play_button"
              xmlns="http://www.w3.org/2000/svg"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              viewBox="0 0 60 60"
            >
              <g>
                <title>Click here for an overview of Pytch!</title>
                <path
                  d="M45.563,29.174l-22-15c-0.307-0.208-0.703-0.231-1.031-0.058C22.205,14.289,22,14.629,22,15v30
              c0,0.371,0.205,0.711,0.533,0.884C22.679,45.962,22.84,46,23,46c0.197,0,0.394-0.059,0.563-0.174l22-15
              C45.836,30.64,46,30.331,46,30S45.836,29.36,45.563,29.174z M24,43.107V16.893L43.225,30L24,43.107z"
                />
                <path
                  d="M30,0C13.458,0,0,13.458,0,30s13.458,30,30,30s30-13.458,30-30S46.542,0,30,0z M30,58C14.561,58,2,45.439,2,30
              S14.561,2,30,2s28,12.561,28,28S45.439,58,30,58z"
                />
              </g>
            </svg>
          </div>
        </section>

        <OverviewVideoModal
          isShown={modalShown}
          dismiss={() => setModalShown(false)}
        />
      </div>
    </header>
  );
};
