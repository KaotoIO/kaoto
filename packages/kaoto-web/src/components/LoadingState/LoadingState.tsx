import './LoadingState.scss';

import { Loading as CarbonLoading } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';

interface LoadingStateProps {
  description?: string;
  /** Center the spinner in the viewport, for loaders that replace the whole page */
  fullPage?: boolean;
  /** Render the small Carbon spinner */
  small?: boolean;
  /**
   * Cover the screen with Carbon's fixed, dimmed overlay and center the spinner in it. Use it for loaders rendered
   * outside the page layout, e.g. in a portal. `children` are not rendered in this mode.
   */
  withOverlay?: boolean;
  /**
   * Test id of the element wrapping the spinner and the message. With `withOverlay` it is
   * set on Carbon's spinner element, since the overlay renders no wrapper of its own.
   */
  'data-testid'?: string;
}

/**
 * Carbon spinner with an optional message. Twin of `Loading` in `packages/ui/src/components/Loading`, which this
 * package does not import on purpose: keep the markup and the styles of both in sync.
 */
export const LoadingState: FunctionComponent<PropsWithChildren<LoadingStateProps>> = ({
  description = 'Loading',
  fullPage = false,
  small = false,
  withOverlay = false,
  'data-testid': dataTestId,
  children,
}) => {
  if (withOverlay) {
    return <CarbonLoading description={description} withOverlay data-testid={dataTestId} />;
  }

  return (
    <div className={fullPage ? 'loading loading--full-page' : 'loading'} data-testid={dataTestId}>
      <CarbonLoading small={small} description={description} withOverlay={false} />
      {children ? <p className="loading__message">{children}</p> : null}
    </div>
  );
};
