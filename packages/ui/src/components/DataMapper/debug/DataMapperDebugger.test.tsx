import { DataMapperDebugger } from './DataMapperDebugger';
import { render, screen } from '@testing-library/react';

describe('Debug', () => {
  it('should render', async () => {
    render(<DataMapperDebugger />);
    await screen.findByTestId('main-menu-button');
  });
});
