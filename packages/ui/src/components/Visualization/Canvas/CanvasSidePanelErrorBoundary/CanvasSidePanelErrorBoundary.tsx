import './CanvasSidePanelErrorBoundary.scss';

import { Close } from '@carbon/icons-react';
import { Accordion, AccordionItem, CodeSnippet, IconButton, InlineNotification } from '@carbon/react';
import { Component, ReactNode } from 'react';

interface CanvasSidePanelErrorBoundaryProps {
  /** Called when the Close button of the fallback is clicked */
  onClose: () => void;
  /** Title shown in the fallback header, when known */
  title?: string;
  /** Title of the error notification shown when a child throws */
  errorTitle?: string;
  children: ReactNode;
}

interface CanvasSidePanelErrorBoundaryState {
  hasError: boolean;
  error?: unknown;
  isDetailsOpen: boolean;
}

/**
 * Error boundary for the canvas side panel (the sidebar and the node form).
 *
 * It owns its fallback: an error notification, the error details and a Close button, so the
 * user can always dismiss the panel. It intentionally does not depend on the shared `ErrorBoundary`.
 */
export class CanvasSidePanelErrorBoundary extends Component<
  CanvasSidePanelErrorBoundaryProps,
  CanvasSidePanelErrorBoundaryState
> {
  private static readonly DEFAULT_ERROR_TITLE = 'Something did not work as expected';

  constructor(props: CanvasSidePanelErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined, isDetailsOpen: false };
  }

  static getDerivedStateFromError(error: unknown): Partial<CanvasSidePanelErrorBoundaryState> {
    return { hasError: true, error };
  }

  private static normalizeError(error: unknown): Error {
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new Error(error);

    if (typeof error === 'object' && error !== null) {
      try {
        return new Error(JSON.stringify(error));
      } catch {
        // e.g. circular references
        return new Error('Unknown error');
      }
    }

    if (typeof error === 'number' || typeof error === 'boolean' || typeof error === 'bigint') {
      return new Error(error.toString());
    }

    return new Error('Unknown error');
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { onClose, title, errorTitle = CanvasSidePanelErrorBoundary.DEFAULT_ERROR_TITLE } = this.props;
    const { isDetailsOpen } = this.state;
    const { message } = CanvasSidePanelErrorBoundary.normalizeError(this.state.error);

    return (
      <div className="canvas-side-panel-error">
        <div className="canvas-side-panel-error-header">
          {title && <span className="canvas-side-panel-error-header__title">{title}</span>}
          <IconButton
            className="canvas-side-panel-error-header__close"
            data-testid="close-side-bar"
            kind="ghost"
            label="Close"
            onClick={onClose}
          >
            <Close />
          </IconButton>
        </div>
        <InlineNotification
          className="canvas-side-panel-error-notification"
          kind="error"
          lowContrast
          hideCloseButton
          title={errorTitle}
          subtitle="Please reload the editor"
          data-testid="error-notification"
        />
        <Accordion className="canvas-side-panel-error-details" size="sm" isFlush>
          <AccordionItem
            title={isDetailsOpen ? 'Show less' : 'Show more'}
            open={isDetailsOpen}
            onHeadingClick={({ isOpen }) => {
              this.setState({ isDetailsOpen: isOpen });
            }}
          >
            <CodeSnippet
              className="canvas-side-panel-error-details-message"
              type="multi"
              hideCopyButton
              data-testid="error-details-message"
            >
              {message}
            </CodeSnippet>
          </AccordionItem>
        </Accordion>
      </div>
    );
  }
}
