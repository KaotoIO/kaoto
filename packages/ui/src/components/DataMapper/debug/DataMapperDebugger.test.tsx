import { DataMapperDebugger } from './DataMapperDebugger';
import { render, screen } from '@testing-library/react';

describe('Debug', () => {
  it('should render', async () => {
    const mockLog = jest.fn();
    console.log = mockLog;
    render(<DataMapperDebugger />);
    await screen.findByTestId('main-menu-button');
    const nodeRefsLog = mockLog.mock.calls.filter((call) => call[0].startsWith('Node References: ['));
    expect(nodeRefsLog.length).toBeGreaterThan(0);
  });
});
