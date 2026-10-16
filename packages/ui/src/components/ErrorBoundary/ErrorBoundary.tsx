/* eslint-disable @typescript-eslint/no-explicit-any */
import { Component, ReactNode } from 'react';

import { ErrorDetails } from '../ErrorFallbacks/ErrorDetails';

interface ErrorBoundaryProps {
  fallback: ReactNode | ((error: Error) => ReactNode);
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: any;
}

const normalizeError = (error: unknown): Error => {
  if (error instanceof Error) return error;
  if (typeof error === 'string') return new Error(error);

  let message: string;
  try {
    message = typeof error === 'object' && error !== null ? JSON.stringify(error) : String(error);
  } catch {
    message = String(error);
  }
  return new Error(message);
};

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: undefined };
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  componentDidCatch(_error: any, _info: any): void {
    // Example "componentStack":
    //   in ComponentThatThrows (created by App)
    //   in ErrorBoundary (created by App)
    //   in div (created by App)
    //   in App
    // logErrorToMyService(error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      const { fallback } = this.props;
      const error = normalizeError(this.state.error);

      if (typeof fallback === 'function') {
        return fallback(error);
      }

      return (
        <>
          {fallback}
          <ErrorDetails message={error.message} />
        </>
      );
    }

    return this.props.children;
  }
}
