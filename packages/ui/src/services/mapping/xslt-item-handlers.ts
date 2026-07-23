import { BaseField, IField, IParentType, PrimitiveDocument } from '../../models/datamapper/document';
import {
  ChooseItem,
  CopyOfSelector,
  CopyOfType,
  FieldItem,
  ForEachGroupItem,
  ForEachItem,
  GroupingStrategy,
  IfItem,
  MappingItem,
  MappingParentType,
  OtherwiseItem,
  SortItem,
  UnknownMappingItem,
  ValueOfSelector,
  ValueOfType,
  VariableItem,
  WhenItem,
} from '../../models/datamapper/mapping';
import { DeserializeItemResult, MappingItemClass, XsltItemHandler } from '../../models/datamapper/serialization';
import { NS_XSL } from '../../models/datamapper/standard-namespaces';
import { FROM_JSON_SOURCE_SUFFIX } from '../document/json-schema/json-schema-document.model';
import { XmlSchemaDocumentUtilService } from '../document/xml-schema/xml-schema-document-util.service';
import { MappingSerializerJsonAddon, TO_JSON_TARGET_VARIABLE } from './mapping-serializer-json-addon';

/** Handles {@link ValueOfSelector} — maps to `xsl:value-of` or `xsl:text`. */
export class ValueOfSelectorHandler implements XsltItemHandler<ValueOfSelector> {
  readonly itemClass = ValueOfSelector;
  readonly xsltElementNames = ['value-of', 'text'];

  serialize(parent: Element, mapping: ValueOfSelector): Element {
    const doc = parent.ownerDocument;
    const valueOf = doc.createElementNS(NS_XSL, 'value-of');
    valueOf.setAttribute('select', mapping.expression);
    parent.appendChild(valueOf);
    return valueOf;
  }

  deserialize(
    element: Element,
    parentField: IParentType,
    _parentMapping: MappingParentType,
  ): DeserializeItemResult<ValueOfSelector> {
    if (element.localName === 'text') {
      const selector = new ValueOfSelector(_parentMapping, ValueOfType.VALUE);
      selector.expression = element.textContent || '';
      selector.isLiteral = true;
      return { mappingItem: selector, fieldItem: null };
    }
    const valueType =
      'isAttribute' in parentField && parentField.isAttribute ? ValueOfType.ATTRIBUTE : ValueOfType.VALUE;
    const selector = new ValueOfSelector(_parentMapping, valueType);
    selector.expression = element.getAttribute('select') || '';
    return { mappingItem: selector, fieldItem: null };
  }
}

/**
 * Handles {@link CopyOfSelector} — maps to `xsl:copy-of`.
 *
 * When a CONTAINER copy-of is deserialized (wrapper element was skipped during
 * serialization), this handler reconstructs the intermediate {@link FieldItem}
 * so that the mapping model is consistent regardless of how it was created.
 */
export class CopyOfSelectorHandler implements XsltItemHandler<MappingItem> {
  readonly itemClass = CopyOfSelector;
  readonly xsltElementNames = ['copy-of'];

  serialize(parent: Element, mapping: CopyOfSelector): Element {
    const doc = parent.ownerDocument;
    const copyOf = doc.createElementNS(NS_XSL, 'copy-of');
    copyOf.setAttribute('select', mapping.expression);
    parent.appendChild(copyOf);
    return copyOf;
  }

  private static resolveContainerValueType(
    selectExpr: string,
    parentMapping: MappingParentType,
    element: Element,
  ): CopyOfType {
    if (selectExpr.endsWith('/node()')) return CopyOfType.CONTAINER_NODE;
    if (parentMapping instanceof FieldItem) {
      const { localName, namespaceURI } = CopyOfSelectorHandler.resolveFieldFromSelectExpression(selectExpr, element);
      if (localName === parentMapping.field.name && namespaceURI === parentMapping.field.namespaceURI) {
        return CopyOfType.CONTAINER_NODE;
      }
    }
    return CopyOfType.CONTAINER;
  }

  private static resolveFieldFromSelectExpression(
    selectExpr: string,
    element: Element,
  ): { localName: string; namespaceURI: string } {
    const segments = selectExpr.split('/');
    const lastSegment = segments[segments.length - 1];
    if (!lastSegment) return { localName: '', namespaceURI: '' };

    const colonIndex = lastSegment.indexOf(':');
    const localName = colonIndex >= 0 ? lastSegment.substring(colonIndex + 1) : lastSegment;
    const prefix = colonIndex >= 0 ? lastSegment.substring(0, colonIndex) : '';
    const namespaceURI = prefix ? element.lookupNamespaceURI(prefix) || '' : '';

    return { localName, namespaceURI };
  }

