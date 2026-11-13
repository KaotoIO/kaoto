import './Loading.scss';

import { Loading as CarbonLoading } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';

interface LoadingProps {
  description?: string;
  /** Center the spinner in the viewport, for loaders that replace the whole editor */
  fullPage?: boolean;
}

export const Loading: FunctionComponent<PropsWithChildren<LoadingProps>> = ({
  description = 'Loading',
  fullPage = false,
  children,
}) => {
  return (
    <div className={fullPage ? 'loading loading--full-page' : 'loading'}>
      <CarbonLoading description={description} withOverlay={false} />
      {children}
    </div>
  );
};
