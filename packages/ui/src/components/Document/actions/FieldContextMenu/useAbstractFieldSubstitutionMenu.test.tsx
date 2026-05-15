import { act, fireEvent, render, screen } from '@testing-library/react';
import { FunctionComponent, PropsWithChildren } from 'react';

import { DocumentDefinition, DocumentDefinitionType, DocumentType } from '../../../../models/datamapper';
import { DocumentTree } from '../../../../models/datamapper/document-tree';
import { DocumentNodeData } from '../../../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../../../providers/datamapper.provider';
import { FieldOverrideService } from '../../../../services/document/field-override.service';
import { XmlSchemaDocumentService } from '../../../../services/document/xml-schema/xml-schema-document.service';
import { TreeParsingService } from '../../../../services/visualization/tree-parsing.service';
import { getFieldSubstitutionXsd } from '../../../../stubs/datamapper/data-mapper';
import { SourceDocumentNodeWithContextMenu } from '../../SourceDocumentNode';

const NS_SUBSTITUTION = 'http://www.example.com/SUBSTITUTION';

function createSubstitutionDoc() {
  const definition = new DocumentDefinition(DocumentType.SOURCE_BODY, DocumentDefinitionType.XML_SCHEMA, 'test-doc', {
    'FieldSubstitution.xsd': getFieldSubstitutionXsd(),
  });
  definition.rootElementChoice = { namespaceUri: NS_SUBSTITUTION, name: 'AbstractAnimal' };
  const result = XmlSchemaDocumentService.createXmlSchemaDocument(definition);
  if (result.validationStatus !== 'success' || !result.document) {
    throw new Error(result.errors?.map((e) => e.message).join('; ') || 'Failed to create substitution test document');
  }
  return result.document;
}

describe('useAbstractFieldSubstitutionMenu', () => {
  const wrapper: FunctionComponent<PropsWithChildren> = ({ children }) => (
    <DataMapperProvider>
      <MappingLinksProvider>{children}</MappingLinksProvider>
    </DataMapperProvider>
  );

  const createAbstractFieldNode = (selectMember = false) => {
    const document = createSubstitutionDoc();
    const abstractAnimalField = document.fields[0];

    if (selectMember) {
      const catIndex = abstractAnimalField.fields.findIndex((f) => f.name === 'Cat');
      abstractAnimalField.selectedMemberIndex = catIndex;
    }

    const documentNodeData = new DocumentNodeData(document);
    const tree = new DocumentTree(documentNodeData);
    TreeParsingService.parseTree(tree);
    const abstractNode = tree.root.children[0];

    return { document, documentNodeData, abstractNode, abstractAnimalField };
  };

  it('should show inline substitution candidates when abstract field has candidates', () => {
    const { documentNodeData, abstractNode } = createAbstractFieldNode(false);

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={abstractNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${abstractNode.nodeData.id}`));
    });

    // Should show inline menu items for substitution candidates
    expect(screen.getByText('Cat')).toBeInTheDocument();
    expect(screen.getByText('Dog')).toBeInTheDocument();
    expect(screen.getByText('Fish')).toBeInTheDocument();
    expect(screen.getByText('Kitten')).toBeInTheDocument();
  });

  it('should show "Show All Substitution Options" when a member is selected', () => {
    const { documentNodeData, abstractNode } = createAbstractFieldNode(true);

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={abstractNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${abstractNode.nodeData.id}`));
    });

    expect(screen.getByText('Show All Substitution Options')).toBeInTheDocument();
  });

  it('should call applyFieldSubstitution when clicking a substitution candidate', () => {
    const { documentNodeData, abstractNode, abstractAnimalField } = createAbstractFieldNode(false);
    const applySpy = jest.spyOn(FieldOverrideService, 'applyFieldSubstitution');

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={abstractNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${abstractNode.nodeData.id}`));
    });

    act(() => {
      fireEvent.click(screen.getByText('Cat'));
    });

    expect(applySpy).toHaveBeenCalledWith(abstractAnimalField, expect.stringContaining('Cat'), expect.any(Object));
    applySpy.mockRestore();
  });

  it('should call revertFieldSubstitution when clicking "Show All Substitution Options"', () => {
    const { documentNodeData, abstractNode, abstractAnimalField } = createAbstractFieldNode(true);
    const revertSpy = jest.spyOn(FieldOverrideService, 'revertFieldSubstitution');

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={abstractNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${abstractNode.nodeData.id}`));
    });

    act(() => {
      fireEvent.click(screen.getByText('Show All Substitution Options'));
    });

    expect(revertSpy).toHaveBeenCalledWith(abstractAnimalField, expect.any(Object));
    revertSpy.mockRestore();
  });

  it('should not show "Show All Substitution Options" when no member is selected', () => {
    const { documentNodeData, abstractNode } = createAbstractFieldNode(false);

    render(
      <SourceDocumentNodeWithContextMenu
        treeNode={abstractNode}
        documentId={documentNodeData.id}
        isReadOnly={false}
        rank={1}
      />,
      { wrapper },
    );

    act(() => {
      fireEvent.contextMenu(screen.getByTestId(`node-source-${abstractNode.nodeData.id}`));
    });

    expect(screen.queryByText('Show All Substitution Options')).not.toBeInTheDocument();
  });
});
