import { render, screen } from '@testing-library/react';

import { DataMapperDebugger } from './DataMapperDebugger';

describe('Debug', () => {
  it('should render and log connection ports', async () => {
    const mockDebug = jest.fn();
    console.debug = mockDebug;
    render(<DataMapperDebugger />);
    await screen.findByTestId('dm-debug-main-menu-button');
    const connectionPortsLog = mockDebug.mock.calls.filter((call) => call[0].startsWith('Connection Ports: ['));
    expect(connectionPortsLog.length).toBeGreaterThan(0);
  });
});
