jest.mock('uniforms', () => {
  const uniforms = jest.requireActual('uniforms');

  return {
    ...uniforms,
    connectField: (fn: () => void) => fn,
  };
});
import { render } from '@testing-library/react';
import { DisabledField } from './DisabledField';

describe('DisabledField', () => {
  it('should render', () => {
    const { container } = render(<DisabledField id="disabled-field-id" name="test" label="Disabled field label" />);

    expect(container).toMatchSnapshot();
  });
});
