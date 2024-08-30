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
  const burgerClass = classNames(
    "burger-menu",
    menuIsExpanded ? "is-expanded" : "is-collapsed"
  );

  return (
    <div className="NavBar">
      <div className="title-and-version">
        <Link to="/">
          <h1 className="home-link">Pytch</h1>
        </Link>
      </div>
      <div className={burgerClass} onClick={toggleMenu} ref={menuRef}>
        <FontAwesomeIcon icon={burgerIcon} />
      </div>
      <ul className={ulClass}>
        <li>
          <a href={pytchResearchSiteUrl}>About</a>
        </li>
        <li>
          <a href={`${pytchResearchSiteUrl}lesson-plans`}>Lesson plans</a>
        </li>
        <li>
          <a href={withinSite("/doc/index.html")}>Help</a>
        </li>
        <li>
          <Link to="/tutorials/">Tutorials</Link>
        </li>
        <li>
          <Link to="/my-projects/">My projects</Link>
        </li>
        <li>
          <Link
            className="contact-us-link"
            to="/#contact-info"
            onClick={() => setMenuIsExpanded(false)}
          >
            <FontAwesomeIcon icon={["far", "envelope"]} />
          </Link>
        </li>
      </ul>
    </div>
  );
};

export default NavBanner;
