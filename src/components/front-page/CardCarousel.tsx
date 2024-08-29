import React, { useState } from "react";
import { EmptyProps } from "../../utils";
import TutorialMiniCard from "../TutorialMiniCard";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import "./CardCarousel.scss";

export const CardCarousel: React.FC<EmptyProps> = () => {
  const [indexOffset, setIndexOffset] = useState(0);

  // TODO: Replace the hard-coded list of tutorial mini-cards with something
  // driven by the pytch-tutorials repo?

  const allCards: React.ReactNode[] = [];

  allCards.push(
    <TutorialMiniCard
      key="catch"
      title="Catch a star"
      slug="chase"
      screenshotBasename="screenshot.png"
    >
      <p>
        In this introduction to coding in Pytch, you control a bird using the
        keyboard, and your job is to catch the star.
      </p>
    </TutorialMiniCard>
  );

  allCards.push(
    <TutorialMiniCard
      key="boing"
      title="Boing"
      slug="boing"
      screenshotBasename="summary-screenshot.png"
    >
      <p>
        In the game <i>Pong</i> from 1972, players hit a ball back and forth.
        Our <i>Boing</i> game, adapted from one in{" "}
        <a href="https://wireframe.raspberrypi.org/books/code-the-classics1">
          Code the Classics
        </a>
        , lets you play against the computer.
      </p>
    </TutorialMiniCard>
  );

  allCards.push(
    <TutorialMiniCard
      key="qbert"
      title="Q*bert"
      slug="qbert"
      screenshotBasename="screenshot.png"
    >
      <p>
        Jump around a pyramid of blocks, trying to change the whole stack yellow
        without falling off! Our version is adapted from one in{" "}
        <a href="https://wireframe.raspberrypi.org/issues/42">
          Wireframe magazine
        </a>
        , inspired by the 1982 arcade classic.
      </p>
    </TutorialMiniCard>
  );

  allCards.push(
    <TutorialMiniCard
      key="splat"
      title="Splat the moles"
      slug="splat-the-moles"
      screenshotBasename="screenshot-w240.jpg"
    >
      <p>
        A game where the player has to splat moles to score points. But if they
        miss, they lose all their points!
      </p>
    </TutorialMiniCard>
  );

  const shownCards = [
    ...allCards.slice(indexOffset),
    ...allCards.slice(0, indexOffset),
  ];

  const increaseOffsetFun = (dIndex: number) => () =>
    setIndexOffset((indexOffset + dIndex) % allCards.length);

  return (
    <div className="CardCarousel">
      <button className="prev-arrow" onClick={increaseOffsetFun(-1)}>
        <FontAwesomeIcon icon="chevron-left" />
      </button>
      <div className="cards-content">{shownCards}</div>
      <button className="next-arrow" onClick={increaseOffsetFun(1)}>
        <FontAwesomeIcon icon="chevron-right" />
      </button>
    </div>
  );
};
