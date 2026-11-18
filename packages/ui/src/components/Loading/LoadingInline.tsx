import './Loading.scss';

import { InlineLoading } from '@carbon/react';
import { FunctionComponent, ReactNode } from 'react';

interface LoadingInlineProps {
  description?: ReactNode;
  iconDescription?: string;
  /** Fit the loader in a tight space, e.g. the icon slot of a button, without growing the element hosting it */
  compact?: boolean;
}

export const LoadingInline: FunctionComponent<LoadingInlineProps> = ({
  description,
  iconDescription = 'Loading',
  compact = false,
}) => {
  return (
    <div className={compact ? 'loading-inline loading-inline--compact' : 'loading-inline'}>
      <InlineLoading description={description} iconDescription={iconDescription} />
    </div>
  );
};
