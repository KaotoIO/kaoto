import { act, fireEvent, render } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';
import { useState } from 'react';

describe('ErrorBoundary', () => {
  beforeAll(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterAll(() => {
    jest.restoreAllMocks();
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

    act(() => {
      const button = wrapper.getByRole('button');
      expect(button).toBeDefined();
      fireEvent.click(button);
    });

    expect(wrapper.getByText('fallback')).toBeDefined();
  });
});
