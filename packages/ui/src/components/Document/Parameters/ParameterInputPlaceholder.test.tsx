import { fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import type { Mock, MockInstance } from 'vitest';

import { useDataMapper } from '../../../hooks/useDataMapper';
import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
} from '../../../models/datamapper/document';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DocumentService } from '../../../services/document/document.service';
import { ParameterInputPlaceholder } from './ParameterInputPlaceholder';

describe('ParameterInputPlaceholder', () => {
  let mockSendAlert: Mock;
  let mockOnComplete: Mock;
  let mockRenameSourceParameter: Mock;
  let mockCreatePrimitiveDocument: MockInstance;

  const AlertCapture: FunctionComponent<PropsWithChildren> = ({ children }) => {
    const dataMapper = useDataMapper();
    dataMapper.sendAlert = mockSendAlert;
    dataMapper.renameSourceParameter = mockRenameSourceParameter;
    return <>{children}</>;
  };

  beforeEach(() => {
    mockSendAlert = vi.fn();
    mockOnComplete = vi.fn();
    mockRenameSourceParameter = vi.fn();
  });

  afterEach(() => {
    mockCreatePrimitiveDocument?.mockRestore();
  });

  function renderWithParameters(parameterNames: string[], parameter?: string) {
    const documentInitializationModel = new DocumentInitializationModel(
      Object.fromEntries(
        parameterNames.map((name) => [
          name,
          new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, name),
        ]),
      ),
    );
    render(
      <DataMapperProvider documentInitializationModel={documentInitializationModel}>
        <AlertCapture>
          <ParameterInputPlaceholder onComplete={mockOnComplete} parameter={parameter} />
        </AlertCapture>
      </DataMapperProvider>,
    );
  }

  function typeName(name: string) {
    fireEvent.change(screen.getByTestId('new-parameter-name-input'), { target: { value: name } });
  }

  function expectRejected(error: string) {
    expect(screen.getByTestId('new-parameter-name-input-error')).toHaveTextContent(error);
    expect((screen.getByTestId('new-parameter-submit-btn') as HTMLButtonElement).disabled).toBeTruthy();
  }

  function renderAndSubmit() {
    render(
      <DataMapperProvider>
        <AlertCapture>
          <ParameterInputPlaceholder onComplete={mockOnComplete} />
        </AlertCapture>
      </DataMapperProvider>,
    );

    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    fireEvent.change(paramNameInput, { target: { value: 'testparam' } });

    const submitButton = screen.getByTestId('new-parameter-submit-btn');
    fireEvent.click(submitButton);
  }

  it('should send error alert when createPrimitiveDocument returns error', () => {
    mockCreatePrimitiveDocument = vi.spyOn(DocumentService, 'createPrimitiveDocument');
    mockCreatePrimitiveDocument.mockReturnValue({
      validationStatus: 'error',
      errors: [{ message: 'Failed to create primitive document' }],
    });

    renderAndSubmit();

    expect(mockSendAlert).toHaveBeenCalledWith({
      variant: 'danger',
      title: 'Failed to create primitive document',
    });
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('should send warning alert when createPrimitiveDocument returns warning', () => {
    mockCreatePrimitiveDocument = vi.spyOn(DocumentService, 'createPrimitiveDocument');
    mockCreatePrimitiveDocument.mockReturnValue({
      validationStatus: 'warning',
      warnings: [{ message: 'Warning during document creation' }],
    });

    renderAndSubmit();

    expect(mockSendAlert).toHaveBeenCalledWith({
      variant: 'warning',
      title: 'Warning during document creation',
    });
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('should rename existing parameter when parameter prop is provided and name changes', () => {
    render(
      <DataMapperProvider>
        <AlertCapture>
          <ParameterInputPlaceholder onComplete={mockOnComplete} parameter="oldParam" />
        </AlertCapture>
      </DataMapperProvider>,
    );

    const input = screen.getByTestId('new-parameter-name-input');
    expect(input).toHaveValue('oldParam');

    fireEvent.change(input, { target: { value: 'newParam' } });
    fireEvent.click(screen.getByTestId('new-parameter-submit-btn'));

    expect(mockRenameSourceParameter).toHaveBeenCalledWith('oldParam', 'newParam');
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('should complete without renaming or creating when a loaded reserved name is submitted unchanged', () => {
    mockCreatePrimitiveDocument = vi.spyOn(DocumentService, 'createPrimitiveDocument');
    renderWithParameters(['in'], 'in');

    fireEvent.click(screen.getByTestId('new-parameter-submit-btn'));

    expect(mockOnComplete).toHaveBeenCalled();
    expect(mockRenameSourceParameter).not.toHaveBeenCalled();
    expect(mockCreatePrimitiveDocument).not.toHaveBeenCalled();
  });

  it('should rename a parameter to a different case of its own name', () => {
    renderWithParameters(['cart'], 'cart');

    typeName('Cart');
    fireEvent.click(screen.getByTestId('new-parameter-submit-btn'));

    expect(mockRenameSourceParameter).toHaveBeenCalledWith('cart', 'Cart');
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('should reject a rename to another parameter or a reserved name', () => {
    renderWithParameters(['cart', 'q'], 'q');

    typeName('cart');
    expectRejected("Parameter 'cart' already exists");
    typeName('out');
    expectRejected("Parameter name 'out' is reserved for Camel internal use");
  });

  it('should reject a new parameter with an existing or a reserved name', () => {
    renderWithParameters(['cart']);

    typeName('cart');
    expectRejected("Parameter 'cart' already exists");
    typeName('exchange');
    expectRejected("Parameter name 'exchange' is reserved for Camel internal use");
  });
});
