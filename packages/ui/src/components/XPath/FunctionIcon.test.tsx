import { render, screen } from '@testing-library/react';

import { FunctionIcon } from './FunctionIcon';

describe('FunctionIcon', () => {
  it('should render', () => {
    render(<FunctionIcon />);
    expect(screen.getByText('(x)')).toBeTruthy();
  });
});
