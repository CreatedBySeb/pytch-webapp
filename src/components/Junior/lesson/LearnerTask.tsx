import React from "react";
import {
  LearnerTask as LearnerTaskDescriptor,
  LearnerTaskHelpStage,
  LearnerTaskHelpStageFragment,
} from "../../../model/junior/jr-tutorial";
import { Alert, Button } from "react-bootstrap";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import RawElement from "../../RawElement";
import classNames from "classnames";
import { assertNever } from "../../../utils";
import { LearnerTaskCommit } from "./LearnerTaskCommit";
import { RawOrCodeSnippet } from "./RawOrCodeSnippet";
import { useStoreActions } from "../../../store";
import { useMappedLinkedJrTutorial } from "./hooks";

type TaskInteractivityKind = "old" | "previous" | "current";

type HelpStageFragmentProps = { fragment: LearnerTaskHelpStageFragment };
const HelpStageFragment: React.FC<HelpStageFragmentProps> = ({ fragment }) => {
  const content = (() => {
    switch (fragment.kind) {
      case "element": {
        const element = fragment.element;
        return element instanceof Text ? null : (
          <RawOrCodeSnippet element={element} />
        );
      }
      case "commit":
        return <LearnerTaskCommit commit={fragment.commit} />;
      default:
        return assertNever(fragment);
    }
  })();

  return content == null ? null : (
    <div className="HelpStageFragment">{content}</div>
  );
};

type HelpStageProps = {
  stageIndex: number;
  nStagesShown: number;
  keyPath: string;
  stage: LearnerTaskHelpStage;
};
const HelpStage: React.FC<HelpStageProps> = ({
  stageIndex,
  nStagesShown,
  keyPath,
  stage,
}) => {
  if (stageIndex >= nStagesShown) {
    return null;
  }

  const content = stage.fragments.map((fragment, idx) => (
    <HelpStageFragment key={idx} fragment={fragment} />
  ));
  return (
    <>
      <div className="help-stage-divider" />
      <div key={keyPath} className="LearnerTask-HelpStage">
        {content}
      </div>
    </>
  );
};

type CheckboxHelpProps = { interactivityKind: TaskInteractivityKind };
const CheckboxHelp: React.FC<CheckboxHelpProps> = ({ interactivityKind }) => {
  switch (interactivityKind) {
    case "current":
      return (
        <span>
          <FontAwesomeIcon className="help-arrow" icon="arrow-left-long" />{" "}
          Click when you’ve done this.
        </span>
      );
    case "previous":
      return (
        <span>
          <FontAwesomeIcon className="help-arrow" icon="arrow-left-long" />{" "}
          Done! (Click to rewind to this task.)
        </span>
      );
    case "old":
      return <span>Done!</span>;
    default:
      return assertNever(interactivityKind);
  }
};

type ShowHelpStageButtonProps = {
  nStagesStillHidden: number;
  showNextHelpStage: () => void;
  hideAllHelpStages: () => void;
  onCheckboxClick: () => void;
};
const ShowNextHelpStageButton: React.FC<ShowHelpStageButtonProps> = ({
  nStagesStillHidden,
  showNextHelpStage,
  hideAllHelpStages,
  onCheckboxClick,
}) => {
  const label = (() => {
    switch (nStagesStillHidden) {
      case 0:
        return "Hide help";
      case 1:
        return "Show me";
      default:
        return "Hint";
    }
  })();

  const onClick =
    nStagesStillHidden === 0 ? hideAllHelpStages : showNextHelpStage;

  return (
    <div className="ShowNextHelpStageButton-container">
      <div className="to-do-checkbox-container">
        <FontAwesomeIcon
          className="to-do-checkbox"
          icon="check-square"
          onClick={onCheckboxClick}
        />
      </div>
      <Button
        key={nStagesStillHidden}
        variant="outline-success"
        onClick={onClick}
      >
        {label}
      </Button>
    </div>
  );
};

type LearnerTaskProps = {
  keyPath: string;
  task: LearnerTaskDescriptor;
  kind: TaskInteractivityKind;
};
export const LearnerTask: React.FC<LearnerTaskProps> = ({
  keyPath,
  task,
  kind,
}) => {
  const nHelpStagesShown = useMappedLinkedJrTutorial(
    (tutorial) =>
      tutorial.interactionState.taskStates[task.index].nHelpStagesShown
  );
  const showNextHelpStage = useStoreActions(
    (actions) => actions.activeProject.showNextHelpStage
  );
  const hideAllHelpStages = useStoreActions(
    (actions) => actions.activeProject.hideAllHelpStages
  );
  const markCurrentTaskDone = useStoreActions(
    (actions) => actions.activeProject.markCurrentTaskDone
  );
  const markPreviousTaskNotDone = useStoreActions(
    (actions) => actions.activeProject.markPreviousTaskNotDone
  );

  const onCheckboxClick = () => {
    switch (kind) {
      case "old":
        // Shouldn't happen.
        break;
      case "previous":
        markPreviousTaskNotDone();
        break;
      case "current":
        markCurrentTaskDone();
        break;
      default:
        assertNever(kind);
    }
  };

  const taskHelpStages = task.helpStages.map((stage, idx) => {
    const innerKeyPath = `${keyPath}/${idx}`;
    return (
      <HelpStage
        key={innerKeyPath}
        keyPath={innerKeyPath}
        stageIndex={idx}
        nStagesShown={nHelpStagesShown}
        stage={stage}
      />
    );
  });

  const nStagesStillHidden = task.helpStages.length - nHelpStagesShown;
  const helpContent = (
    <>
      {taskHelpStages}
      <div className="help-stage-divider" />
      <ShowNextHelpStageButton
        nStagesStillHidden={nStagesStillHidden}
        showNextHelpStage={() => showNextHelpStage(task.index)}
        hideAllHelpStages={() => hideAllHelpStages(task.index)}
        onCheckboxClick={onCheckboxClick}
      />
    </>
  );

  const alertVariant = kind === "current" ? "success" : "light";
  const classes = classNames("LearnerTask", `learner-task-${kind}`);
  return (
    <Alert key={keyPath} variant={alertVariant} className={classes}>
      <div className="task-outline">
        <FontAwesomeIcon
          className="to-do-checkbox"
          icon="check-square"
          onClick={onCheckboxClick}
        />
        <div className="task-intro-content">
          <RawElement element={task.intro} />
        </div>
      </div>
      {helpContent}
    </Alert>
  );
};
