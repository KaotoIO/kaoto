import { ICamelProcessorProperty } from '../../../models';

export const PROCESSOR_NAMES: Map<string, string> = new Map([
  // necessary for different definition names
  ['onWhen', 'when'],
  // route configuration
  ['templateBean', 'beanFactory'],
  // rest configuration
  ['apiProperty', 'restProperty'],
  ['dataFormatProperty', 'restProperty'],
  ['componentProperty', 'restProperty'],
  ['endpointProperty', 'restProperty'],
  ['apiProperty', 'restProperty'],
  ['examples', 'restProperty'],
  ['header', 'responseHeader'],
  //saga
  ['option', 'propertyExpression'],
]);
export const ARRAY_TYPE_NAMES: Map<string, string> = new Map([['allowableValues', 'value']]);

const DEFAULT_XMLNS = ['http://camel.apache.org/schema/spring', 'http://www.w3.org/2001/XMLSchema-instance'];

export function extractAttributesFromXmlElement(
  element: Element,
  properties?: Record<string, ICamelProcessorProperty>,
): { [p: string]: unknown } {
  const attributes: { [key: string]: string } = {};

  for (const attr of element.attributes) {
    if (!properties || properties[attr.name]) {
      attributes[attr.name] = attr.value;
    }
  }

  return attributes;
}

export function collectNamespaces(element: Element): { key: string; value: string }[] {
  let namespaces: { key: string; value: string }[] = [];

  Array.from(element.attributes).forEach((attr) => {
    if (attr.name.startsWith('xmlns')) {
      const ns = attr.name.split(':');
      // don't add camel default NS
      if (!DEFAULT_XMLNS.includes(attr.value)) namespaces.push({ key: ns[1], value: attr.value });
    }
  });

  if (element.parentElement) namespaces = [...collectNamespaces(element.parentElement), ...namespaces];
  return namespaces;
}

export function setNamespaces(element: Element, namespaces: { key: string; value: string }[]): void {
  for (const ns of namespaces) {
    if (!ns) continue;
    element.setAttribute(`xmlns:${ns.key}`, ns.value);
  }
}

export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
