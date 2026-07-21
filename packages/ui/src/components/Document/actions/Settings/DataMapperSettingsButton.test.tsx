import { act, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { DocumentDefinitionType, DocumentInitializationModel, DocumentType } from '../../../../models/datamapper';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { DataMapperSettingsButton } from './DataMapperSettingsButton';

describe('DataMapperSettingsButton', () => {
  const createWrapper = (): FunctionComponent<PropsWithChildren> => {
    return ({ children }) => (
      <DataMapperProvider
        documentInitializationModel={
          new DocumentInitializationModel(
            {},
            {
              documentType: DocumentType.SOURCE_BODY,
              definitionType: DocumentDefinitionType.XML_SCHEMA,
              name: 'source',
            },
            {
              documentType: DocumentType.TARGET_BODY,
              definitionType: DocumentDefinitionType.XML_SCHEMA,
              name: 'target',
            },
          )
        }
      >
        {children}
      </DataMapperProvider>
    );
  };

  describe('Button Rendering', () => {
    it('should render settings button', () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      const button = screen.getByTestId('datamapper-settings-button');
      expect(button).toBeInTheDocument();
    });

    it('should have correct aria-label', () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      const button = screen.getByTestId('datamapper-settings-button');
      expect(button).toHaveAttribute('aria-label', 'Settings');
    });

    it('should have correct title', () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      const button = screen.getByTestId('datamapper-settings-button');
      expect(button).toHaveAttribute('title', 'DataMapper Settings');
    });

    it('should render with plain variant', () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      const button = screen.getByTestId('datamapper-settings-button');
      expect(button).toHaveClass('pf-m-plain');
    });

    it('should render cog icon', () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      const button = screen.getByTestId('datamapper-settings-button');
      const icon = button.querySelector('svg');
      expect(icon).toBeInTheDocument();
    });
  });

  describe('Modal Interaction', () => {
    it('should not render modal initially', () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      expect(screen.queryByTestId('datamapper-settings-modal')).not.toBeInTheDocument();
    });

    it('should open modal when button is clicked', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      const button = screen.getByTestId('datamapper-settings-button');

      act(() => {
        button.click();
      });

      await screen.findByTestId('datamapper-settings-modal');
      expect(screen.getByText('DataMapper Settings')).toBeInTheDocument();
    });

    it('should close modal when cancel button is clicked', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      const button = screen.getByTestId('datamapper-settings-button');

      // Open modal
      act(() => {
        button.click();
      });

      await screen.findByTestId('datamapper-settings-modal');

      // Close modal
      const cancelButton = screen.getByTestId('datamapper-settings-cancel-btn');
      act(() => {
        cancelButton.click();
      });

      expect(screen.queryByTestId('datamapper-settings-modal')).not.toBeInTheDocument();
    });

    it('should close modal when save button is clicked', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      const button = screen.getByTestId('datamapper-settings-button');

      // Open modal
      act(() => {
        button.click();
      });

      await screen.findByTestId('datamapper-settings-modal');

      // Close modal
      const saveButton = screen.getByTestId('datamapper-settings-save-btn');
      act(() => {
        saveButton.click();
      });

      expect(screen.queryByTestId('datamapper-settings-modal')).not.toBeInTheDocument();
    });

    it('should close modal when close button is clicked', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      const button = screen.getByTestId('datamapper-settings-button');

      // Open modal
      act(() => {
        button.click();
      });

      await screen.findByTestId('datamapper-settings-modal');

      // Close modal
      const closeButton = screen.getByLabelText('Close');
      act(() => {
        closeButton.click();
      });

      expect(screen.queryByTestId('datamapper-settings-modal')).not.toBeInTheDocument();
    });

    it('should be able to reopen modal after closing', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsButton />, { wrapper });

      const button = screen.getByTestId('datamapper-settings-button');

      // Open modal
      act(() => {
        button.click();
      });
      await screen.findByTestId('datamapper-settings-modal');

      // Close modal
      const cancelButton = screen.getByTestId('datamapper-settings-cancel-btn');
      act(() => {
        cancelButton.click();
      });
      expect(screen.queryByTestId('datamapper-settings-modal')).not.toBeInTheDocument();

      // Reopen modal
      act(() => {
        button.click();
      });
      await screen.findByTestId('datamapper-settings-modal');
      expect(screen.getByText('DataMapper Settings')).toBeInTheDocument();
    });
  });
});
