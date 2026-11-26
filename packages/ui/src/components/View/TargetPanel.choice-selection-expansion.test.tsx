import { act, render, screen, waitFor } from '@testing-library/react';
import { FunctionComponent } from 'react';
import { VirtuosoMockContext } from 'react-virtuoso';

import { useDataMapper } from '../../hooks/useDataMapper';
import {
  BODY_DOCUMENT_ID,
  DocumentDefinition,
  DocumentDefinitionType,
  DocumentInitializationModel,
  DocumentType,
  IField,
} from '../../models/datamapper/document';
import { DocumentTree } from '../../models/datamapper/document-tree';
import { DocumentTreeNode } from '../../models/datamapper/document-tree-node';
import { DocumentNodeData } from '../../models/datamapper/visualization';
import { MappingLinksProvider } from '../../providers/data-mapping-links.provider';
import { DataMapperProvider } from '../../providers/datamapper.provider';
import { ChoiceFieldService } from '../../services/visualization/choice-field.service';
import { TreeUIService } from '../../services/visualization/tree-ui.service';
import { VisualizationUtilService } from '../../services/visualization/visualization-util.service';
import { useDocumentTreeStore } from '../../store/document-tree.store';
import { NS_HL7_V2, ORM_O01 } from '../../stubs/datamapper/cardinality-test-helpers';
import { getHl7OrmOrderChoiceXsd } from '../../stubs/datamapper/data-mapper';
import {
  expandChain,
  parseChild,
  parseChildWhere,
  resetDocumentTrees,
} from '../../stubs/datamapper/document-tree-test-helpers';
import { TargetPanel } from './TargetPanel';

/**
 * Selecting a target choice member in a document that already has mappings must not collapse the rows above it
 * (#4158), checked through the real DataMapperProvider. The selection is applied exactly as
 * `useChoiceContextMenu` does it: `dispatchChoiceSelection` followed by `updateDocument`. The schema is the
 * trimmed HL7 v2.5 ORM_O01 the issue was reported with, where ORDER_DETAIL sits below the parse frontier.
 */
describe('TargetPanel — expansion across a target choice selection (#4158)', () => {
  const TARGET_DOCUMENT_NODE_ID = DocumentNodeData.formatNodeId(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID);
  const VIRTUOSO_MOCK_SIZES = { viewportHeight: 4000, itemHeight: 40 };
  const orderChoiceTitles = ['ORM_O01.ORDER', 'ORM_O01.ORDER_DETAIL', 'ORM_O01.ORDER_CHOICE'];

  /** The document in the issue already maps PID (the recording shows its connection port). */
  const PID_MAPPING_XSLT = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="3.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:ns0="${NS_HL7_V2}">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
    <ns0:ORM_O01>
      <ns0:ORM_O01.PATIENT>
        <ns0:PID>
          <ns0:PID.1>
            <xsl:value-of select="'1'"/>
          </ns0:PID.1>
        </ns0:PID>
      </ns0:ORM_O01.PATIENT>
    </ns0:ORM_O01>
  </xsl:template>
</xsl:stylesheet>`;

  let dataMapper: ReturnType<typeof useDataMapper> | undefined;

  const TargetPanelExposingDataMapper: FunctionComponent = () => {
    dataMapper = useDataMapper();
    return <TargetPanel />;
  };

  function renderHl7Target() {
    const sourceDefinition = new DocumentDefinition(
      DocumentType.SOURCE_BODY,
      DocumentDefinitionType.Primitive,
      BODY_DOCUMENT_ID,
      {},
    );
    const targetDefinition = new DocumentDefinition(
      DocumentType.TARGET_BODY,
      DocumentDefinitionType.XML_SCHEMA,
      BODY_DOCUMENT_ID,
      { 'Hl7OrmOrderChoice.xsd': getHl7OrmOrderChoiceXsd() },
      ORM_O01,
    );
    render(
      <VirtuosoMockContext.Provider value={VIRTUOSO_MOCK_SIZES}>
        <DataMapperProvider
          documentInitializationModel={new DocumentInitializationModel({}, sourceDefinition, targetDefinition)}
          initialXsltFile={PID_MAPPING_XSLT}
        >
          <MappingLinksProvider>
            <TargetPanelExposingDataMapper />
          </MappingLinksProvider>
        </DataMapperProvider>
      </VirtuosoMockContext.Provider>,
    );
  }

  function getTargetTree(): DocumentTree {
    const tree = TreeUIService.getTree(TARGET_DOCUMENT_NODE_ID);
    if (!tree) throw new Error('The target tree is not built');
    return tree;
  }

  function isExpanded(row: DocumentTreeNode) {
    return useDocumentTreeStore.getState().isExpanded(TARGET_DOCUMENT_NODE_ID, row.path);
  }

  beforeEach(() => {
    dataMapper = undefined;
    resetDocumentTrees();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should keep the rows above the choice expanded after selecting OBR from the choice row', async () => {
    renderHl7Target();
    await screen.findByTestId('document-doc-targetBody-Body');
    await waitFor(() => {
      expect(TreeUIService.getTree(TARGET_DOCUMENT_NODE_ID)?.contentRoots).toHaveLength(1);
    });

    // 1–2. Expand down to ORDER_CHOICE and pick OBR in the context menu of its unselected choice row
    // (an unconfigured target choice shows no member rows, so the menu is the only way to pick one).
    let orderChoiceRow: DocumentTreeNode | undefined;
    act(() => {
      orderChoiceRow = expandChain(getTargetTree(), orderChoiceTitles);
    });
    const choiceRow = parseChildWhere(
      orderChoiceRow!,
      (nodeData) => VisualizationUtilService.getField(nodeData)?.wrapperKind === 'choice',
      'for the choice',
    );
    const choiceWrapper = VisualizationUtilService.getField(choiceRow.nodeData) as IField;
    const obrIndex = choiceWrapper.fields.findIndex((member) => member.name === 'OBR');

    act(() => {
      const mapper = dataMapper!;
      ChoiceFieldService.dispatchChoiceSelection(
        choiceRow.nodeData,
        choiceWrapper,
        { memberIndex: obrIndex },
        mapper.mappingTree.namespaceMap,
        true,
      );
      const doc = choiceWrapper.ownerDocument;
      mapper.updateDocument(doc, doc.definition, doc.getReferenceId(mapper.mappingTree.namespaceMap));
    });

    // 3. Nothing above the selected OBR collapses.
    await waitFor(() => {
      const root = getTargetTree().contentRoots[0];
      const order = parseChild(root, 'ORM_O01.ORDER');
      const orderDetail = parseChild(order, 'ORM_O01.ORDER_DETAIL');
      const orderChoice = parseChild(orderDetail, 'ORM_O01.ORDER_CHOICE');
      expect(parseChild(orderChoice, 'OBR')).toBeDefined();
      expect([root, order, orderDetail, orderChoice].map(isExpanded)).toEqual([true, true, true, true]);
    });
  });
});
