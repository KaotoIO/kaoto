import { fireEvent, render } from '@testing-library/react';
import { useState } from 'react';

import { ErrorBoundary } from './ErrorBoundary';

describe('ErrorBoundary', () => {
  beforeAll(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    vi.restoreAllMocks();
  });

  const MockComponent = () => {
    const [holder, setHolder] = useState({ prop: 'value' });

    const goBoom = () => {
      setHolder(null as unknown as { prop: string });
    };

    return (
      <>
        <button onClick={goBoom}>Click to boom the app</button>
        <div>{holder.prop.toUpperCase()}</div>
      </>
    );
  };

  it('should render without crashing', () => {
    const wrapper = render(<MockComponent />);
    expect(wrapper).toBeDefined();
  });

  it('should render fallback when error is thrown', () => {
    const wrapper = render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <MockComponent />
      </ErrorBoundary>,
    );

    const button = wrapper.getByRole('button');
    expect(button).toBeDefined();
    fireEvent.click(button);

    expect(wrapper.getByText('fallback')).toBeDefined();
  });

  it('should render the error details with a Show more/Show less toggle', () => {
    const wrapper = render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <MockComponent />
      </ErrorBoundary>,
    );

    fireEvent.click(wrapper.getByRole('button', { name: /Click to boom the app/ }));

    const toggleButton = wrapper.getByRole('button', { name: /Show more/ });
    expect(toggleButton).toBeInTheDocument();
    expect(wrapper.getByTestId('error-details-message')).toHaveTextContent(/Cannot read properties of null/);

    fireEvent.click(toggleButton);

    expect(wrapper.getByRole('button', { name: /Show less/ })).toBeInTheDocument();
  });

  it('should preserve a thrown string as the error message', () => {
    const Thrower = () => {
      throw 'plain string failure';
    };
    const wrapper = render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <Thrower />
      </ErrorBoundary>,
    );

    expect(wrapper.getByTestId('error-details-message')).toHaveTextContent('plain string failure');
  });

  it('should pass a normalized Error to the function fallback when a non-Error is thrown', () => {
    const Thrower = () => {
      throw { code: 42 };
    };
    const fallback = vi.fn((error: Error) => <div>custom: {error.message}</div>);
    render(
      <ErrorBoundary fallback={fallback}>
        <Thrower />
      </ErrorBoundary>,
    );

    const received = fallback.mock.calls[0][0];
    expect(received).toBeInstanceOf(Error);
    expect(received.message).toBe('{"code":42}');
  });

  it('should render only what the function fallback returns', () => {
    const fallback = vi.fn((error: Error) => <div>custom: {error.message}</div>);
    const wrapper = render(
      <ErrorBoundary fallback={fallback}>
        <MockComponent />
      </ErrorBoundary>,
    );

    fireEvent.click(wrapper.getByRole('button', { name: /Click to boom the app/ }));

    expect(fallback).toHaveBeenCalled();
    expect(wrapper.getByText(/custom:/)).toBeInTheDocument();
    expect(wrapper.queryByRole('button', { name: /Show more/ })).not.toBeInTheDocument();
  });
});