  private static wrapContainerCopyOfInFieldItem(
    selector: CopyOfSelector,
    element: Element,
    parentField: IParentType,
    parentMapping: FieldItem,
  ): DeserializeItemResult<MappingItem> | null {
    const { localName, namespaceURI } = CopyOfSelectorHandler.resolveFieldFromSelectExpression(
      selector.expression,
      element,
    );
    if (!localName) return null;

    let targetField = XmlSchemaDocumentUtilService.getChildField(parentField, localName, namespaceURI);
    if (!targetField) {
      targetField = new BaseField(
        parentField,
        'ownerDocument' in parentField ? parentField.ownerDocument : parentField,
        localName,
      );
      targetField.namespaceURI = namespaceURI;
      parentField.fields.push(targetField);
    }

    const fieldItem = new FieldItem(parentMapping, targetField);
    if (selector.comment) {
      fieldItem.comment = selector.comment;
      selector.comment = undefined;
    }
    selector.parent = fieldItem;
    fieldItem.children.push(selector);
    return { mappingItem: fieldItem, fieldItem: targetField };
  }

  deserialize(
    element: Element,
    parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<MappingItem> {
    const selectExpr = element.getAttribute('select') || '';
    const valueType = CopyOfSelectorHandler.resolveContainerValueType(selectExpr, parentMapping, element);
    const selector = new CopyOfSelector(parentMapping, valueType);
    selector.expression = selectExpr;

    if (
      valueType === CopyOfType.CONTAINER &&
      parentMapping instanceof FieldItem &&
      !(parentField instanceof PrimitiveDocument)
    ) {
      const wrapped = CopyOfSelectorHandler.wrapContainerCopyOfInFieldItem(
        selector,
        element,
        parentField,
        parentMapping,
      );
      if (wrapped) return wrapped;
    }

    return { mappingItem: selector, fieldItem: null };
  }
}

/**
 * Handles {@link FieldItem} — serializes target element or `xsl:attribute`, deserializes `xsl:attribute`.
 * When the sole child is a CONTAINER {@link CopyOfSelector}, the target element is skipped
 * during serialization (copy-of appears directly under the parent).
 */
export class FieldItemHandler implements XsltItemHandler<FieldItem> {
  readonly itemClass = FieldItem;
  readonly xsltElementNames = ['attribute'];

  serialize(parent: Element, mapping: FieldItem): Element {
    const doc = parent.ownerDocument;
    if (mapping.field.isAttribute) {
      const xslAttribute = doc.createElementNS(NS_XSL, 'attribute');
      xslAttribute.setAttribute('name', mapping.field.name);
      mapping.field.namespaceURI && xslAttribute.setAttribute('namespace', mapping.field.namespaceURI);
      parent.appendChild(xslAttribute);
      return xslAttribute;
    }

    const hasContainerCopyOf = mapping.children.some(
      (c) => c instanceof CopyOfSelector && c.valueType === CopyOfType.CONTAINER,
    );
    const hasChildFieldItems = mapping.children.some((c) => c instanceof FieldItem);
    const hasValueOf = mapping.children.some((c) => c instanceof ValueOfSelector);
    if (hasContainerCopyOf && !hasChildFieldItems && !hasValueOf) return parent;

    const jsonElement = MappingSerializerJsonAddon.populateFieldItem(parent, mapping);
    if (jsonElement) return jsonElement;

    const element = mapping.field.namespaceURI
      ? doc.createElementNS(mapping.field.namespaceURI, mapping.field.name)
      : doc.createElement(mapping.field.name);
    parent.appendChild(element);
    return element;
  }

  deserialize(
    element: Element,
    parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<FieldItem> | null {
    if (parentField instanceof PrimitiveDocument) return null;
    const field = FieldItemHandler.getOrCreateAttributeField(element, parentField);
    if (!field) return null;
    return { mappingItem: new FieldItem(parentMapping, field), fieldItem: field };
  }

  private static getOrCreateAttributeField(item: Element, parentField: IParentType): IField | null {
    const namespace = item.getAttribute('namespace') ?? '';
    const name = item.getAttribute('name');
    if (!name) return null;
    const existing = XmlSchemaDocumentUtilService.getChildField(parentField, name, namespace);
    if (existing) return existing;
    const field = new BaseField(
      parentField,
      'ownerDocument' in parentField ? parentField.ownerDocument : parentField,
      name,
    );
    field.isAttribute = true;
    field.namespaceURI = namespace || '';
    parentField.fields.push(field);
    return field;
  }
}

/** Handles {@link IfItem} — maps to `xsl:if`. */
export class IfItemHandler implements XsltItemHandler<IfItem> {
  readonly itemClass = IfItem;
  readonly xsltElementNames = ['if'];

