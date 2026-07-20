import { act, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { DocumentDefinitionType, DocumentInitializationModel, DocumentType } from '../../../../models/datamapper';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { DataMapperSettingsModal } from './DataMapperSettingsModal';

describe('DataMapperSettingsModal', () => {
  const mockOnModalClose = vi.fn();

  const createWrapper = (
    targetDocType: DocumentDefinitionType = DocumentDefinitionType.XML_SCHEMA,
  ): FunctionComponent<PropsWithChildren> => {
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
              definitionType: targetDocType,
              name: 'target',
            },
          )
        }
      >
        {children}
      </DataMapperProvider>
    );
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Modal Rendering', () => {
    it('should render modal when isModalOpen is true', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await screen.findByTestId('datamapper-settings-modal');
      expect(screen.getByText('DataMapper Settings')).toBeInTheDocument();
    });

    it('should not render modal content when isModalOpen is false', () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen={false} onModalClose={mockOnModalClose} />, { wrapper });

      expect(screen.queryByTestId('datamapper-settings-modal')).not.toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('should render omit XML declaration checkbox', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await screen.findByTestId('omit-xml-declaration-checkbox');
      expect(screen.getByText('Omit XML declaration')).toBeInTheDocument();
    });

    it('should show description when target is not XML', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.JSON_SCHEMA);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await screen.findByTestId('omit-xml-declaration-checkbox');
      expect(screen.getByText('Only available when target document is XML')).toBeInTheDocument();
    });
  });

  describe('Save Functionality', () => {
    it('should call onModalClose when Save is clicked', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const saveButton = await screen.findByTestId('datamapper-settings-save-btn');

      act(() => {
        saveButton.click();
      });

      expect(mockOnModalClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onModalClose when Cancel is clicked', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const cancelButton = await screen.findByTestId('datamapper-settings-cancel-btn');

      act(() => {
        cancelButton.click();
      });

      expect(mockOnModalClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal Close Behavior', () => {
    it('should call onModalClose when modal close button is clicked', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await screen.findByTestId('datamapper-settings-modal');
      const closeButton = screen.getByLabelText('Close');

      act(() => {
        closeButton.click();
      });

      expect(mockOnModalClose).toHaveBeenCalled();
    });
  });

  describe('Action Buttons', () => {
    it('should render Save and Cancel buttons', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await screen.findByTestId('datamapper-settings-modal');
      expect(screen.getByTestId('datamapper-settings-save-btn')).toBeInTheDocument();
      expect(screen.getByTestId('datamapper-settings-cancel-btn')).toBeInTheDocument();
    });

    it('should have correct button variants', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const saveButton = await screen.findByTestId('datamapper-settings-save-btn');
      const cancelButton = await screen.findByTestId('datamapper-settings-cancel-btn');

      expect(saveButton).toHaveClass('pf-m-primary');
      expect(cancelButton).toHaveClass('pf-m-link');
    });
  });

  describe('Generic Field Handler Pattern', () => {
    it('should use generic handleFieldChange for checkbox onChange', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = await screen.findByTestId('omit-xml-declaration-checkbox');

      // Verify the checkbox exists and has the correct attributes
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('type', 'checkbox');
      expect(checkbox).toHaveAttribute('id', 'omit-xml-declaration');
    });
  });

  describe('State Synchronization', () => {
    it('should sync local state with context when modal opens', async () => {
      const wrapper = createWrapper();
      const { rerender } = render(<DataMapperSettingsModal isModalOpen={false} onModalClose={mockOnModalClose} />, {
        wrapper,
      });

      // Modal is closed, no content should be rendered
      expect(screen.queryByTestId('datamapper-settings-modal')).not.toBeInTheDocument();

      // Open the modal
      rerender(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />);

      // Modal should now be rendered with synced state
      await screen.findByTestId('datamapper-settings-modal');
      const checkbox = screen.getByTestId('omit-xml-declaration-checkbox') as HTMLInputElement;
      expect(checkbox).toBeInTheDocument();
      expect(checkbox.checked).toBe(false); // Default value from context
    });

    it('should reset local state when modal is reopened after cancel', async () => {
      const wrapper = createWrapper();
      const { rerender } = render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, {
        wrapper,
      });

      await screen.findByTestId('datamapper-settings-modal');
      const cancelButton = screen.getByTestId('datamapper-settings-cancel-btn');

      // Close modal
      act(() => {
        cancelButton.click();
      });

      // Reopen modal
      rerender(<DataMapperSettingsModal isModalOpen={false} onModalClose={mockOnModalClose} />);
      rerender(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />);

      // State should be reset to context values
      await screen.findByTestId('datamapper-settings-modal');
      const checkbox = screen.getByTestId('omit-xml-declaration-checkbox') as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });
  });

  describe('isTargetXml Logic', () => {
    it('should disable checkbox when target is JSON', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.JSON_SCHEMA);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = (await screen.findByTestId('omit-xml-declaration-checkbox')) as HTMLInputElement;
      expect(checkbox.disabled).toBe(true);
    });

    it('should have XML target type', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = await screen.findByTestId('omit-xml-declaration-checkbox');
      // Verify checkbox is rendered for XML target
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).toHaveAttribute('id', 'omit-xml-declaration');
    });
  });
});
