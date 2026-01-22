import React from "react";
import { DivSettingWindowTitle } from "./DivSettingWindowTitle";
import Button from "react-bootstrap/Button";
import { envVarOrDefault } from "../env-utils";

// Accept props of broader type than "FallbackProps" to allow use in
// other contexts.
type ExceptionDisplayProps = { error: { message: string } };

export const ExceptionDisplay: React.FC<ExceptionDisplayProps> = (props) => {
  const { error } = props;

  // Use <a> in the below, rather than <LinkWithinApp>, to ensure true
  // navigation and reset of app.
  return (
    <DivSettingWindowTitle
      className="ExceptionDisplay"
      windowTitle="Pytch: Unexpected error"
    >
      <div className="content">
        <p>
          Sorry, there was an unexpected problem. Please contact the Pytch team
          if the problem persists.
        </p>
        <p>
          (Technical details:{" "}
          <span className="error-message">{error.message}</span>)
        </p>
        <div className="button-container">
          <a href={envVarOrDefault("BASE_URL", "https://pytch.org/")}>
            <Button>Return to Pytch app homepage</Button>
          </a>
        </div>
      </div>
    </DivSettingWindowTitle>
  );
};
