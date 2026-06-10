import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';
import { Mock, vi } from 'vitest';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DocumentService } from '../../services/document/document.service';
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

  function renderAndSubmit() {
    render(
      <DataMapperProvider>
        <AlertCapture>
          <ParameterInputPlaceholder onComplete={mockOnComplete} />
        </AlertCapture>
      </DataMapperProvider>,
    );

    const paramNameInput = screen.getByTestId('new-parameter-name-input');
    act(() => {
      fireEvent.change(paramNameInput, { target: { value: 'testparam' } });
    });

    const submitButton = screen.getByTestId('new-parameter-submit-btn');
    act(() => {
      fireEvent.click(submitButton);
    });
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

    act(() => {
      fireEvent.change(input, { target: { value: 'newParam' } });
    });
    act(() => {
      fireEvent.click(screen.getByTestId('new-parameter-submit-btn'));
    });

    expect(mockRenameSourceParameter).toHaveBeenCalledWith('oldParam', 'newParam');
    expect(mockOnComplete).toHaveBeenCalled();
  });
});
