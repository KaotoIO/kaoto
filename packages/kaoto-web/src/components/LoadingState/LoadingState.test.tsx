import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingState } from './LoadingState';

describe('LoadingState', () => {
  it('should render with default message', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render with custom message', () => {
    render(<LoadingState message="Loading data..." />);
    expect(screen.getByText('Loading data...')).toBeInTheDocument();
  });

  it('should apply overlay class when withOverlay is true', () => {
    const { container } = render(<LoadingState withOverlay />);
    const loadingState = container.querySelector('.cs--loading-state--overlay');
    expect(loadingState).toBeInTheDocument();
  });

  it('should not apply overlay class when withOverlay is false', () => {
    const { container } = render(<LoadingState withOverlay={false} />);
    const loadingState = container.querySelector('.cs--loading-state--overlay');
    expect(loadingState).not.toBeInTheDocument();
  });

  it('should not apply overlay class by default', () => {
    const { container } = render(<LoadingState />);
    const loadingState = container.querySelector('.cs--loading-state--overlay');
    expect(loadingState).not.toBeInTheDocument();
  });

  it('should render Carbon Loading component', () => {
    const { container } = render(<LoadingState />);
    const loading = container.querySelector('.cds--loading');
    expect(loading).toBeInTheDocument();
  });

  it('should pass small prop to Loading component', () => {
    const { container } = render(<LoadingState small />);
    const loading = container.querySelector('.cds--loading--small');
    expect(loading).toBeInTheDocument();
  });

  it('should not use small size by default', () => {
    const { container } = render(<LoadingState />);
    const loading = container.querySelector('.cds--loading--small');
    expect(loading).not.toBeInTheDocument();
  });

  it('should apply custom class name', () => {
    const { container } = render(<LoadingState />);
    const loadingState = container.querySelector('.cs--loading-state');
    expect(loadingState).toBeInTheDocument();
  });

  it('should render with all props combined', () => {
    const { container } = render(<LoadingState message="Processing request..." withOverlay small />);

    expect(screen.getByText('Processing request...')).toBeInTheDocument();
    expect(container.querySelector('.cs--loading-state--overlay')).toBeInTheDocument();
    expect(container.querySelector('.cds--loading--small')).toBeInTheDocument();
  });
});

// Made with Bob
