import { render, screen } from '@testing-library/react';

import { DataMapperDebugger } from './DataMapperDebugger';

describe('Debug', () => {
  it('should render', async () => {
    const mockLog = jest.fn();
    console.log = mockLog;
    render(<DataMapperDebugger />);
    await screen.findByTestId('dm-debug-main-menu-button');
    const nodeRefsLog = mockLog.mock.calls.filter((call) => call[0].startsWith('Node References: ['));
    expect(nodeRefsLog.length).toBeGreaterThan(0);
  });
});
