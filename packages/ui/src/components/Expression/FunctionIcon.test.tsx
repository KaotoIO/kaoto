import { FunctionIcon } from './FunctionIcon';
import { render, screen } from '@testing-library/react';

describe('FunctionIcon', () => {
  it('should render', () => {
    render(<FunctionIcon />);
    expect(screen.getByText('(x)')).toBeTruthy();
  });
});
