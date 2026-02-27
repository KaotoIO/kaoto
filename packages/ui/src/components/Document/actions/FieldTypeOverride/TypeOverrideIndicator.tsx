import { Icon } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

import { IField } from '../../../../models/datamapper/document';
import { FieldOverrideVariant } from '../../../../models/datamapper/types';
import { formatQNameWithPrefix } from '../../../../services/qname-util';

interface TypeOverrideIndicatorProps {
  field: IField | undefined;
  namespaceMap?: Record<string, string>;
}

/** Wrench icon indicator for a field with a type override. Renders nothing if no override. */
export const TypeOverrideIndicator: FunctionComponent<TypeOverrideIndicatorProps> = ({ field, namespaceMap = {} }) => {
  if (!field || field.typeOverride === FieldOverrideVariant.NONE) return null;
  const originalDisplay = formatQNameWithPrefix(
    field.originalField?.typeQName,
    namespaceMap,
    field.originalField?.type,
  );
  const currentDisplay = formatQNameWithPrefix(field.typeQName, namespaceMap, field.type);
  return (
    <Icon
      className="node__spacer node__type-override-indicator"
      size="md"
      status="warning"
      isInline
      title={`Type overridden: ${originalDisplay} → ${currentDisplay}`}
    >
      <WrenchIcon />
    </Icon>
  );
};
