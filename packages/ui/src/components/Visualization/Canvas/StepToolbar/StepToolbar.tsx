import './StepToolbar.scss';

import { Button } from '@patternfly/react-core';
import {
  AngleDoubleDownIcon,
  AngleDoubleUpIcon,
  BanIcon,
  BlueprintIcon,
  CheckIcon,
  CodeBranchIcon,
  CompressArrowsAltIcon,
  ExpandArrowsAltIcon,
  PowerOffIcon,
  SyncAltIcon,
  TrashIcon,
} from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent, useContext } from 'react';

import { AddStepMode, IDataTestID, IVisualizationNode } from '../../../../models';
import { SettingsContext } from '../../../../providers/settings.provider';
import { useDeleteGroup } from '../../Custom/hooks/delete-group.hook';
import { useDeleteStep } from '../../Custom/hooks/delete-step.hook';
import { useDisableStep } from '../../Custom/hooks/disable-step.hook';
import { useDuplicateStep } from '../../Custom/hooks/duplicate-step.hook';
import { useEnableAllSteps } from '../../Custom/hooks/enable-all-steps.hook';
import { useInsertStep } from '../../Custom/hooks/insert-step.hook';
import { useMoveStep } from '../../Custom/hooks/move-step.hook';
import { useReplaceStep } from '../../Custom/hooks/replace-step.hook';

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
  const settingsAdapter = useContext(SettingsContext);
  const { canHaveSpecialChildren, canBeDisabled, canReplaceStep, canRemoveStep, canRemoveFlow } =
    vizNode.getNodeInteraction();
  const label = vizNode?.getNodeLabel(settingsAdapter.getSettings().nodeLabel);
  const { onInsertStep: onInsertSpecial } = useInsertStep(vizNode, AddStepMode.InsertSpecialChildStep);
  const { onToggleDisableNode, isDisabled } = useDisableStep(vizNode);
  const { areMultipleStepsDisabled, onEnableAllSteps } = useEnableAllSteps();
  const { onReplaceNode } = useReplaceStep(vizNode);
  const { onDeleteStep } = useDeleteStep(vizNode);
  const { onDeleteGroup } = useDeleteGroup(vizNode);
  const { canDuplicate, onDuplicate } = useDuplicateStep(vizNode);
  const { canBeMoved: canMoveBefore, onMoveStep: onMoveBefore } = useMoveStep(vizNode, AddStepMode.PrependStep);
  const { canBeMoved: canMoveAfter, onMoveStep: onMoveAfter } = useMoveStep(vizNode, AddStepMode.AppendStep);

  return (
    <div className="step-toolbar-wrapper">
      <div className={clsx(className, 'step-toolbar')} data-testid={dataTestId}>
        {canDuplicate && (
          <Button
            icon={<BlueprintIcon />}
            className="step-toolbar__button"
            data-testid={`${label}|step-toolbar-button-duplicate`}
            variant="control"
            title="Duplicate"
            onClick={(event) => {
              onDuplicate();
              event.stopPropagation();
            }}
          />
        )}

        {canMoveBefore && (
          <Button
            icon={<AngleDoubleUpIcon />}
            className="step-toolbar__button"
            data-testid={`${label}|step-toolbar-button-move-before`}
            variant="control"
            title="Move before"
            onClick={(event) => {
              onMoveBefore();
              event.stopPropagation();
            }}
          />
        )}

        {canMoveAfter && (
          <Button
            icon={<AngleDoubleDownIcon />}
            className="step-toolbar__button"
            data-testid={`${label}|step-toolbar-button-move-after`}
            variant="control"
            title="Move after"
            onClick={(event) => {
              onMoveAfter();
              event.stopPropagation();
            }}
          />
        )}

        {canHaveSpecialChildren && (
          <Button
            icon={<CodeBranchIcon />}
            className="step-toolbar__button"
            data-testid={`${label}|step-toolbar-button-add-special`}
            variant="control"
            title="Add branch"
            onClick={(event) => {
              onInsertSpecial();
              event.stopPropagation();
            }}
          />
        )}

        {canBeDisabled && (
          <Button
            className="step-toolbar__button"
            data-testid={`${label}|step-toolbar-button-disable`}
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
            data-testid={`${label}|step-toolbar-button-enable-all`}
            variant="control"
            title="Enable all"
            onClick={(event) => {
              onEnableAllSteps();
              event.stopPropagation();
            }}
          />
        )}

        {canReplaceStep && (
          <Button
            icon={<SyncAltIcon />}
            className="step-toolbar__button"
            data-testid={`${label}|step-toolbar-button-replace`}
            variant="control"
            title="Replace step"
            onClick={(event) => {
              onReplaceNode();
              event.stopPropagation();
            }}
          />
        )}

        {onCollapseToggle && (
          <Button
            className="step-toolbar__button"
            data-testid={`${label}|step-toolbar-button-collapse`}
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
            data-testid={`${label}|step-toolbar-button-delete`}
            variant="stateful"
            state="attention"
            title="Delete step"
            onClick={(event) => {
              onDeleteStep();
              event.stopPropagation();
            }}
          />
        )}

        {canRemoveFlow && (
          <Button
            icon={<TrashIcon />}
            className="step-toolbar__button"
            data-testid={`${label}|step-toolbar-button-delete-group`}
            variant="stateful"
            state="attention"
            title="Delete group"
            onClick={(event) => {
              onDeleteGroup();
              event.stopPropagation();
            }}
          />
        )}
      </div>
    </div>
  );
};
