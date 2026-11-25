import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { LoadingState } from './LoadingState';

describe('LoadingState', () => {
  it('should render a spinner with default description', () => {
    render(<LoadingState />);

    expect(screen.getByRole('img', { name: 'Loading' })).toBeInTheDocument();
  });

  it('should render a spinner with custom description', () => {
    render(<LoadingState description="Fetching data" />);

    expect(screen.getByRole('img', { name: 'Fetching data' })).toBeInTheDocument();
  });

  it('should render children next to the spinner', () => {
    render(<LoadingState>Loading content</LoadingState>);

    expect(screen.getByText('Loading content')).toBeVisible();
    expect(screen.getByRole('img', { name: 'Loading' })).toBeVisible();
  });

  it('should not cover the page with a dialog by default', () => {
    render(<LoadingState />);

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should keep the description and children when `small` is set', () => {
    render(
      <LoadingState small description="Fetching data">
        Loading content
      </LoadingState>,
    );

    expect(screen.getByRole('img', { name: 'Fetching data' })).toBeInTheDocument();
    expect(screen.getByText('Loading content')).toBeInTheDocument();
  });

  it('should keep the description and children when `fullPage` is set', () => {
    render(
      <LoadingState fullPage description="Fetching data">
        Loading content
      </LoadingState>,
    );

    expect(screen.getByRole('img', { name: 'Fetching data' })).toBeInTheDocument();
    expect(screen.getByText('Loading content')).toBeInTheDocument();
  });

  describe('withOverlay', () => {
    it('should cover the page with a dialog named after the description', () => {
      render(<LoadingState withOverlay description="Fetching data" />);

      expect(screen.getByRole('dialog', { name: 'Fetching data' })).toBeInTheDocument();
    });

    it('should render the spinner with the description', () => {
      render(<LoadingState withOverlay description="Fetching data" />);

      expect(screen.getByRole('img', { name: 'Fetching data' })).toBeInTheDocument();
    });

    it('should not render the children', () => {
      render(<LoadingState withOverlay>Loading content</LoadingState>);

      expect(screen.queryByText('Loading content')).not.toBeInTheDocument();
    });

    it('should render the `data-testid` around the spinner', () => {
      render(<LoadingState withOverlay data-testid="loading-test" />);

      expect(within(screen.getByTestId('loading-test')).getByRole('img', { name: 'Loading' })).toBeInTheDocument();
    });
  });

  it('should render the `data-testid` around the spinner and the children', () => {
    render(<LoadingState data-testid="loading-test">Loading content</LoadingState>);

    const wrapper = screen.getByTestId('loading-test');

    expect(within(wrapper).getByRole('img', { name: 'Loading' })).toBeInTheDocument();
    expect(within(wrapper).getByText('Loading content')).toBeInTheDocument();
  });

  it('should render the `data-testid` around the spinner when there are no children', () => {
    render(<LoadingState data-testid="loading-test" />);

    expect(within(screen.getByTestId('loading-test')).getByRole('img', { name: 'Loading' })).toBeInTheDocument();
  });
});
