import React from "react";
import { withinSite } from "../env-utils";
import { Link } from "./LinkWithinApp";
import { pytchResearchSiteUrl } from "../constants";

import "../pytch-navbar.scss";

const NavBanner = () => {
  return (
    <div className="NavBar">
      <div className="title-and-version">
        <Link to="/">
          <h1>Pytch</h1>
        </Link>
      </div>
      <ul>
        <a href={pytchResearchSiteUrl}>
          <li>About Pytch</li>
        </a>
        <a href={withinSite("/doc/index.html")}>
          <li>Help</li>
        </a>
        <Link to="/tutorials/">
          <li>Tutorials</li>
        </Link>
        <Link to="/my-projects/">
          <li>My projects</li>
        </Link>
      </ul>
    </div>
  );
};

export default NavBanner;
