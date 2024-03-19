import { IField, IMapping } from '../models';
import xmlFormat from 'xml-formatter';

export const NS_XSL = 'http://www.w3.org/1999/XSL/Transform';
export const EMPTY_XSL = `<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet xmlns:xsl="${NS_XSL}">
  <xsl:template match="/">
  </xsl:template>
</xsl:stylesheet>
`;
export class MappingSerializerService {
  static createNew() {
    return new DOMParser().parseFromString(EMPTY_XSL, 'text/xml');
  }

  static serialize(mappings: IMapping[]): string {
    const xslt = MappingSerializerService.createNew();
    mappings.forEach((mapping) => {
      const source = mapping.sourceFields[0];
      const target = mapping.targetFields[0];
      MappingSerializerService.populateMapping(xslt, source, target);
    });
    return xmlFormat(new XMLSerializer().serializeToString(xslt));
  }

  static populateMapping(xsltDocument: Document, source: IField, target: IField) {
    const nsResolver = xsltDocument.createNSResolver(xsltDocument);
    const prefix = nsResolver.lookupPrefix(NS_XSL);
    const template = xsltDocument
      .evaluate(`/${prefix}:stylesheet/${prefix}:template[@match='/']`, xsltDocument, nsResolver)
      .iterateNext();
    if (!template || template.nodeType !== Node.ELEMENT_NODE) {
      throw Error('No root template in the XSLT document');
    }
    const parent = MappingSerializerService.getOrCreateParent(template as Element, target);
    MappingSerializerService.putSource(parent, source, target);
  }

  static getOrCreateParent(template: Element, target: IField) {
    if (!('parent' in target)) {
      return template;
    }

    const xsltDocument = template.ownerDocument;
    const fieldStack: IField[] = MappingSerializerService.getFieldStack(target);
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

  static getFieldStack(field: IField, includeItself: boolean = false) {
    const fieldStack: IField[] = [];
    if (includeItself) fieldStack.push(field);
    for (let next = field.parent; 'parent' in next; next = (next as IField).parent) {
      fieldStack.push(next);
    }
    return fieldStack;
  }

  static isInSameNamespace(element: Element, field: IField) {
    if (element.namespaceURI === null || element.namespaceURI === '') {
      return field.namespaceURI === null || field.namespaceURI === '';
    }
    return element.namespaceURI === field.namespaceURI;
  }

  static putSource(parent: Element, source: IField, target: IField) {
    const xsltDocument = parent.ownerDocument;
    const sourceXPath = MappingSerializerService.getXPath(xsltDocument, source);
    if (target.isAttribute) {
      const xslAttribute = xsltDocument.createElementNS(NS_XSL, 'attribute');
      xslAttribute.setAttribute('name', target.name);
      parent.appendChild(xslAttribute);
      const valueOf = xsltDocument.createElementNS(NS_XSL, 'value-of');
      valueOf.setAttribute('select', sourceXPath);
      xslAttribute.appendChild(valueOf);
    } else {
      const element = xsltDocument.createElementNS(target.namespaceURI, target.name);
      parent.appendChild(element);
      const valueOf = xsltDocument.createElementNS(NS_XSL, 'value-of');
      valueOf.setAttribute('select', sourceXPath);
      element.appendChild(valueOf);
    }
  }

  static getXPath(xsltDocument: Document, field: IField) {
    const fieldStack = MappingSerializerService.getFieldStack(field, true);
    const pathStack: string[] = [];
    while (fieldStack.length) {
      const currentField = fieldStack.pop()!;
      const prefix = MappingSerializerService.getOrCreateNSPrefix(xsltDocument, currentField.namespaceURI);
      pathStack.push(prefix ? prefix + ':' + currentField.expression : currentField.expression);
    }
    return '/' + pathStack.join('/');
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

  static deserialize(xslt: string): IMapping[] {
    const xsltDoc = new DOMParser().parseFromString(xslt, 'application/xml');
    const template = xsltDoc.getElementsByTagNameNS(NS_XSL, 'template')[0];
    template.localName;
    const answer: IMapping[] = [];

    return answer;
  }
}
