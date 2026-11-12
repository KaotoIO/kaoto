import { ArrowsHorizontal, Tools } from '@carbon/icons-react';
import clsx from 'clsx';
import { FunctionComponent } from 'react';

import { IField } from '../../../../models/datamapper/document';
import { FieldOverrideVariant } from '../../../../models/datamapper/types';
import { getOverrideDisplayInfo } from './override-util';

interface OverrideIndicatorProps {
  field: IField | undefined;
  namespaceMap?: Record<string, string>;
}

/** Icon indicator for a field with an override (type or substitution). Renders nothing if no override. */
export const OverrideIndicator: FunctionComponent<OverrideIndicatorProps> = ({ field, namespaceMap = {} }) => {
  if (!field) return null;

  const displayInfo = getOverrideDisplayInfo(field, namespaceMap);
  if (!displayInfo) return null;

  const isSubstitution = field.typeOverride === FieldOverrideVariant.SUBSTITUTION;
  const title = `${displayInfo.currentLabel}: ${displayInfo.original} \u2192 ${displayInfo.current}`;

  return (
    <span
      className={clsx(
        'node__spacer',
        'node__override-indicator',
        isSubstitution ? 'node__override-indicator--substitution' : 'node__override-indicator--type',
      )}
      title={title}
    >
      {isSubstitution ? <ArrowsHorizontal /> : <Tools />}
    </span>
  );
};
