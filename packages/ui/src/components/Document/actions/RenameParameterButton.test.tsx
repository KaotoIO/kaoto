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
import { DataMapperProvider } from '../../../providers/datamapper.provider';
import { DataMapperCanvasProvider } from '../../../providers/datamapper-canvas.provider';
import { RenameParameterButton } from './RenameParameterButton';

describe('RenameParameterButton', () => {
  const renameAction = jest.fn();

  it('should rename a parameter', async () => {
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
        <DataMapperCanvasProvider>
          <ParamTest>
            <RenameParameterButton parameterName="testparam1" onRenameClick={renameAction} />
          </ParamTest>
        </DataMapperCanvasProvider>
      </DataMapperProvider>,
    );
    const renameBtn = await screen.findByTestId('rename-parameter-testparam1-button');
    expect(parameterMap!.size).toEqual(1);
    act(() => {
      fireEvent.click(renameBtn);
    });
    expect(renameAction).toHaveBeenCalled();
  });
});
