import { render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { TargetPanel } from './TargetPanel';

// Mock ResizeObserver for ExpansionPanels
beforeAll(() => {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {
      // intentional noop for test mock
    }
    unobserve() {
      // intentional noop for test mock
    }
    disconnect() {
      // intentional noop for test mock
    }
  };
});

describe('TargetPanel', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <MappingLinksProvider>{children}</MappingLinksProvider>
    </DataMapperProvider>
  );

  it('should render the Target panel with Body header', () => {
    render(<TargetPanel />, { wrapper });
    expect(screen.getByText('Body')).toBeInTheDocument();
  });

  it('should render the panel with correct id', () => {
    const { container } = render(<TargetPanel />, { wrapper });
    expect(container.querySelector('#panel-target')).toBeInTheDocument();
  });

  it('should render using ExpansionPanels', () => {
    const { container } = render(<TargetPanel />, { wrapper });
    expect(container.querySelector('.expansion-panels')).toBeInTheDocument();
    expect(container.querySelector('.expansion-panel')).toBeInTheDocument();
  });

  it('should render the target body panel as expanded', () => {
    const { container } = render(<TargetPanel />, { wrapper });
    const panel = container.querySelector('.expansion-panel');
    expect(panel).toHaveAttribute('data-expanded', 'true');
  });
});
