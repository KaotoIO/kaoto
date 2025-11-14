import { Icon } from '@patternfly/react-core';
import { WrenchIcon } from '@patternfly/react-icons';
import { FunctionComponent } from 'react';

export interface IOverrideBadgeProps {
  originalType?: string;
  overriddenType?: string;
}

export const OverrideBadge: FunctionComponent<IOverrideBadgeProps> = ({ originalType, overriddenType }) => {
  return (
    <Icon
      size="sm"
      status="warning"
      isInline
      style={{ marginLeft: '4px', color: 'var(--pf-v6-global--warning-color--100)' }}
    >
      <WrenchIcon title={`Type overridden: ${originalType} → ${overriddenType}`} />
    </Icon>
  );
};
