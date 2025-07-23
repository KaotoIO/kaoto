import { Button } from '@patternfly/react-core';
import {
  AngleDoubleDownIcon,
  AngleDoubleUpIcon,
  BanIcon,
  CheckIcon,
  CodeBranchIcon,
  CompressArrowsAltIcon,
  ExpandArrowsAltIcon,
  PowerOffIcon,
  SyncAltIcon,
  TrashIcon,
} from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent } from 'react';
import { AddStepMode, IDataTestID, IVisualizationNode } from '../../../../models';
import { useDeleteGroup } from '../../Custom/hooks/delete-group.hook';
import { useDeleteStep } from '../../Custom/hooks/delete-step.hook';
import { useDisableStep } from '../../Custom/hooks/disable-step.hook';
import { useEnableAllSteps } from '../../Custom/hooks/enable-all-steps.hook';
import { useInsertStep } from '../../Custom/hooks/insert-step.hook';
import { useReplaceStep } from '../../Custom/hooks/replace-step.hook';
import './StepToolbar.scss';
import { useMoveStep } from '../../Custom/hooks/move-step.hook';

interface IStepToolbar extends IDataTestID {
  vizNode: IVisualizationNode;
  className?: string;
  isCollapsed?: boolean;
  /** Toggle node collapse / expand */
  onCollapseToggle?: () => void;
}

export const StepToolbar: FunctionComponent<IStepToolbar> = ({
  vizNode,
  className,
  isCollapsed = false,
  onCollapseToggle,
  'data-testid': dataTestId,
}) => {
  const { canHaveSpecialChildren, canBeDisabled, canReplaceStep, canRemoveStep, canRemoveFlow } =
    vizNode.getNodeInteraction();
  const { onInsertStep: onInsertSpecial } = useInsertStep(vizNode, AddStepMode.InsertSpecialChildStep);
  const { onToggleDisableNode, isDisabled } = useDisableStep(vizNode);
  const { areMultipleStepsDisabled, onEnableAllSteps } = useEnableAllSteps();
  const { onReplaceNode } = useReplaceStep(vizNode);
  const { onDeleteStep } = useDeleteStep(vizNode);
  const { onDeleteGroup } = useDeleteGroup(vizNode);
  const { canBeMoved: canMoveBefore, onMoveStep: onMoveBefore } = useMoveStep(vizNode, AddStepMode.PrependStep);
  const { canBeMoved: canMoveAfter, onMoveStep: onMoveAfter } = useMoveStep(vizNode, AddStepMode.AppendStep);

  return (
    <div className={clsx(className, 'step-toolbar')} data-testid={dataTestId}>
      {canMoveBefore && (
        <Button
          icon={<AngleDoubleUpIcon />}
          className="step-toolbar__button"
          data-testid="step-toolbar-button-move-before"
          variant="control"
          title="Move before"
          onClick={(event) => {
            onMoveBefore();
            event.stopPropagation();
          }}
        ></Button>
      )}

      {canMoveAfter && (
        <Button
          icon={<AngleDoubleDownIcon />}
          className="step-toolbar__button"
          data-testid="step-toolbar-button-move-after"
          variant="control"
          title="Move after"
          onClick={(event) => {
            onMoveAfter();
            event.stopPropagation();
          }}
        ></Button>
      )}

      {canHaveSpecialChildren && (
        <Button
          icon={<CodeBranchIcon />}
          className="step-toolbar__button"
          data-testid="step-toolbar-button-add-special"
          variant="control"
          title="Add branch"
          onClick={(event) => {
            onInsertSpecial();
            event.stopPropagation();
          }}
        ></Button>
      )}

      {canBeDisabled && (
        <Button
          className="step-toolbar__button"
          data-testid="step-toolbar-button-disable"
          variant="control"
          title={isDisabled ? 'Enable step' : 'Disable step'}
          onClick={(event) => {
            onToggleDisableNode();
            event.stopPropagation();
          }}
        >
          {isDisabled ? <CheckIcon /> : <BanIcon />}
        </Button>
      )}

      {areMultipleStepsDisabled && (
        <Button
          icon={<PowerOffIcon />}
          className="step-toolbar__button"
          data-testid="step-toolbar-button-enable-all"
          variant="control"
          title="Enable all"
          onClick={(event) => {
            onEnableAllSteps();
            event.stopPropagation();
          }}
        ></Button>
      )}

      {canReplaceStep && (
        <Button
          icon={<SyncAltIcon />}
          className="step-toolbar__button"
          data-testid="step-toolbar-button-replace"
          variant="control"
          title="Replace step"
          onClick={(event) => {
            onReplaceNode();
            event.stopPropagation();
          }}
        ></Button>
      )}

      {onCollapseToggle && (
        <Button
          className="step-toolbar__button"
          data-testid="step-toolbar-button-collapse"
          variant="control"
          title={isCollapsed ? 'Expand step' : 'Collapse step'}
          onClick={(event) => {
            onCollapseToggle();
            event.stopPropagation();
          }}
        >
          {isCollapsed ? <ExpandArrowsAltIcon /> : <CompressArrowsAltIcon />}
        </Button>
      )}

      {canRemoveStep && (
        <Button
          icon={<TrashIcon />}
          className="step-toolbar__button"
          data-testid="step-toolbar-button-delete"
          variant="stateful"
          state="attention"
          title="Delete step"
          onClick={(event) => {
            onDeleteStep();
            event.stopPropagation();
          }}
        ></Button>
      )}

      {canRemoveFlow && (
        <Button
          icon={<TrashIcon />}
          className="step-toolbar__button"
          data-testid="step-toolbar-button-delete-group"
          variant="stateful"
          state="attention"
          title="Delete group"
          onClick={(event) => {
            onDeleteGroup();
            event.stopPropagation();
          }}
        ></Button>
      )}
    </div>
  );
};
