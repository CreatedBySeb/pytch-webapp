import React from "react";
import Alert from "react-bootstrap/Alert";

type NoContentHelpProps = {
  actorKind: string;
  contentKind: string;
  buttonsPlural: boolean;
};
export const NoContentHelp: React.FC<NoContentHelpProps> = ({
  actorKind,
  contentKind,
  buttonsPlural,
}) => {
  const buttonOrButtons = buttonsPlural ? "buttons" : "button";
  return (
    <Alert className="NoContentHelp" variant="primary">
      <p>
        Your {actorKind} has no {contentKind} yet. Use the {buttonOrButtons}{" "}
        below to add one!
      </p>
    </Alert>
  );
};
