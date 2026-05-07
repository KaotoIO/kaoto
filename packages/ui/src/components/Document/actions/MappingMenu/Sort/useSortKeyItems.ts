import { useMemo } from 'react';

import { useDataMapper } from '../../../../../hooks/useDataMapper';
import { Types } from '../../../../../models/datamapper';
import { IDocument, IField } from '../../../../../models/datamapper/document';
import { ForEachGroupItem, ForEachItem } from '../../../../../models/datamapper/mapping';
import { PathExpression } from '../../../../../models/datamapper/xpath';
import { DocumentService } from '../../../../../services/document/document.service';
import { DocumentUtilService } from '../../../../../services/document/document-util.service';
import { formatQNameWithPrefix } from '../../../../../services/namespace-util';
import { XPathService } from '../../../../../services/xpath/xpath.service';

const MAX_DEPTH = 5;

function collectDescendantFields(parent: IField | IDocument, depth: number, visited: Set<IField>): IField[] {
  if (depth >= MAX_DEPTH) return [];
  const result: IField[] = [];

  for (const field of parent.fields) {
    if (visited.has(field)) continue;
    visited.add(field);

    const resolved = DocumentUtilService.resolveTypeFragment(field);
    if (resolved.wrapperKind) {
      result.push(...collectDescendantFields(resolved, depth, visited));
    } else {
      resolved.type !== Types.Container && result.push(resolved);
      if (resolved.fields.length > 0) {
        result.push(...collectDescendantFields(resolved, depth + 1, visited));
      }
    }
  }
  return result;
}

function resolveDocument(
  absolutePath: PathExpression,
  namespaceMap: Record<string, string>,
  sourceBodyDocument: IDocument,
  sourceParameterMap: Map<string, IDocument>,
): IDocument | undefined {
  if (absolutePath.documentReferenceName) {
    return Array.from(sourceParameterMap.values()).find(
      (doc) => doc.getReferenceId(namespaceMap) === absolutePath.documentReferenceName,
    );
  }
  return sourceBodyDocument;
}

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
    const document = resolveDocument(absolutePath, namespaceMap, sourceBodyDocument, sourceParameterMap);
    if (!document) return [];

    const contextParent = DocumentService.getFieldFromPathSegments(namespaceMap, document, absolutePath.pathSegments);
    if (!contextParent) return [];

    const descendants = collectDescendantFields(contextParent, 0, new Set<IField>());

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
