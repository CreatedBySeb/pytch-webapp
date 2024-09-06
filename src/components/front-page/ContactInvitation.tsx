import React from "react";
import { EmptyProps } from "../../utils";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./ContactInvitation.scss";

export const ContactInvitation: React.FC<EmptyProps> = () => {
  return (
    <div id="contact-info" className="ContactInvitation">
      <p className="mail-icon">
        <a href="mailto:info@pytch.org">
          <FontAwesomeIcon icon={["far", "envelope"]} />
        </a>
      </p>
      <p className="content-text">
        Please email us at <a href="mailto:info@pytch.org">info@pytch.org</a>{" "}
        with any feedback or suggestions.
      </p>
    </div>
  );
};
