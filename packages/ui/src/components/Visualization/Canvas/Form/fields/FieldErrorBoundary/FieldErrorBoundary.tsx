import './FieldErrorBoundary.scss';

import { Accordion, AccordionItem, CodeSnippet, InlineNotification } from '@carbon/react';
import { Component, ReactNode } from 'react';

interface FieldErrorBoundaryProps {
  /** Title of the error notification shown when a child throws */
  title?: string;
  children: ReactNode;
}

interface FieldErrorBoundaryState {
  hasError: boolean;
  error?: unknown;
  isDetailsOpen: boolean;
}

/**
 * Error boundary for custom form fields.
 *
 * It does not include a `Suspense` boundary, each field keeps its own.
 */
export class FieldErrorBoundary extends Component<FieldErrorBoundaryProps, FieldErrorBoundaryState> {
  private static readonly DEFAULT_TITLE = 'Field editor unavailable';

  constructor(props: FieldErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined, isDetailsOpen: false };
  }

  static getDerivedStateFromError(error: unknown): Partial<FieldErrorBoundaryState> {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) return error;
    if (typeof error === 'string') return new Error(error);

    let message: string;
    try {
      message = typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error);
    } catch {
      message = String(error);
    }
    return new Error(message);
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { title = FieldErrorBoundary.DEFAULT_TITLE } = this.props;
    const { isDetailsOpen } = this.state;
    const message = this.normalizeError(this.state.error).message;

    return (
      <>
        <InlineNotification
          className="field-error-notification"
          kind="error"
          lowContrast
          hideCloseButton
          title={title}
          subtitle="Please reload the editor"
          data-testid="error-notification"
        />
        <Accordion className="field-error-details" size="sm" isFlush>
          <AccordionItem
            title={isDetailsOpen ? 'Show less' : 'Show more'}
            open={isDetailsOpen}
            onHeadingClick={({ isOpen }) => {
              this.setState({ isDetailsOpen: isOpen });
            }}
          >
            <CodeSnippet
              className="field-error-details-message"
              type="multi"
              hideCopyButton
              data-testid="error-details-message"
            >
              {message}
            </CodeSnippet>
          </AccordionItem>
        </Accordion>
      </>
    );
  }
}
