import { DataMapperContext, DataMapperProvider } from './datamapper.provider';
import { render, renderHook, screen, waitFor } from '@testing-library/react';
import { useDataMapper } from '../hooks/useDataMapper';
import { FieldItem, MappingTree } from '../models/datamapper/mapping';
import { act, useContext, useEffect } from 'react';
import { DocumentDefinition, DocumentDefinitionType, DocumentType, IField } from '../models/datamapper/document';
import { shipOrderJsonSchema } from '../stubs/datamapper/data-mapper';

describe('DataMapperProvider', () => {
  it('should render', async () => {
    render(
      <DataMapperProvider>
        <div data-testid="testdiv" />
      </DataMapperProvider>,
    );
    await screen.findByTestId('testdiv');
  });

  it('refreshMappingTree should re-create the MappingTree instance', async () => {
    let prevTree: MappingTree;
    let nextTree: MappingTree;
    let done = false;
    const TestRefreshMappingTree = () => {
      const { mappingTree, refreshMappingTree } = useDataMapper();
      useEffect(() => {
        if (done) {
          nextTree = mappingTree;
        } else {
          prevTree = mappingTree;
          prevTree.children.push(new FieldItem(prevTree, {} as IField));
          refreshMappingTree();
          done = true;
        }
      }, [mappingTree, refreshMappingTree]);
      return <div data-testid="testdiv"></div>;
    };
    render(
      <DataMapperProvider>
        <TestRefreshMappingTree></TestRefreshMappingTree>
      </DataMapperProvider>,
    );
    await screen.findByTestId('testdiv');
    expect(prevTree!).toBeDefined();
    expect(nextTree!).toBeDefined();
    expect(prevTree! !== nextTree!).toBeTruthy();
    expect(prevTree!.children[0] === nextTree!.children[0]).toBeTruthy();
  });

  it('resetMappingTree should reset the mappings', async () => {
    let initialized = false;
    let reset = false;
    let tree: MappingTree;
    const TestRefreshMappingTree = () => {
      const { mappingTree, refreshMappingTree, resetMappingTree } = useDataMapper();
      useEffect(() => {
        if (!initialized) {
          mappingTree.children.push(new FieldItem(mappingTree, {} as IField));
          refreshMappingTree();
          initialized = true;
        } else if (!reset) {
          resetMappingTree();
          reset = true;
        } else {
          tree = mappingTree;
        }
      }, [mappingTree, refreshMappingTree, resetMappingTree]);
      return <div data-testid="testdiv"></div>;
    };
    render(
      <DataMapperProvider>
        <TestRefreshMappingTree></TestRefreshMappingTree>
      </DataMapperProvider>,
    );
    await waitFor(() => tree);
    expect(tree!.children.length).toEqual(0);
  });

  it("updateDocumentDefinition() should also update MappingTree.documentDefinitionType if it's target body", async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <DataMapperProvider>{children}</DataMapperProvider>
    );

    const { result } = renderHook(() => useContext(DataMapperContext), { wrapper });
    expect(result.current!.mappingTree.documentDefinitionType).toBe(DocumentDefinitionType.Primitive);

    const docDef = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.JSON_SCHEMA,
      'ShipOrderJson',
      { ShipOrderJson: shipOrderJsonSchema },
    );
    act(() => {
      result.current!.updateDocumentDefinition(docDef);
    });

    await waitFor(() => {
      expect(result.current!.mappingTree.documentDefinitionType).toEqual(DocumentDefinitionType.JSON_SCHEMA);
    });
  });
});
