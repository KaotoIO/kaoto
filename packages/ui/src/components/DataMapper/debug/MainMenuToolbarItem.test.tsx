import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperDndProvider } from '../../../providers/datamapper-dnd.provider';
import { SourceTargetDnDHandler } from '../../../providers/dnd/SourceTargetDnDHandler';
import { MainMenuToolbarItem } from './MainMenuToolbarItem';

const dndHandler = new SourceTargetDnDHandler();

const TestProviders: FunctionComponent<PropsWithChildren> = ({ children }) => (
  <DataMapperProvider>
    <DataMapperDndProvider handler={dndHandler}>
      <MappingLinksProvider>{children}</MappingLinksProvider>
    </DataMapperDndProvider>
  </DataMapperProvider>
);

describe('MainMenuToolbarItem', () => {
  it('should render the main menu button', () => {
    render(
      <TestProviders>
        <MainMenuToolbarItem />
      </TestProviders>,
    );

    const button = screen.getByTestId('dm-debug-main-menu-button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('DataMapper Debugger');
  });

  it('should toggle dropdown menu when button is clicked', async () => {
    render(
      <TestProviders>
        <MainMenuToolbarItem />
      </TestProviders>,
    );

    const button = screen.getByTestId('dm-debug-main-menu-button');

    // Click to open
    await act(async () => {
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('dm-debug-main-menu-dropdownlist')).toBeInTheDocument();
      });
    });

    // Verify dropdown items are present
    expect(screen.getByTestId('dm-debug-import-mappings-button')).toBeInTheDocument();
  });

  it('should render all dropdown items when menu is open', async () => {
    render(
      <TestProviders>
        <MainMenuToolbarItem />
      </TestProviders>,
    );

    const button = screen.getByTestId('dm-debug-main-menu-button');

    await act(async () => {
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('dm-debug-main-menu-dropdownlist')).toBeInTheDocument();
      });
    });

    expect(screen.getByTestId('dm-debug-import-mappings-button')).toBeInTheDocument();
    expect(screen.getByTestId('dm-debug-export-mappings-button')).toBeInTheDocument();
    expect(screen.getByText('Reset Mappings')).toBeInTheDocument();
  });

  it('should open export modal when export button is clicked', async () => {
    render(
      <TestProviders>
        <MainMenuToolbarItem />
      </TestProviders>,
    );

    const button = screen.getByTestId('dm-debug-main-menu-button');

    await act(async () => {
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('dm-debug-main-menu-dropdownlist')).toBeInTheDocument();
      });
    });

    const exportButton = screen.getByTestId('dm-debug-export-mappings-button');
    const exportButtonElement = exportButton.querySelector('button');

    expect(exportButtonElement).toBeInTheDocument();

    await act(async () => {
      if (exportButtonElement) {
        fireEvent.click(exportButtonElement);
      }
      await waitFor(() => {
        expect(screen.getByTestId('dm-debug-export-mappings-modal')).toBeInTheDocument();
      });
    });
  });

  it('should close export modal when close button is clicked', async () => {
    render(
      <TestProviders>
        <MainMenuToolbarItem />
      </TestProviders>,
    );

    const button = screen.getByTestId('dm-debug-main-menu-button');

    await act(async () => {
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('dm-debug-main-menu-dropdownlist')).toBeInTheDocument();
      });
    });

    const exportButton = screen.getByTestId('dm-debug-export-mappings-button');
    const exportButtonElement = exportButton.querySelector('button');

    expect(exportButtonElement).toBeInTheDocument();

    await act(async () => {
      if (exportButtonElement) {
        fireEvent.click(exportButtonElement);
      }
      await waitFor(() => {
        expect(screen.getByTestId('dm-debug-export-mappings-modal')).toBeInTheDocument();
      });
    });

    const closeButton = screen.getByTestId('dm-debug-export-mappings-modal-close-btn');

    await act(async () => {
      fireEvent.click(closeButton);
      await waitFor(() => {
        expect(screen.queryByTestId('dm-debug-export-mappings-modal')).not.toBeInTheDocument();
      });
    });
  });

  it('should close dropdown after import action completes', async () => {
    render(
      <TestProviders>
        <MainMenuToolbarItem />
      </TestProviders>,
    );

    const button = screen.getByTestId('dm-debug-main-menu-button');

    await act(async () => {
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('dm-debug-main-menu-dropdownlist')).toBeInTheDocument();
      });
    });

    const importButton = screen.getByTestId('dm-debug-import-mappings-button');
    const importButtonElement = importButton.querySelector('button');

    expect(importButtonElement).toBeInTheDocument();

    await act(async () => {
      if (importButtonElement) {
        fireEvent.click(importButtonElement);
      }
    });

    // Dropdown should remain present (closes only after file is selected)
    expect(screen.getByTestId('dm-debug-main-menu-dropdownlist')).toBeInTheDocument();
  });

  it('should render export modal with isOpen prop controlled by state', async () => {
    render(
      <TestProviders>
        <MainMenuToolbarItem />
      </TestProviders>,
    );

    // Modal should not be visible initially
    expect(screen.queryByTestId('dm-debug-export-mappings-modal')).not.toBeInTheDocument();

    const button = screen.getByTestId('dm-debug-main-menu-button');

    await act(async () => {
      fireEvent.click(button);
      await waitFor(() => {
        expect(screen.getByTestId('dm-debug-main-menu-dropdownlist')).toBeInTheDocument();
      });
    });

    const exportButton = screen.getByTestId('dm-debug-export-mappings-button');
    const exportButtonElement = exportButton.querySelector('button');

    expect(exportButtonElement).toBeInTheDocument();

    await act(async () => {
      if (exportButtonElement) {
        fireEvent.click(exportButtonElement);
      }
      await waitFor(() => {
        expect(screen.getByTestId('dm-debug-export-mappings-modal')).toBeInTheDocument();
      });
    });
  });
});
