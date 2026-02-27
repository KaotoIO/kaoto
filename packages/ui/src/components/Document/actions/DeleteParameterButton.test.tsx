import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren, useEffect } from 'react';

import { useDataMapper } from '../../../hooks/useDataMapper';
import {
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentType,
  IDocument,
  PrimitiveDocument,
} from '../../../models/datamapper/document';
import { MappingLinksProvider } from '../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DeleteParameterButton } from './DeleteParameterButton';

describe('DeleteParameterButton', () => {
  it('should delete a parameter', async () => {
    let parameterMap: Map<string, IDocument>;
    const ParamTest: FunctionComponent<PropsWithChildren> = ({ children }) => {
      const { sourceParameterMap } = useDataMapper();
      useEffect(() => {
        sourceParameterMap.set(
          'testparam1',
          new PrimitiveDocument(
            new DocumentDefinition(DocumentType.PARAM, DocumentDefinitionType.Primitive, 'testparam1'),
          ),
        );
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      useEffect(() => {
        parameterMap = sourceParameterMap;
      }, [sourceParameterMap]);
      return <>{children}</>;
    };
    render(
      <DataMapperProvider>
        <MappingLinksProvider>
          <ParamTest>
            <DeleteParameterButton parameterName="testparam1" parameterReferenceId="testparam1" />
          </ParamTest>
        </MappingLinksProvider>
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
