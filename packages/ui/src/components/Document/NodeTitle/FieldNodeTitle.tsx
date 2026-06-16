import { NullSign } from '@carbon/icons-react';
import { Label } from '@patternfly/react-core';
import { CheckIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { FunctionComponent } from 'react';

import OptIcon from '../../../assets/data-mapper/field-icons/OptIcon';
import Repeat0Icon from '../../../assets/data-mapper/field-icons/Repeat0Icon';
import Repeat1Icon from '../../../assets/data-mapper/field-icons/Repeat1Icon';
import { AddMappingNodeData, FieldItemNodeData, FieldNodeData } from '../../../models/datamapper/visualization';
import { VisualizationUtilService } from '../../../services/visualization/visualization-util.service';

type FieldNodeTitleProps = {
  className?: string;
  rank: number;
  title: string;
  nodeData: FieldNodeData | FieldItemNodeData | AddMappingNodeData;
};

export const FieldNodeTitle: FunctionComponent<FieldNodeTitleProps> = ({ className, rank, title, nodeData }) => {
  const isChoiceWrapper = VisualizationUtilService.isUnselectedChoiceField(nodeData);
  const isSelectedChoiceWrapper = VisualizationUtilService.isSelectedNestedChoice(nodeData);
  const isAbstractWrapper = VisualizationUtilService.isUnselectedAbstractField(nodeData);
  const hasNoCandidates = isAbstractWrapper && (nodeData.field.fields ?? []).length === 0;
  const optionalField = nodeData.field.minOccurs === 0;
  const repeatingField0 = nodeData.field.minOccurs >= 0 && nodeData.field.maxOccurs === 'unbounded';
  const repeatingField1 = nodeData.field.minOccurs >= 1 && nodeData.field.maxOccurs === 'unbounded';

  return (
    <div className={clsx('node-title-container', { 'node-title-container__abstract': isAbstractWrapper })}>
      {isChoiceWrapper && <Label>choice</Label>}
      {isSelectedChoiceWrapper && (
        <Label color="green" icon={<CheckIcon />}>
          choice
        </Label>
      )}
      {isAbstractWrapper && (
        <Label color={hasNoCandidates ? 'red' : undefined}>
          {hasNoCandidates ? 'abstract (no candidates)' : 'abstract'}
        </Label>
      )}
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
      {optionalField && !repeatingField0 && (
        <OptIcon className="node__spacer datamapper-marker-field" aria-label="Optional" />
      )}
      {repeatingField0 && !repeatingField1 && (
        <Repeat0Icon className="node__spacer datamapper-marker-field" aria-label="Repeat0" />
      )}
      {repeatingField1 && <Repeat1Icon className="node__spacer datamapper-marker-field" aria-label="Repeat1" />}
      {nodeData.field.nillable && <NullSign className="node__spacer datamapper-marker-field" aria-label="Nullable" />}
    </div>
  );
};
