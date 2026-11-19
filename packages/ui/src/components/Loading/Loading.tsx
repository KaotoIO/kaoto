import './Loading.scss';

import { Loading as CarbonLoading } from '@carbon/react';
import { FunctionComponent, PropsWithChildren } from 'react';

interface LoadingProps {
  description?: string;
  /** Center the spinner in the viewport, for loaders that replace the whole editor */
  fullPage?: boolean;
  /** Test id of the message rendered next to the spinner */
  'data-testid'?: string;
}

/**
 * Carbon spinner with an optional message. The VS Code webview shell (`webview.html`, which the extension also
 * ships as `kaoto-editor.html`) draws the same markup with Carbon tokens before the editor starts, so keep both in
 * sync.
 */
export const Loading: FunctionComponent<PropsWithChildren<LoadingProps>> = ({
  description = 'Loading',
  fullPage = false,
  'data-testid': dataTestId,
  children,
}) => {
  return (
    <div className={fullPage ? 'loading loading--full-page' : 'loading'}>
      <CarbonLoading description={description} withOverlay={false} />
      {children ? (
        <div className="loading__message" data-testid={dataTestId}>
          {children}
        </div>
      ) : null}
    </div>
  );
};
