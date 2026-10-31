import { Checkmark, NullSign } from '@carbon/icons-react';
import { Label, Tooltip } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent, ReactElement } from 'react';

import OptIcon from '../../../assets/data-mapper/field-icons/OptIcon';
import Repeat0Icon from '../../../assets/data-mapper/field-icons/Repeat0Icon';
import Repeat1Icon from '../../../assets/data-mapper/field-icons/Repeat1Icon';
import { IfItem } from '../../../models/datamapper/mapping';
import { AddMappingNodeData, FieldItemNodeData, FieldNodeData } from '../../../models/datamapper/visualization';
import { VisualizationUtilService } from '../../../services/visualization/visualization-util.service';
import { getOptionalGuardExplanation, OPTIONAL_GUARD_LABEL } from '../FieldNodePopover/field-details-utils';

type FieldNodeTitleProps = {
  className?: string;
  rank: number;
  title: string;
  nodeData: FieldNodeData | FieldItemNodeData | AddMappingNodeData;
};

type GuardTooltipProps = {
  guard?: IfItem;
  children: ReactElement;
};

/**
 * Explains a see-through optional guard on hover over its field's occurrence badge. Source rows and
 * unguarded fields get the bare badge. The field details popover shows the same explanation to
 * keyboard users.
 */
const GuardTooltip: FunctionComponent<GuardTooltipProps> = ({ guard, children }) => {
  if (!guard) return children;
  return (
    <Tooltip
      content={
        <>
          <strong>{OPTIONAL_GUARD_LABEL}:</strong> {getOptionalGuardExplanation(guard.expression)}
        </>
      }
      isContentLeftAligned
    >
      {children}
    </Tooltip>
  );
};

export const FieldNodeTitle: FunctionComponent<FieldNodeTitleProps> = ({ className, rank, title, nodeData }) => {
  const isChoiceWrapper = VisualizationUtilService.isUnselectedChoiceField(nodeData);
  const isSelectedChoiceWrapper = VisualizationUtilService.isSelectedNestedChoice(nodeData);
  const isAbstractWrapper = VisualizationUtilService.isUnselectedAbstractField(nodeData);
  const isSequenceWrapper = VisualizationUtilService.isSequenceNode(nodeData);
  const hasNoCandidates = isAbstractWrapper && (nodeData.field.fields ?? []).length === 0;
  const optionalField = nodeData.field.minOccurs === 0;
  const repeatingField0 = nodeData.field.minOccurs >= 0 && nodeData.field.maxOccurs === 'unbounded';
  const repeatingField1 = nodeData.field.minOccurs >= 1 && nodeData.field.maxOccurs === 'unbounded';
  const optionalGuard = nodeData instanceof FieldItemNodeData ? nodeData.autoOptionalIfItem : undefined;
  const occurrenceMarkerClassName = clsx('node__spacer datamapper-marker-field', {
    'datamapper-marker-field--active-guard': optionalGuard !== undefined,
  });

  const inlineCopyOf = VisualizationUtilService.getInlineContainerCopyOf(nodeData);

  return (
    <div className={clsx('node-title-container', { 'node-title-container__abstract': isAbstractWrapper })}>
      {inlineCopyOf && <Label data-testid="field-copy-of-label">{inlineCopyOf.name}</Label>}
      {isChoiceWrapper && <Label>choice</Label>}
      {isSelectedChoiceWrapper && (
        <Label color="green" icon={<Checkmark />}>
          choice
        </Label>
      )}
      {isAbstractWrapper && (
        <Label color={hasNoCandidates ? 'red' : undefined}>
          {hasNoCandidates ? 'abstract (no candidates)' : 'abstract'}
        </Label>
      )}
      {isSequenceWrapper && <Label>sequence</Label>}
      {!isSequenceWrapper && (
        <span
          className={clsx(
            'node-title__text',
            isChoiceWrapper && 'node-title__text__choice',
            isAbstractWrapper && 'node-title__text__abstract',
            className,
          )}
          data-rank={rank}
        >
          {title}
        </span>
      )}
      {optionalField && !repeatingField0 && (
        <GuardTooltip guard={optionalGuard}>
          <OptIcon
            className={occurrenceMarkerClassName}
            role="img"
            aria-label={optionalGuard ? 'Optional, written only when its source exists' : 'Optional'}
          />
        </GuardTooltip>
      )}
      {repeatingField0 && !repeatingField1 && (
        <GuardTooltip guard={optionalGuard}>
          <Repeat0Icon
            className={occurrenceMarkerClassName}
            role="img"
            aria-label={optionalGuard ? 'Repeating, optional, written only when its source exists' : 'Repeat0'}
          />
        </GuardTooltip>
      )}
      {repeatingField1 && (
        <Repeat1Icon className="node__spacer datamapper-marker-field" role="img" aria-label="Repeat1" />
      )}
      {nodeData.field.nillable && <NullSign className="node__spacer datamapper-marker-field" aria-label="Nullable" />}
    </div>
  );
};
