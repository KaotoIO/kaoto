/* eslint-disable @typescript-eslint/no-explicit-any */
import { ExpandableSection } from '@patternfly/react-core';
import { Component, ReactNode } from 'react';

interface ErrorBoundaryProps {
  fallback: ReactNode;
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  isExpanded: boolean;
  error?: any;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, isExpanded: false, error: undefined };
    this.onToggle = this.onToggle.bind(this);
  }

  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  onToggle(_event: unknown, _isExpanded: boolean): void {
    this.setState({ isExpanded: !this.state.isExpanded });
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
      // You can render any custom fallback UI
      return (
        <>
          {this.props.fallback}
          <ExpandableSection
            toggleText={this.state.isExpanded ? 'Show less' : 'Show more'}
            toggleId="error-boundary-expandable-section-toggle"
            contentId="expandable-section-content"
            onToggle={this.onToggle}
            isExpanded={this.state.isExpanded}
          >
            {this.state.error?.message}
          </ExpandableSection>
        </>
      );
    }

    return this.props.children;
  }
}
