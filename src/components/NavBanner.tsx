import React, { useEffect, useState } from "react";
import { withinSite } from "../env-utils";
import { Link } from "./LinkWithinApp";
import { pytchResearchSiteUrl } from "../constants";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import classNames from "classnames";

import "../pytch-navbar.scss";
import { IconProp } from "@fortawesome/fontawesome-svg-core";

const NavBanner = () => {
  const [menuIsExpanded, setMenuIsExpanded] = useState(false);
  const menuRef = React.createRef<HTMLDivElement>();

  useEffect(() => {
    const menuDiv = menuRef.current;
    if (menuDiv == null) return;

    let resizeObserver: ResizeObserver | null = new ResizeObserver(() => {
      const mMenuDisplay = menuDiv.computedStyleMap().get("display");
      if (mMenuDisplay == null) return;

      const menuDisplay = mMenuDisplay as CSSKeywordValue;
      if (menuIsExpanded && menuDisplay.value === "none") {
        setMenuIsExpanded(false);
      }
    });

    resizeObserver.observe(menuDiv);

    return () => {
      resizeObserver?.disconnect();
      resizeObserver = null;
    };
  });

  const ulClass = classNames({ menuIsExpanded });
  const toggleMenu = () => {
    setMenuIsExpanded(!menuIsExpanded);
  };

  const burgerIcon: IconProp = menuIsExpanded ? "xmark" : "bars";
  // TODO: UL is supposed to directly contain LIs, so the below needs
  // restructuring.
  return (
    <div className="NavBar">
      <div className="title-and-version">
        <Link to="/">
          <h1>Pytch</h1>
        </Link>
      </div>
      <div className="burger-menu" onClick={toggleMenu} ref={menuRef}>
        <FontAwesomeIcon icon={burgerIcon} />
      </div>
      <ul className={ulClass}>
        <a href={pytchResearchSiteUrl}>
          <li>About</li>
        </a>
        <a href={`${pytchResearchSiteUrl}lesson-plans`}>
          <li>Lesson plans</li>
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
        <Link to="/#contact-info" onClick={() => setMenuIsExpanded(false)}>
          <li>
            <FontAwesomeIcon icon={["far", "envelope"]} />
          </li>
        </Link>
      </ul>
    </div>
  );
};

export default NavBanner;
