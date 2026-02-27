import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { useDataMapper } from '../../hooks/useDataMapper';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { DocumentService } from '../../services/document.service';
import { ParameterInputPlaceholder } from './ParameterInputPlaceholder';

describe('ParameterInputPlaceholder', () => {
  let mockSendAlert: jest.Mock;
  let mockOnComplete: jest.Mock;
  let mockCreatePrimitiveDocument: jest.SpyInstance;

  const AlertCapture: FunctionComponent<PropsWithChildren> = ({ children }) => {
    const dataMapper = useDataMapper();
    dataMapper.sendAlert = mockSendAlert;
    return <>{children}</>;
  };

  beforeEach(() => {
    mockSendAlert = jest.fn();
    mockOnComplete = jest.fn();
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
    mockCreatePrimitiveDocument = jest.spyOn(DocumentService, 'createPrimitiveDocument');
    mockCreatePrimitiveDocument.mockReturnValue({
      validationStatus: 'error',
      errors: ['Failed to create primitive document'],
    });

    renderAndSubmit();

    expect(mockSendAlert).toHaveBeenCalledWith({
      variant: 'danger',
      title: 'Failed to create primitive document',
    });
    expect(mockOnComplete).toHaveBeenCalled();
  });

  it('should send warning alert when createPrimitiveDocument returns warning', () => {
    mockCreatePrimitiveDocument = jest.spyOn(DocumentService, 'createPrimitiveDocument');
    mockCreatePrimitiveDocument.mockReturnValue({
      validationStatus: 'warning',
      warnings: ['Warning during document creation'],
    });

    renderAndSubmit();

    expect(mockSendAlert).toHaveBeenCalledWith({
      variant: 'warning',
      title: 'Warning during document creation',
    });
    expect(mockOnComplete).toHaveBeenCalled();
  });
});
