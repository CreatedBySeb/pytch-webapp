import React from "react";
import { EmptyProps } from "../../utils";
import { welcomeAssetUrl } from "./utils";
import { DecorativeUnderscore } from "../DecorativeUnderscore";
import "./LearnPython.scss";
import { Link } from "react-router-dom";
import { sharingUrlFromSlugForDemo } from "../../model/user-interactions/share-tutorial";

type LaptopScreenshotProps = {
  imageUrl: string;
  tutorialSlug: string;
};
const LaptopScreenshot: React.FC<LaptopScreenshotProps> = ({
  imageUrl,
  tutorialSlug,
}) => {
  const shareUrl = sharingUrlFromSlugForDemo(tutorialSlug);
  return (
    <Link to={shareUrl}>
      <div className="LaptopScreenshot">
        <div className="screen-wrapper">
          <img src={imageUrl} />
        </div>
        <div className="angled-keyboard" />
        <div className="front-edge" />
      </div>
    </Link>
  );
};

export const LearnPython: React.FC<EmptyProps> = () => {
  const logoUrl = welcomeAssetUrl("pytch-colour-logo-960-320.png");
  const flatPreview = welcomeAssetUrl("flat-mock-up.png");
  const scriptByScriptPreview = welcomeAssetUrl("script-by-script-mock-up.png");

  return (
    <div className="LearnPython">
      <div className="content">
        <h2>
          Learn Python
          <br />
          with Pytch
          <DecorativeUnderscore />
        </h2>

        <div className="content-text">
          <div className="feature-summary">
            <p>
              The online Pytch system provides an integrated development
              environment where students can write their code, run their
              programs, and choose resources from our media library.
            </p>

            <div className="logo-container">
              <img src={logoUrl} alt="" />
            </div>
          </div>

          <h3>
            Two ways of writing code
            <DecorativeUnderscore />
          </h3>

          <div className="laptop-screenshots">
            <div className="annotated-screenshot narrow">
              <h4>Script by script</h4>
              <LaptopScreenshot
                imageUrl={scriptByScriptPreview}
                tutorialSlug="script-by-script-catch-apple"
              />
            </div>

            <div className="annotated-screenshot narrow">
              <h4>One flat program</h4>
              <LaptopScreenshot
                imageUrl={flatPreview}
                tutorialSlug="catch-apple"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
