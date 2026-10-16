import './Loading.scss';

import { Loading } from '@carbon/react';
import { FunctionComponent } from 'react';

interface LoadingSmallProps {
  description?: string;
}

export const LoadingSmall: FunctionComponent<LoadingSmallProps> = ({ description = 'Loading' }) => {
  return (
    <div className="loading-small">
      <Loading small withOverlay={false} description={description} />
    </div>
  );
};