  serialize(parent: Element, mapping: IfItem): Element {
    const xslIf = parent.ownerDocument.createElementNS(NS_XSL, 'if');
    xslIf.setAttribute('test', mapping.expression);
    parent.appendChild(xslIf);
    return xslIf;
  }

  deserialize(
    element: Element,
    _parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<IfItem> {
    const ifItem = new IfItem(parentMapping);
    ifItem.expression = element.getAttribute('test') || '';
    return { mappingItem: ifItem, fieldItem: null };
  }
}

/** Handles {@link ChooseItem} — maps to `xsl:choose`. */
export class ChooseItemHandler implements XsltItemHandler<ChooseItem> {
  readonly itemClass = ChooseItem;
  readonly xsltElementNames = ['choose'];

  serialize(parent: Element, _mapping: ChooseItem): Element {
    const xslChoose = parent.ownerDocument.createElementNS(NS_XSL, 'choose');
    parent.appendChild(xslChoose);
    return xslChoose;
  }

  deserialize(
    _element: Element,
    _parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<ChooseItem> {
    return { mappingItem: new ChooseItem(parentMapping), fieldItem: null };
  }
}

/** Handles {@link WhenItem} — maps to `xsl:when`. */
export class WhenItemHandler implements XsltItemHandler<WhenItem> {
  readonly itemClass = WhenItem;
  readonly xsltElementNames = ['when'];

  serialize(parent: Element, mapping: WhenItem): Element {
    const xslWhen = parent.ownerDocument.createElementNS(NS_XSL, 'when');
    xslWhen.setAttribute('test', mapping.expression);
    parent.appendChild(xslWhen);
    return xslWhen;
  }

  deserialize(
    element: Element,
    _parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<WhenItem> {
    const whenItem = new WhenItem(parentMapping);
    whenItem.expression = element.getAttribute('test') || '';
    return { mappingItem: whenItem, fieldItem: null };
  }
}

/** Handles {@link OtherwiseItem} — maps to `xsl:otherwise`. */
export class OtherwiseItemHandler implements XsltItemHandler<OtherwiseItem> {
  readonly itemClass = OtherwiseItem;
  readonly xsltElementNames = ['otherwise'];

  serialize(parent: Element, _mapping: OtherwiseItem): Element {
    const xslOtherwise = parent.ownerDocument.createElementNS(NS_XSL, 'otherwise');
    parent.appendChild(xslOtherwise);
    return xslOtherwise;
  }

  deserialize(
    _element: Element,
    _parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<OtherwiseItem> {
    return { mappingItem: new OtherwiseItem(parentMapping), fieldItem: null };
  }
}

/**
 * Handles {@link SortItem} — maps to `xsl:sort` inside `xsl:for-each` / `xsl:for-each-group`.
 * The serialization of this handler is dependent on either {@link ForEachItemHandler} or
 * {@link ForEachGroupItemHandler} where {@link serializeAhead} is invoked from them, and then
 * `xsl:sort` is serialized as a part of `xsl:for-each` or `xsl:for-each-group` serialization.
 * Because of that, {@link serialize} of this handler is no-op.
 * {@link deserialize} populates {@link SortItem} into {@link ForEachItem.sortItems} or
 * {@link ForEachGroupItem.sortItems} instead of being independent mapping item child.
 */
export class SortItemHandler implements XsltItemHandler<SortItem> {
  readonly itemClass = undefined;
  readonly xsltElementNames = ['sort'];

  private static doSerializeSort(parent: Element, sort: SortItem) {
    const xslSort = parent.ownerDocument.createElementNS(NS_XSL, 'sort');
    if (sort.expression) {
      xslSort.setAttribute('select', sort.expression);
    }
    if (sort.order !== 'ascending') {
      xslSort.setAttribute('order', sort.order);
    }
    if (sort.lang) xslSort.setAttribute('lang', sort.lang);
    if (sort.dataType) {
      xslSort.setAttribute('data-type', sort.dataType);
    }
    if (sort.caseOrder) xslSort.setAttribute('case-order', sort.caseOrder);
    if (sort.collation) xslSort.setAttribute('collation', sort.collation);
    if (sort.stable) xslSort.setAttribute('stable', sort.stable);
    parent.appendChild(xslSort);
  }

