import { Button } from '@patternfly/react-core';
import {
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

  return (
    <div className={clsx(className, 'step-toolbar')} data-testid={dataTestId}>
      {canHaveSpecialChildren && (
        <Button
          className="step-toolbar__button"
          data-testid="step-toolbar-button-add-special"
          variant="secondary"
          title="Add branch"
          onClick={(event) => {
            onInsertSpecial();
            event.stopPropagation();
          }}
        >
          <CodeBranchIcon />
        </Button>
      )}

      {canBeDisabled && (
        <Button
          className="step-toolbar__button"
          data-testid="step-toolbar-button-disable"
          variant="secondary"
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
          className="step-toolbar__button"
          data-testid="step-toolbar-button-enable-all"
          variant="secondary"
          title="Enable all"
          onClick={(event) => {
            onEnableAllSteps();
            event.stopPropagation();
          }}
        >
          <PowerOffIcon />
        </Button>
      )}

      {canReplaceStep && (
        <Button
          className="step-toolbar__button"
          data-testid="step-toolbar-button-replace"
          variant="secondary"
          title="Replace step"
          onClick={(event) => {
            onReplaceNode();
            event.stopPropagation();
          }}
        >
          <SyncAltIcon />
        </Button>
      )}

      {onCollapseToggle && (
        <Button
          className="step-toolbar__button"
          data-testid="step-toolbar-button-collapse"
          variant="secondary"
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
          className="step-toolbar__button"
          data-testid="step-toolbar-button-delete"
          variant="danger"
          title="Delete step"
          onClick={(event) => {
            onDeleteStep();
            event.stopPropagation();
          }}
        >
          <TrashIcon />
        </Button>
      )}

      {canRemoveFlow && (
        <Button
          className="step-toolbar__button"
          data-testid="step-toolbar-button-delete-group"
          variant="danger"
          title="Delete group"
          onClick={(event) => {
            onDeleteGroup();
            event.stopPropagation();
          }}
        >
          <TrashIcon />
        </Button>
      )}
    </div>
  );
};
