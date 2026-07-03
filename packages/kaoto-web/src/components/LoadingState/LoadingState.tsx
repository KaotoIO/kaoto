import './LoadingState.scss';

import { Loading } from '@carbon/react';

interface LoadingStateProps {
  message?: string;
  withOverlay?: boolean;
  small?: boolean;
}

export const LoadingState = ({ message = 'Loading...', withOverlay = false, small = false }: LoadingStateProps) => {
  return (
    <div className={`cs--loading-state ${withOverlay ? 'cs--loading-state--overlay' : ''}`}>
      <Loading description={message} withOverlay={withOverlay} small={small} />
    </div>
  );
};

// Made with Bob
