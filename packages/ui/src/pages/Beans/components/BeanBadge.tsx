import './BeanBadge.scss';

import { Tag } from '@carbon/react';
import { FunctionComponent } from 'react';

type BeanBadgeProps = {
  /** The bean name */
  name: string;
};

/**
 * Displays the bean name as a badge in front of the tree node label.
 * The badge is purely decorative, so it renders a non-interactive Tag that
 * doesn't receive keyboard focus.
 */
export const BeanBadge: FunctionComponent<BeanBadgeProps> = ({ name }) => {
  return (
    <div className="bean-badge">
      <Tag size="md" type="purple">
        {name}
      </Tag>
    </div>
  );
};
