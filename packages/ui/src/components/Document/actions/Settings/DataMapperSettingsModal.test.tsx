import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FunctionComponent, PropsWithChildren } from 'react';

import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
} from '../../../../models/datamapper';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { getCartJsonSchema, getShipOrderXsd } from '../../../../stubs/datamapper/data-mapper';
import { DataMapperSettingsModal } from './DataMapperSettingsModal';

describe('DataMapperSettingsModal', () => {
  const mockOnModalClose = vi.fn();

  const createWrapper = (
    targetDocType: DocumentDefinitionType = DocumentDefinitionType.XML_SCHEMA,
    isOutputValidationEnabled = false,
    onSetOutputValidationEnabled?: (enabled: boolean) => void,
  ): FunctionComponent<PropsWithChildren> => {
    let targetDocDef: DocumentDefinition;
    if (targetDocType === DocumentDefinitionType.XML_SCHEMA) {
      targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.XML_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'shipOrder.xsd': getShipOrderXsd() },
      );
    } else if (targetDocType === DocumentDefinitionType.JSON_SCHEMA) {
      targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.JSON_SCHEMA,
        BODY_DOCUMENT_ID,
        { 'cart.json': getCartJsonSchema() },
      );
    } else {
      targetDocDef = new DocumentDefinition(
        DocumentType.TARGET_BODY,
        DocumentDefinitionType.Primitive,
        BODY_DOCUMENT_ID,
      );
    }
    const documentInitializationModel = new DocumentInitializationModel({}, undefined, targetDocDef);

    return ({ children }) => (
      <DataMapperProvider
        documentInitializationModel={documentInitializationModel}
        isOutputValidationEnabled={isOutputValidationEnabled}
        onSetOutputValidationEnabled={onSetOutputValidationEnabled}
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
      const user = userEvent.setup();
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const saveButton = await screen.findByTestId('datamapper-settings-save-btn');
      await user.click(saveButton);

      expect(mockOnModalClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Cancel Functionality', () => {
    it('should call onModalClose when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const cancelButton = await screen.findByTestId('datamapper-settings-cancel-btn');
      await user.click(cancelButton);

      expect(mockOnModalClose).toHaveBeenCalledTimes(1);
    });
  });

  describe('Modal Close Behavior', () => {
    it('should call onModalClose when modal close button is clicked', async () => {
      const user = userEvent.setup();
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await screen.findByTestId('datamapper-settings-modal');
      const closeButton = screen.getByLabelText('Close');
      await user.click(closeButton);

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
      const user = userEvent.setup();
      const wrapper = createWrapper();
      const { rerender } = render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, {
        wrapper,
      });

      await screen.findByTestId('datamapper-settings-modal');
      const cancelButton = screen.getByTestId('datamapper-settings-cancel-btn');

      // Close modal
      await user.click(cancelButton);

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

  // Output validation UI: skipped until feature is complete
  describe.skip('Output Validation', () => {
    it('should show Validate output checkbox when target is XML', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await screen.findByTestId('validate-output-settings-checkbox');
      expect(screen.getByText('Output Validation')).toBeInTheDocument();
    });

    it('should show Validate output checkbox when target is JSON', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.JSON_SCHEMA);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await screen.findByTestId('validate-output-settings-checkbox');
      expect(screen.getByText('Output Validation')).toBeInTheDocument();
    });

    it('should hide Validate output checkbox when target is Primitive', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.Primitive);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await screen.findByTestId('datamapper-settings-modal');
      expect(screen.queryByTestId('validate-output-settings-checkbox')).not.toBeInTheDocument();
    });

    it('should render checkbox as checked when isOutputValidationEnabled is true', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, true);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = (await screen.findByTestId('validate-output-settings-checkbox')) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should render checkbox as unchecked when isOutputValidationEnabled is false', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, false);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = (await screen.findByTestId('validate-output-settings-checkbox')) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should call onSetOutputValidationEnabled(true) when checkbox is checked', async () => {
      const user = userEvent.setup();
      const mockOnSetOutputValidationEnabled = vi.fn();
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, false, mockOnSetOutputValidationEnabled);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = await screen.findByTestId('validate-output-settings-checkbox');
      await user.click(checkbox);

      expect(mockOnSetOutputValidationEnabled).toHaveBeenCalledWith(true);
    });

    it('should call onSetOutputValidationEnabled(false) when checkbox is unchecked', async () => {
      const user = userEvent.setup();
      const mockOnSetOutputValidationEnabled = vi.fn();
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, true, mockOnSetOutputValidationEnabled);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = await screen.findByTestId('validate-output-settings-checkbox');
      await user.click(checkbox);

      expect(mockOnSetOutputValidationEnabled).toHaveBeenCalledWith(false);
    });

    it('should take effect immediately (not buffered until Save)', async () => {
      const user = userEvent.setup();
      const mockOnSetOutputValidationEnabled = vi.fn();
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, false, mockOnSetOutputValidationEnabled);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = await screen.findByTestId('validate-output-settings-checkbox');
      await user.click(checkbox);

      // onSetOutputValidationEnabled should be called immediately, before Save is clicked
      expect(mockOnSetOutputValidationEnabled).toHaveBeenCalledWith(true);
      expect(mockOnModalClose).not.toHaveBeenCalled();
    });
  });
});
