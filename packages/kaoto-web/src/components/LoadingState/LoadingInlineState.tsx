import './LoadingState.scss';

import { InlineLoading } from '@carbon/react';
import { FunctionComponent, ReactNode } from 'react';

interface LoadingInlineStateProps {
  description?: ReactNode;
  iconDescription?: string;
  /** Fit the loader in a tight space, e.g. the icon slot of a button, without growing the element hosting it */
  compact?: boolean;
}

/**
 * Carbon inline spinner with an optional message. Twin of `LoadingInline` in `packages/ui/src/components/Loading`,
 * which this package does not import on purpose: keep the markup and the styles of both in sync.
 */
export const LoadingInlineState: FunctionComponent<LoadingInlineStateProps> = ({
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
