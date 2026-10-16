import './Loading.scss';

import { Loading as CarbonLoading } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';

interface LoadingProps {
  description?: string;
}

export const Loading: FunctionComponent<PropsWithChildren<LoadingProps>> = ({ description = 'Loading', children }) => {
  return (
    <div className="loading">
      <CarbonLoading description={description} withOverlay={false} />
      {children}
    </div>
  );
};
