import { render } from '@testing-library/react';
import { DisabledField } from './DisabledField';

describe('DisabledField', () => {
  it('should render', () => {
    const { container } = render(<DisabledField data-testid="disabled-field-id" propName="test" />);

    expect(container).toMatchSnapshot();
  });
});
