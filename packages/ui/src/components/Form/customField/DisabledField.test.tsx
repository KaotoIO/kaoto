jest.mock('uniforms', () => {
  const uniforms = jest.requireActual('uniforms');

  return {
    ...uniforms,
    connectField: (fn: () => void) => fn,
  };
});
import { render } from '@testing-library/react';
import { DisabledField } from './DisabledField';

describe('DisabledStep', () => {
  it('should render', () => {
    const { container } = render(<DisabledField name="test" label="Disabled field label" />);

    expect(container).toMatchSnapshot();
  });
});
