import { useMemo } from 'react';

import { useDataMapper } from '../../../../../hooks/useDataMapper';
import { ForEachGroupItem, ForEachItem } from '../../../../../models/datamapper/mapping';
import { DocumentService } from '../../../../../services/document/document.service';
import { formatQNameWithPrefix } from '../../../../../services/namespace-util';
import { XPathService } from '../../../../../services/xpath/xpath.service';

const MAX_DEPTH = 5;

export interface SortKeyOption {
  xpath: string;
  description: string;
}

export function useSortKeyItems(mapping: ForEachItem | ForEachGroupItem): SortKeyOption[] {
  const { sourceBodyDocument, sourceParameterMap, mappingTree } = useDataMapper();
  const namespaceMap = mappingTree.namespaceMap;

  return useMemo(() => {
    const contextPath = mapping.contextPath;
    if (!contextPath) return [];

    const absolutePath = XPathService.toAbsolutePath(contextPath);
    const document = DocumentService.resolveSourceDocument(
      absolutePath,
      namespaceMap,
      sourceBodyDocument,
      sourceParameterMap,
    );
    if (!document) return [];

    const contextParent = DocumentService.getFieldFromPathSegments(namespaceMap, document, absolutePath.pathSegments);
    if (!contextParent) return [];

    const descendants = DocumentService.collectDescendantFields(contextParent, MAX_DEPTH);

    return descendants.map((field) => {
      const pathExpr = XPathService.toPathExpression(namespaceMap, field, contextPath);
      const xpathString = XPathService.toXPathString(pathExpr);
      const prefixedQName = formatQNameWithPrefix(field.typeQName, namespaceMap);
      let description: string = field.type;
      if (prefixedQName) {
        description += ` (${prefixedQName})`;
      }
      return {
        xpath: xpathString,
        description,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- contextPath is a getter derived from mapping.expression
  }, [mapping.expression, namespaceMap, sourceBodyDocument, sourceParameterMap]);
}
