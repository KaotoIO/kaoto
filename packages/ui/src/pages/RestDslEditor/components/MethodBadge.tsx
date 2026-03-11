import { OperationalTag } from '@carbon/react';
import { FunctionComponent } from 'react';

type MethodBadgeProps = {
  type: string;
};

export const MethodBadge: FunctionComponent<MethodBadgeProps> = ({ type }) => {
  let badgeType = 'gray';

  switch (type) {
    case 'get':
      badgeType = 'blue';
      break;
    case 'post':
      badgeType = 'cyan';
      break;
    case 'put':
      badgeType = 'green';
      break;
    case 'delete':
      badgeType = 'red';
      break;
    default:
      break;
  }

  return <OperationalTag size="md" text={type.toUpperCase()} type={badgeType} />;
};
