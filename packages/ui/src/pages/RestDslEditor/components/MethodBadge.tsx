import './MethodBadge.scss';

import { Tag } from '@carbon/react';
import { FunctionComponent } from 'react';

type MethodBadgeProps = {
  /** The HTTP method type (get, post, put, delete, patch, head) */
  type: string;
};

/**
 * Displays a colored badge for HTTP method types.
 * Each method type is assigned a specific color for visual distinction.
 * The badge is purely decorative, so it renders a non-interactive Tag that
 * doesn't receive keyboard focus.
 */
export const MethodBadge: FunctionComponent<MethodBadgeProps> = ({ type }) => {
  let badgeType: 'blue' | 'cyan' | 'green' | 'red' | 'teal' | 'gray' = 'gray';

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
    case 'head':
      badgeType = 'teal';
      break;
    default:
      break;
  }

  return (
    <div className="method-badge">
      <Tag size="md" type={badgeType}>
        {type.toUpperCase()}
      </Tag>
    </div>
  );
};
