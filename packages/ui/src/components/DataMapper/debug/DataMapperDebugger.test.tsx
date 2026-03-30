import { render, screen } from '@testing-library/react';

import { DataMapperDebugger } from './DataMapperDebugger';

describe('Debug', () => {
  it('should render and log connection ports', async () => {
    const debugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {});
    render(<DataMapperDebugger />);
    await screen.findByTestId('dm-debug-main-menu-button');
    const connectionPortsLog = debugSpy.mock.calls.filter(
      ([firstArg]) => typeof firstArg === 'string' && firstArg.startsWith('Connection Ports: ['),
    );
    expect(connectionPortsLog.length).toBeGreaterThan(0);
    debugSpy.mockRestore();
  });
});
