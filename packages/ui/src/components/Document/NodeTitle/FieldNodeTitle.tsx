import { NullSign } from '@carbon/icons-react';
import { Label, Popover } from '@patternfly/react-core';
import clsx from 'clsx';
import { FunctionComponent } from 'react';

import OptIcon from '../../../assets/data-mapper/field-icons/OptIcon';
import Repeat0Icon from '../../../assets/data-mapper/field-icons/Repeat0Icon';
import Repeat1Icon from '../../../assets/data-mapper/field-icons/Repeat1Icon';
import {
  AbstractFieldNodeData,
  AddMappingNodeData,
  ChoiceFieldNodeData,
  FieldItemNodeData,
  FieldNodeData,
  TargetAbstractFieldNodeData,
  TargetChoiceFieldNodeData,
} from '../../../models/datamapper/visualization';
import { getOverrideDisplayInfo } from '../actions/FieldOverride/override-util';

type FieldNodeTitleProps = {
  className?: string;
  rank: number;
  title: string;
  nodeData: FieldNodeData | FieldItemNodeData | AddMappingNodeData;
  namespaceMap?: Record<string, string>;
};

export const FieldNodeTitle: FunctionComponent<FieldNodeTitleProps> = ({
  className,
  rank,
  title,
  nodeData,
  namespaceMap = {},
}) => {
  const isChoiceWrapper =
    (nodeData instanceof ChoiceFieldNodeData || nodeData instanceof TargetChoiceFieldNodeData) && !nodeData.choiceField;
  const isAbstractWrapper =
    (nodeData instanceof AbstractFieldNodeData || nodeData instanceof TargetAbstractFieldNodeData) &&
    !nodeData.abstractField;
  const hasNoCandidates = isAbstractWrapper && (nodeData.field.fields ?? []).length === 0;
  const optionalField = nodeData.field.minOccurs === 0;
  const repeatingField0 = nodeData.field.minOccurs >= 0 && nodeData.field.maxOccurs === 'unbounded';
  const repeatingField1 = nodeData.field.minOccurs >= 1 && nodeData.field.maxOccurs === 'unbounded';
  const overrideDisplay = getOverrideDisplayInfo(nodeData.field, namespaceMap);

  return (
    <Popover
      triggerAction="hover"
      position="right"
      aria-label={`Field details for ${title}`}
      bodyContent={
        <div>
          <div className="popover__row">
            <span className="popover__cell">minOccurs :&nbsp;</span>
            <span className="popover__cell">{nodeData.field.minOccurs}</span>
          </div>
          <div className="popover__row">
            <span className="popover__cell">maxOccurs :&nbsp;</span>
            <span className="popover__cell">{nodeData.field.maxOccurs}</span>
          </div>
          {overrideDisplay && (
            <>
              <div className="popover__row">
                <span className="popover__cell">{overrideDisplay.originalLabel} :&nbsp;</span>
                <span className="popover__cell">{overrideDisplay.original}</span>
              </div>
              <div className="popover__row">
                <span className="popover__cell">{overrideDisplay.currentLabel} :&nbsp;</span>
                <span className="popover__cell">{overrideDisplay.current}</span>
              </div>
            </>
          )}
        </div>
      }
    >
      <div className="node-title-container">
        {isChoiceWrapper && <Label>choice</Label>}
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
    </Popover>
  );
};
