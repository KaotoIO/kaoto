import { DocumentType, IDocument, IField, PrimitiveDocument } from '../models/document';
import { MappingItem, MappingTree } from '../models/mapping';
import xmlFormat from 'xml-formatter';
import { DocumentService } from './document.service';

export const NS_XSL = 'http://www.w3.org/1999/XSL/Transform';
export const EMPTY_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="${NS_XSL}">
  <xsl:output method="xml" indent="yes"/>
  <xsl:template match="/">
  </xsl:template>
</xsl:stylesheet>
`;
export class MappingSerializerService {
  static createNew() {
    return new DOMParser().parseFromString(EMPTY_XSL, 'application/xml');
  }

  static serialize(mappings: MappingTree, sourceParameterMap: Map<string, IDocument>): string {
    const xslt = MappingSerializerService.createNew();
    MappingSerializerService.populateParam(xslt, sourceParameterMap);
    mappings.children.forEach((mapping) => {
      MappingSerializerService.populateMapping(xslt, mapping);
    });
    return xmlFormat(new XMLSerializer().serializeToString(xslt));
  }

  static populateParam(xsltDocument: Document, sourceParameterMap: Map<string, IDocument>) {
    sourceParameterMap.forEach((_doc, paramName) => {
      const prefix = xsltDocument.lookupPrefix(NS_XSL);
      const nsResolver = xsltDocument.createNSResolver(xsltDocument);
      const existing = xsltDocument
        .evaluate(
          `/${prefix}:stylesheet/${prefix}:param[@name='${paramName}']`,
          xsltDocument,
          nsResolver,
          XPathResult.ANY_TYPE,
        )
        .iterateNext();
      if (!existing) {
        const xsltParam = xsltDocument.createElementNS(NS_XSL, 'param');
        xsltParam.setAttribute('name', paramName);
        const template = xsltDocument
          .evaluate(
            `/${prefix}:stylesheet/${prefix}:template[@match='/']`,
            xsltDocument,
            nsResolver,
            XPathResult.ANY_TYPE,
          )
          .iterateNext()!;
        (template.parentNode as Element).insertBefore(xsltParam, template);
      }
    });
  }

  static populateMapping(xsltDocument: Document, mapping: MappingItem) {
    const source = mapping.source;
    const target = mapping.targetFields[0];

    const prefix = xsltDocument.lookupPrefix(NS_XSL);
    const nsResolver = xsltDocument.createNSResolver(xsltDocument);
    // jsdom requires `type` to be specified anyway, but if `type` is specified,
    // Chrome requires NS Resolver to be explicitly specified.
    // Note that `createNSResolver()` returns null with jsdom.
    const template = xsltDocument
      .evaluate(`/${prefix}:stylesheet/${prefix}:template[@match='/']`, xsltDocument, nsResolver, XPathResult.ANY_TYPE)
      .iterateNext() as Element;
    if (!template || template.nodeType !== Node.ELEMENT_NODE) {
      throw Error('No root template in the XSLT document');
    }
    const parent =
      target instanceof PrimitiveDocument
        ? template
        : MappingSerializerService.getOrCreateParent(template as Element, target);
    const sourceXPath = mapping.xpath ? mapping.xpath : MappingSerializerService.getXPath(xsltDocument, source);
    MappingSerializerService.populateSource(parent, sourceXPath, target);
  }

  static getOrCreateParent(template: Element, target: IField) {
    if (!('parent' in target)) {
      return template;
    }

    const xsltDocument = template.ownerDocument;
    const fieldStack: IField[] = DocumentService.getFieldStack(target);
    let parentNode = template;
    while (fieldStack.length) {
      const currentField = fieldStack.pop()!;
      let element: Element | undefined = undefined;
      parentNode.childNodes.forEach((n) => {
        if (
          n.nodeType === Node.ELEMENT_NODE &&
          MappingSerializerService.isInSameNamespace(n as Element, currentField) &&
          (n as Element).localName === currentField.name
        ) {
          element = n as Element;
        }
      });
      if (!element) {
        element = xsltDocument.createElementNS(currentField.namespaceURI, currentField.name);
        parentNode.appendChild(element);
      }
      parentNode = element;
    }
    return parentNode;
  }

  static isInSameNamespace(element: Element, field: IField) {
    if (element.namespaceURI === null || element.namespaceURI === '') {
      return field.namespaceURI === null || field.namespaceURI === '';
    }
    return element.namespaceURI === field.namespaceURI;
  }

  static populateSource(parent: Element, sourceXPath: string, target: IField) {
    const xsltDocument = parent.ownerDocument;
    if (target.isAttribute) {
      const xslAttribute = xsltDocument.createElementNS(NS_XSL, 'attribute');
      xslAttribute.setAttribute('name', target.name);
      parent.appendChild(xslAttribute);
      const valueOf = xsltDocument.createElementNS(NS_XSL, 'value-of');
      valueOf.setAttribute('select', sourceXPath);
      xslAttribute.appendChild(valueOf);
    } else if (target instanceof PrimitiveDocument) {
      const valueOf = xsltDocument.createElementNS(NS_XSL, 'value-of');
      valueOf.setAttribute('select', sourceXPath);
      parent.appendChild(valueOf);
    } else if (target.fields.length > 0) {
      const copyOf = xsltDocument.createElementNS(NS_XSL, 'copy-of');
      copyOf.setAttribute('select', sourceXPath);
      parent.appendChild(copyOf);
    } else {
      const element = xsltDocument.createElementNS(target.namespaceURI, target.name);
      parent.appendChild(element);
      const valueOf = xsltDocument.createElementNS(NS_XSL, 'value-of');
      valueOf.setAttribute('select', sourceXPath);
      element.appendChild(valueOf);
    }
  }

  static getXPath(xsltDocument: Document, source: ITransformation) {
    const fieldStack = DocumentService.getFieldStack(source, true);
    const pathStack: string[] = [];
    while (fieldStack.length) {
      const currentField = fieldStack.pop()!;
      const prefix = MappingSerializerService.getOrCreateNSPrefix(xsltDocument, currentField.namespaceURI);
      pathStack.push(prefix ? prefix + ':' + currentField.expression : currentField.expression);
    }
    const paramPrefix =
      source.ownerDocument.documentType === DocumentType.PARAM ? '$' + source.ownerDocument.documentId : '';
    return source.ownerDocument instanceof PrimitiveDocument ? paramPrefix : paramPrefix + '/' + pathStack.join('/');
  }

  static getOrCreateNSPrefix(xsltDocument: Document, namespace: string | null) {
    const rootElement = xsltDocument.documentElement;
    if (namespace == null || namespace === '') {
      return null;
    }
    const prefix = rootElement.lookupPrefix(namespace);
    if (prefix != null && prefix !== '') {
      return prefix;
    }
    for (let counter = 0; ; counter++) {
      const prefix = 'ns' + counter;
      const existing = rootElement.lookupNamespaceURI(prefix);
      if (!existing) {
        rootElement.setAttribute('xmlns:' + prefix, namespace);
        return prefix;
      }
    }
  }

  static deserialize(xslt: string): MappingTree {
    const xsltDoc = new DOMParser().parseFromString(xslt, 'application/xml');
    const template = xsltDoc.getElementsByTagNameNS(NS_XSL, 'template')[0];
    template.localName;
    return { children: [] };
  }
}
