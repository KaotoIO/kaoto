import { FunctionComponent, PropsWithChildren, useEffect } from 'react';
import { DataMapperProvider } from '../../../providers';
import { CanvasProvider } from '../../../providers/CanvasProvider';
import { DeleteParameterButton } from './DeleteParameterButton';
import { act, fireEvent, render, screen } from '@testing-library/react';
import { useDataMapper } from '../../../hooks';
import { IDocument, PrimitiveDocument } from '../../../models/document';
import { DocumentType } from '../../../models/path';

describe('DeleteParameterButton', () => {
  it('should delete a parameter', async () => {
    let parameterMap: Map<string, IDocument>;
    const ParamTest: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { sourceParameterMap } = useDataMapper();
      useEffect(() => {
        sourceParameterMap.set('testparam1', new PrimitiveDocument(DocumentType.PARAM, 'testparam1'));
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      useEffect(() => {
        parameterMap = sourceParameterMap;
      }, [sourceParameterMap]);
      return <>{children}</>;
    };
    render(
      <DataMapperProvider>
        <CanvasProvider>
          <ParamTest>
            <DeleteParameterButton parameterName="testparam1" />
          </ParamTest>
        </CanvasProvider>
      </DataMapperProvider>,
    );
    const deleteBtn = await screen.findByTestId('delete-parameter-testparam1-button');
    expect(parameterMap!.size).toEqual(1);
    act(() => {
      fireEvent.click(deleteBtn);
    });
    const confirmBtn = screen.getByTestId('delete-parameter-modal-confirm-btn');
    act(() => {
      fireEvent.click(confirmBtn);
    });
    expect(parameterMap!.size).toEqual(0);
  });
});