  static serializeAhead(parent: Element, sortItems: SortItem[]): void {
    for (const sort of sortItems) {
      SortItemHandler.doSerializeSort(parent, sort);
    }
  }

  serialize(_parent: Element, _mapping: SortItem): null {
    return null;
  }

  deserialize(
    element: Element,
    _parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<SortItem> | null {
    if (parentMapping instanceof ForEachItem || parentMapping instanceof ForEachGroupItem) {
      const sortItem = new SortItem();
      sortItem.expression = element.getAttribute('select') || '';
      const order = element.getAttribute('order');
      if (order === 'descending') {
        sortItem.order = 'descending';
      }
      sortItem.lang = element.getAttribute('lang') || '';
      sortItem.dataType = element.getAttribute('data-type') || '';
      const caseOrder = element.getAttribute('case-order');
      if (caseOrder === 'upper-first' || caseOrder === 'lower-first') sortItem.caseOrder = caseOrder;
      sortItem.collation = element.getAttribute('collation') || '';
      const stableAttr = element.getAttribute('stable');
      if (stableAttr === 'yes' || stableAttr === 'no') sortItem.stable = stableAttr;
      parentMapping.sortItems.push(sortItem);
      return null;
    }
    return {
      fieldItem: null,
      messages: [
        {
          variant: 'danger',
          title: `xsl:sort is not allowed under xsl:${(parentMapping as MappingItem).name ?? 'unknown'}`,
          description: new XMLSerializer().serializeToString(element),
        },
      ],
    };
  }
}

/** Handles {@link ForEachItem} — maps to `xsl:for-each`. */
export class ForEachItemHandler implements XsltItemHandler<ForEachItem> {
  readonly itemClass = ForEachItem;
  readonly xsltElementNames = ['for-each'];

  serialize(parent: Element, mapping: ForEachItem): Element {
    const xslForEach = parent.ownerDocument.createElementNS(NS_XSL, 'for-each');
    xslForEach.setAttribute('select', mapping.expression);
    parent.appendChild(xslForEach);
    SortItemHandler.serializeAhead(xslForEach, mapping.sortItems);
    return xslForEach;
  }

  deserialize(
    element: Element,
    _parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<ForEachItem> {
    const forEachItem = new ForEachItem(parentMapping);
    forEachItem.expression = element.getAttribute('select') || '';
    return { mappingItem: forEachItem, fieldItem: null };
  }
}

/** Handles {@link ForEachGroupItem} — maps to `xsl:for-each-group` with a grouping strategy attribute. */
export class ForEachGroupItemHandler implements XsltItemHandler<ForEachGroupItem> {
  readonly itemClass = ForEachGroupItem;
  readonly xsltElementNames = ['for-each-group'];

  serialize(parent: Element, mapping: ForEachGroupItem): Element {
    const el = parent.ownerDocument.createElementNS(NS_XSL, 'for-each-group');
    el.setAttribute('select', mapping.expression);
    el.setAttribute(mapping.groupingStrategy, mapping.groupingExpression);
    parent.appendChild(el);
    SortItemHandler.serializeAhead(el, mapping.sortItems);
    return el;
  }

  deserialize(
    element: Element,
    _parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<ForEachGroupItem> {
    const item = new ForEachGroupItem(parentMapping);
    item.expression = element.getAttribute('select') || '';
    for (const strategy of Object.values(GroupingStrategy)) {
      const val = element.getAttribute(strategy);
      if (val != null) {
        item.groupingStrategy = strategy;
        item.groupingExpression = val;
        break;
      }
    }
    return { mappingItem: item, fieldItem: null };
  }
}

/**
 * Handles {@link VariableItem} — maps to `xsl:variable` with a `select` XPath expression or child content.
 *
 * Both XSLT variable forms are supported:
 *   - Select form:  `<xsl:variable name="x" select="expr"/>` — used when {@link VariableItem.children} is empty.
 *   - Empty select: `<xsl:variable name="x" select=""/>` — used when no expression and no children (unconfigured).
 *   - Content form: `<xsl:variable name="x">…children…</xsl:variable>` — used when {@link VariableItem.children}
 *     is non-empty; the `select` attribute is omitted and children are serialized by {@link MappingSerializerService}.
 *
 * Having both a `select` attribute and child elements is invalid XSLT and triggers a warning on deserialization.
 */
export class VariableItemHandler implements XsltItemHandler<VariableItem> {
  readonly itemClass = VariableItem;
  readonly xsltElementNames = ['variable'];

