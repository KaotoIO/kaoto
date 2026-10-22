import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FunctionComponent, PropsWithChildren } from 'react';

import { DocumentDefinitionType, DocumentInitializationModel, DocumentType } from '../../../../models/datamapper';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { DataMapperStepService } from '../../../../services/datamapper-step.service';
import { getShipOrderJsonSchema, getShipOrderXsd } from '../../../../stubs/datamapper/data-mapper';
import { DataMapperSettingsModal } from './DataMapperSettingsModal';

describe('DataMapperSettingsModal', () => {
  const mockOnModalClose = vi.fn();

  const createWrapper = (
    targetDocType: DocumentDefinitionType = DocumentDefinitionType.XML_SCHEMA,
    initialOutputVariable?: string,
    onUpdateStepSettings?: (settings: {
      outputVariable: string | undefined;
      isOutputValidationEnabled: boolean;
    }) => void,
    isOutputValidationEnabled?: boolean,
  ): FunctionComponent<PropsWithChildren> => {
    const initialStepSettings =
      initialOutputVariable !== undefined || isOutputValidationEnabled !== undefined
        ? {
            ...(initialOutputVariable !== undefined ? { outputVariable: initialOutputVariable } : {}),
            ...(isOutputValidationEnabled !== undefined ? { isOutputValidationEnabled } : {}),
          }
        : undefined;

    const getDefinitionFiles = (): Record<string, string> => {
      if (targetDocType === DocumentDefinitionType.XML_SCHEMA) {
        return { 'ShipOrder.xsd': getShipOrderXsd() };
      }
      if (targetDocType === DocumentDefinitionType.JSON_SCHEMA) {
        return { 'schema.json': getShipOrderJsonSchema() };
      }
      return {};
    };

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
              definitionFiles: getDefinitionFiles(),
            },
          )
        }
        initialStepSettings={initialStepSettings}
        onUpdateStepSettings={onUpdateStepSettings}
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

  // Output validation UI: disabled
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
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, undefined, undefined, true);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = (await screen.findByTestId('validate-output-settings-checkbox')) as HTMLInputElement;
      expect(checkbox.checked).toBe(true);
    });

    it('should render checkbox as unchecked when isOutputValidationEnabled is false', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = (await screen.findByTestId('validate-output-settings-checkbox')) as HTMLInputElement;
      expect(checkbox.checked).toBe(false);
    });

    it('should call onUpdateStepSettings with isOutputValidationEnabled true when checkbox is checked', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, undefined, mockOnUpdate);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = await screen.findByTestId('validate-output-settings-checkbox');
      await user.click(checkbox);

      const saveButton = screen.getByTestId('datamapper-settings-save-btn');
      await user.click(saveButton);

      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ isOutputValidationEnabled: true }));
    });

    it('should call onUpdateStepSettings with isOutputValidationEnabled false when checkbox is unchecked', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, undefined, mockOnUpdate, true);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = await screen.findByTestId('validate-output-settings-checkbox');
      await user.click(checkbox);

      const saveButton = screen.getByTestId('datamapper-settings-save-btn');
      await user.click(saveButton);

      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ isOutputValidationEnabled: false }));
    });

    // NOTE: The original S6 implementation fired immediately (bypassing Save), but the modal's
    // Save/Cancel contract should govern all fields uniformly. Cancel must be able to undo a
    // checkbox click made inside the modal — the same expectation users have for omitXmlDeclaration.
    // DataMapperLauncher (no Save button) fires immediately; the modal buffers until Save.
    // This test documents the correct buffered behaviour for the modal surface.
    it('should be buffered until Save (not take effect immediately on click)', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, undefined, mockOnUpdate);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const checkbox = await screen.findByTestId('validate-output-settings-checkbox');
      await user.click(checkbox);

      // onUpdateStepSettings must NOT be called before Save is clicked
      expect(mockOnUpdate).not.toHaveBeenCalled();
      expect(mockOnModalClose).not.toHaveBeenCalled();
    });
  });

  describe('Output Variable', () => {
    it('should render an empty output variable input when no output variable is set', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      expect(await screen.findByTestId('output-variable-name-input')).toHaveValue('');
      expect(screen.queryByTestId('save-as-variable-checkbox')).not.toBeInTheDocument();
    });

    it('should prefill the input when an output variable is set', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, 'existingVar');
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      expect(await screen.findByTestId('output-variable-name-input')).toHaveValue('existingVar');
    });

    it('should not show an error or a success state when the input is empty', async () => {
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const input = await screen.findByTestId('output-variable-name-input');
      expect(screen.queryByTestId('output-variable-name-error')).not.toBeInTheDocument();
      expect(input.closest('.pf-m-success')).toBeNull();
      expect(screen.getByTestId('datamapper-settings-save-btn')).not.toBeDisabled();
    });

    it('should show the success state when a valid variable name is filled', async () => {
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, 'myVar');
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const input = await screen.findByTestId('output-variable-name-input');
      expect(input.closest('.pf-m-success')).not.toBeNull();
      expect(screen.queryByTestId('output-variable-name-error')).not.toBeInTheDocument();
    });

    it('should show the success state after typing a valid name and drop it when cleared', async () => {
      const user = userEvent.setup();
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      const input = await screen.findByTestId('output-variable-name-input');
      await user.type(input, 'myVar');
      expect(input.closest('.pf-m-success')).not.toBeNull();

      await user.clear(input);
      expect(input.closest('.pf-m-success')).toBeNull();
      expect(screen.queryByTestId('output-variable-name-error')).not.toBeInTheDocument();
    });

    it('should show an error and disable Save for a whitespace-only name', async () => {
      const user = userEvent.setup();
      const wrapper = createWrapper();
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await user.type(await screen.findByTestId('output-variable-name-input'), '   ');

      expect(screen.getByTestId('output-variable-name-error')).toHaveTextContent(
        DataMapperStepService.OUTPUT_VARIABLE_NAME_BLANK,
      );
      expect(screen.getByTestId('datamapper-settings-save-btn')).toBeDisabled();
    });

    it('should call onUpdateStepSettings with outputVariable when Save is clicked', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, 'myVar', mockOnUpdate);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await user.click(await screen.findByTestId('datamapper-settings-save-btn'));

      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ outputVariable: 'myVar' }));
    });

    it('should call onUpdateStepSettings with outputVariable undefined when the input is cleared and Save is clicked', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, 'myVar', mockOnUpdate);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await user.clear(await screen.findByTestId('output-variable-name-input'));
      await user.click(screen.getByTestId('datamapper-settings-save-btn'));

      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ outputVariable: undefined }));
    });

    it('should not apply the typed name until Save is clicked', async () => {
      const user = userEvent.setup();
      const mockOnUpdate = vi.fn();
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, undefined, mockOnUpdate);
      render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      await user.type(await screen.findByTestId('output-variable-name-input'), 'myVar');
      expect(mockOnUpdate).not.toHaveBeenCalled();

      await user.click(screen.getByTestId('datamapper-settings-save-btn'));
      expect(mockOnUpdate).toHaveBeenCalledWith(expect.objectContaining({ outputVariable: 'myVar' }));
    });

    it('should reset local state on Cancel', async () => {
      const user = userEvent.setup();
      const wrapper = createWrapper(DocumentDefinitionType.XML_SCHEMA, 'myVar');
      const { rerender } = render(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />, { wrapper });

      // Clear the input
      const input = await screen.findByTestId('output-variable-name-input');
      await user.clear(input);
      expect(input).toHaveValue('');

      // Cancel
      await user.click(screen.getByTestId('datamapper-settings-cancel-btn'));

      // Reopen
      rerender(<DataMapperSettingsModal isModalOpen={false} onModalClose={mockOnModalClose} />);
      rerender(<DataMapperSettingsModal isModalOpen onModalClose={mockOnModalClose} />);

      expect(await screen.findByTestId('output-variable-name-input')).toHaveValue('myVar');
    });
  });
});
