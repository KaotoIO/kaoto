import './Loading.scss';

import { InlineLoading } from '@carbon/react';
import { FunctionComponent, ReactNode } from 'react';

interface LoadingInlineProps {
  description?: ReactNode;
  iconDescription?: string;
}

export const LoadingInline: FunctionComponent<LoadingInlineProps> = ({ description, iconDescription = 'Loading' }) => {
  return (
    <div className="loading-inline">
      <InlineLoading description={description} iconDescription={iconDescription} />
    </div>
  );
};