  serialize(parent: Element, mapping: VariableItem): Element {
    const xslVariable = parent.ownerDocument.createElementNS(NS_XSL, 'variable');
    xslVariable.setAttribute('name', mapping.name);

    /*
     * Select form: only add `select` when there are no children.
     * Content form: children are serialized by MappingSerializerService.populateMapping after this returns,
     * so no `select` attribute should be added.
     */
    if (mapping.children.length === 0) {
      xslVariable.setAttribute('select', mapping.expression || '');
    }

    parent.appendChild(xslVariable);
    return xslVariable;
  }

  deserialize(
    element: Element,
    _parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<VariableItem> | null {
    const varName = element.getAttribute('name')?.trim() || '';
    if (!varName) {
      return {
        fieldItem: null,
        messages: [
          {
            variant: 'danger',
            title: 'Skipping xsl:variable without a name',
            description: new XMLSerializer().serializeToString(element),
          },
        ],
      };
    }
    if (varName.endsWith(FROM_JSON_SOURCE_SUFFIX) || varName === TO_JSON_TARGET_VARIABLE) {
      return {
        fieldItem: null,
        messages: [
          {
            variant: 'danger',
            title: `Skipping reserved variable name: "${varName}"`,
            description: new XMLSerializer().serializeToString(element),
          },
        ],
      };
    }

    const variableItem = new VariableItem(parentMapping, varName);
    const hasChildren = Array.from(element.childNodes).some((n) => n.nodeType === Node.ELEMENT_NODE);
    const selectAttr = element.getAttribute('select');

    // Warn if variable has both select and children (invalid XSLT)
    let messages: { variant: 'warning'; title: string; description: string }[] | undefined;
    if (hasChildren && selectAttr) {
      messages = [
        {
          variant: 'warning' as const,
          title: `Variable "${varName}" has both select attribute and child content`,
          description:
            'XSLT variables should have either select attribute OR child content, not both. The select attribute will be ignored.',
        },
      ];
    }

    /*
     * Select form: restore expression from `select` attribute.
     * Content form: leave expression empty — child elements are deserialized into
     * variableItem.children by MappingSerializerService.restoreElementNode.
     */
    if (!hasChildren) {
      variableItem.expression = selectAttr || '';
    }

    return { mappingItem: variableItem, fieldItem: null, messages };
  }
}

/**
 * Fallback handler for unrecognized XSL elements — round-trips the raw DOM node via {@link UnknownMappingItem}.
 * {@link deserialize()} is never actually used as the fallback decision is directly made in
 * {@link MappingSerializerService.deserialize()}.
 * */
export class UnknownMappingItemHandler implements XsltItemHandler<UnknownMappingItem> {
  readonly itemClass = UnknownMappingItem;
  readonly xsltElementNames: string[] = [];

  serialize(parent: Element, mapping: UnknownMappingItem): Element {
    const imported = parent.ownerDocument.importNode(mapping.element, true);
    parent.appendChild(imported);
    return imported;
  }

  deserialize(
    element: Element,
    _parentField: IParentType,
    parentMapping: MappingParentType,
  ): DeserializeItemResult<UnknownMappingItem> {
    return { mappingItem: new UnknownMappingItem(parentMapping, element), fieldItem: null };
  }
}

/** Single source of truth — every {@link XsltItemHandler} instance. Lookup maps are derived from this array. */
export const allHandlers: XsltItemHandler<MappingItem | SortItem>[] = [
  new ValueOfSelectorHandler(),
  new CopyOfSelectorHandler(),
  new FieldItemHandler(),
  new IfItemHandler(),
  new ChooseItemHandler(),
  new WhenItemHandler(),
  new OtherwiseItemHandler(),
  new SortItemHandler(),
  new ForEachItemHandler(),
  new ForEachGroupItemHandler(),
  new VariableItemHandler(),
  new UnknownMappingItemHandler(),
];

/** Serialize direction: dispatch by {@link MappingItem} constructor. */
export const serializeHandlers: ReadonlyMap<MappingItemClass, XsltItemHandler> = new Map(
  allHandlers
    .filter((h): h is XsltItemHandler & { itemClass: MappingItemClass } => h.itemClass !== undefined)
    .map((h) => [h.itemClass, h]),
);

/** Deserialize direction: dispatch by XSLT element `localName`. */
export const deserializeHandlers: ReadonlyMap<string, XsltItemHandler<MappingItem | SortItem>> = new Map(
  allHandlers.flatMap((h) => h.xsltElementNames.map((name) => [name, h] as const)),
);
