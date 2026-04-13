import { Icon } from '@patternfly/react-core';
import { ExchangeAltIcon, WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

import { IField } from '../../../../models/datamapper/document';
import { FieldOverrideVariant } from '../../../../models/datamapper/types';
import { getOverrideDisplayInfo } from './override-util';

interface TypeOverrideIndicatorProps {
  field: IField | undefined;
  namespaceMap?: Record<string, string>;
}

/** Icon indicator for a field with an override (type or substitution). Renders nothing if no override. */
export const TypeOverrideIndicator: FunctionComponent<TypeOverrideIndicatorProps> = ({ field, namespaceMap = {} }) => {
  if (!field) return null;

  const displayInfo = getOverrideDisplayInfo(field, namespaceMap);
  if (!displayInfo) return null;

  const isSubstitution = field.typeOverride === FieldOverrideVariant.SUBSTITUTION;
  const title = `${displayInfo.currentLabel}: ${displayInfo.original} \u2192 ${displayInfo.current}`;

  return (
    <Icon
      className="node__spacer node__type-override-indicator"
      size="md"
      status={isSubstitution ? 'info' : 'warning'}
      isInline
      title={title}
    >
      {isSubstitution ? <ExchangeAltIcon /> : <WrenchIcon />}
    </Icon>
  );
};
