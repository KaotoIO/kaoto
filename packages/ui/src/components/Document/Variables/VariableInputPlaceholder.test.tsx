import { act, fireEvent, render, screen } from '@testing-library/react';
import type { Mock } from 'vitest';

import { DocumentDefinitionType, DocumentType } from '../../../models/datamapper/document';
import { MappingTree } from '../../../models/datamapper/mapping';
import { MappingService } from '../../../services/mapping/mapping.service';
import { VariableInputPlaceholder } from './VariableInputPlaceholder';

describe('VariableInputPlaceholder', () => {
  let tree: MappingTree;
  let mockOnConfirm: Mock;
  let mockOnCancel: Mock;

  beforeEach(() => {
    tree = new MappingTree(DocumentType.TARGET_BODY, 'test-doc', DocumentDefinitionType.XML_SCHEMA);
    mockOnConfirm = vi.fn();
    mockOnCancel = vi.fn();
  });

  describe('add mode', () => {
    it('should render with empty input and disabled submit', () => {
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-variable-name-input');
      expect(input).toHaveValue('');
      expect(screen.getByTestId('new-variable-submit-btn')).toBeDisabled();
    });

    it('should auto-focus input on mount', () => {
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-variable-name-input');
      expect(document.activeElement).toBe(input);
    });

    it('should enable submit for a valid name', () => {
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'taxRate' } });

      expect(screen.getByTestId('new-variable-submit-btn')).toBeEnabled();
    });

    it('should disable submit for an invalid name', () => {
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: '1invalid' } });

      expect(screen.getByTestId('new-variable-submit-btn')).toBeDisabled();
      expect(screen.getByTestId('new-variable-name-input-error')).toHaveTextContent('valid NCName');
    });

    it('should disable submit for reserved name ending with -x', () => {
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'myVar-x' } });

      expect(screen.getByTestId('new-variable-submit-btn')).toBeDisabled();
      expect(screen.getByTestId('new-variable-name-input-error')).toHaveTextContent("'-x'");
    });

    it('should disable submit for duplicate name in scope', () => {
      MappingService.addVariable(tree, 'existingVar');
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'existingVar' } });

      expect(screen.getByTestId('new-variable-submit-btn')).toBeDisabled();
      expect(screen.getByTestId('new-variable-name-input-error')).toHaveTextContent('already exists');
    });

    it('should call onConfirm with name on submit click', () => {
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'taxRate' } });
      fireEvent.click(screen.getByTestId('new-variable-submit-btn'));

      expect(mockOnConfirm).toHaveBeenCalledWith('taxRate');
    });

    it('should call onConfirm on Enter key press with valid name', () => {
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'taxRate' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnConfirm).toHaveBeenCalledWith('taxRate');
    });

    it('should not call onConfirm on Enter key press with invalid name', () => {
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: '1invalid' } });
      fireEvent.keyDown(input, { key: 'Enter' });

      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onCancel on cancel button click', () => {
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      fireEvent.click(screen.getByTestId('new-variable-cancel-btn'));

      expect(mockOnCancel).toHaveBeenCalled();
    });

    it('should call onCancel on Escape key press', () => {
      render(<VariableInputPlaceholder parent={tree} onConfirm={mockOnConfirm} onCancel={mockOnCancel} />);

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.keyDown(input, { key: 'Escape' });

      expect(mockOnCancel).toHaveBeenCalled();
    });
  });

  describe('rename mode', () => {
    it('should render with pre-populated name and enabled submit', () => {
      render(
        <VariableInputPlaceholder
          initialName="taxRate"
          parent={tree}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />,
      );

      const input = screen.getByTestId('new-variable-name-input');
      expect(input).toHaveValue('taxRate');
      expect(screen.getByTestId('new-variable-submit-btn')).toBeEnabled();
    });

    it('should call onCancel when confirming with unchanged name', () => {
      render(
        <VariableInputPlaceholder
          initialName="taxRate"
          parent={tree}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />,
      );

      fireEvent.click(screen.getByTestId('new-variable-submit-btn'));

      expect(mockOnCancel).toHaveBeenCalled();
      expect(mockOnConfirm).not.toHaveBeenCalled();
    });

    it('should call onConfirm with new name when changed', () => {
      render(
        <VariableInputPlaceholder
          initialName="taxRate"
          parent={tree}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />,
      );

      const input = screen.getByTestId('new-variable-name-input');
      fireEvent.change(input, { target: { value: 'newRate' } });
      fireEvent.click(screen.getByTestId('new-variable-submit-btn'));

      expect(mockOnConfirm).toHaveBeenCalledWith('newRate');
    });

    it('should not flag unchanged name as duplicate', () => {
      MappingService.addVariable(tree, 'taxRate');

      render(
        <VariableInputPlaceholder
          initialName="taxRate"
          parent={tree}
          onConfirm={mockOnConfirm}
          onCancel={mockOnCancel}
        />,
      );

      expect(screen.getByTestId('new-variable-submit-btn')).toBeEnabled();
      expect(screen.getByTestId('new-variable-name-input-error')).toHaveTextContent('');
    });
  });
});
