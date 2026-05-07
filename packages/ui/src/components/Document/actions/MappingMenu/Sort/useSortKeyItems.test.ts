import { renderHook } from '@testing-library/react';

import { BODY_DOCUMENT_ID, DocumentDefinitionType, DocumentType } from '../../../../../models/datamapper/document';
import { ForEachItem, MappingTree } from '../../../../../models/datamapper/mapping';
import { TestUtil } from '../../../../../stubs/datamapper/data-mapper';
import { useSortKeyItems } from './useSortKeyItems';

jest.mock('../../../../../hooks/useDataMapper', () => ({
  useDataMapper: jest.fn(),
}));

describe('useSortKeyItems', () => {
  const sourceDoc = TestUtil.createSourceOrderDoc();
  let mappingTree: MappingTree;

  beforeEach(() => {
    mappingTree = new MappingTree(DocumentType.TARGET_BODY, BODY_DOCUMENT_ID, DocumentDefinitionType.XML_SCHEMA);

    const { useDataMapper } = jest.requireMock('../../../../../hooks/useDataMapper');
    useDataMapper.mockReturnValue({
      sourceBodyDocument: sourceDoc,
      sourceParameterMap: new Map(),
      mappingTree,
    });
  });

  it('should return empty items when contextPath is undefined', () => {
    const forEachItem = new ForEachItem(mappingTree);
    forEachItem.expression = '';

    const { result } = renderHook(() => useSortKeyItems(forEachItem));
    expect(result.current).toEqual([]);
  });

  it('should return empty items when expression cannot be resolved to a field', () => {
    const forEachItem = new ForEachItem(mappingTree);
    forEachItem.expression = '/NonExistent/Path';

    const { result } = renderHook(() => useSortKeyItems(forEachItem));
    expect(result.current).toEqual([]);
  });

  it('should return descendant fields as options for a valid for-each expression', () => {
    const forEachItem = new ForEachItem(mappingTree);
    forEachItem.expression = '/ShipOrder/Item';

    const { result } = renderHook(() => useSortKeyItems(forEachItem));
    const xpaths = result.current.map((opt) => opt.xpath);
    expect(xpaths).toContain('Title');
    expect(xpaths).toContain('Note');
    expect(xpaths).toContain('Quantity');
    expect(xpaths).toContain('Price');
  });

  it('should include nested descendants but exclude container fields', () => {
    const forEachItem = new ForEachItem(mappingTree);
    forEachItem.expression = '/ShipOrder';

    const { result } = renderHook(() => useSortKeyItems(forEachItem));
    const xpaths = result.current.map((opt) => opt.xpath);
    expect(xpaths).toContain('OrderPerson');
    expect(xpaths).not.toContain('ShipTo');
    expect(xpaths).toContain('ShipTo/Name');
    expect(xpaths).toContain('ShipTo/Address');
    expect(xpaths).not.toContain('Item');
    expect(xpaths).toContain('Item/Title');
  });

  it('should include field type in description', () => {
    const forEachItem = new ForEachItem(mappingTree);
    forEachItem.expression = '/ShipOrder/Item';

    const { result } = renderHook(() => useSortKeyItems(forEachItem));
    const titleItem = result.current.find((opt) => opt.xpath === 'Title');
    expect(titleItem).toBeDefined();
    expect(titleItem!.description).toContain('string');
  });
});
