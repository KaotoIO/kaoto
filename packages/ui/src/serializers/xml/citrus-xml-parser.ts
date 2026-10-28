import { Test, TestActions } from '../../models/citrus/entities/Test';

export const CITRUS_XML_NAMESPACE = 'http://citrusframework.org/schema/xml/testcase'; // NOSONAR - XML namespace URI, not an HTTP request

const XML_DECLARATION_REGEX = /^(?:\s*)<\?xml(?:(?:\s+[^\s>]+))*\s*\?>/;

const KEBAB_TO_CAMEL: Record<string, string> = {
  'create-variables': 'createVariables',
  'create-endpoint': 'createEndpoint',
  'repeat-on-error': 'repeatOnError',
  'wait-for': 'waitFor',
  'stop-time': 'stopTime',
  'stop-timer': 'stopTimer',
  'apply-template': 'applyTemplate',
  'expect-timeout': 'expectTimeout',
  'purge-endpoint': 'purge',
  'purge-jms-queues': 'purgeQueues',
  'purge-channels': 'purgeChannels',
  'trace-variables': 'trace',
  finally: 'doFinally',
};

const CAMEL_TO_KEBAB: Record<string, string> = {};
for (const [kebab, camel] of Object.entries(KEBAB_TO_CAMEL)) {
  CAMEL_TO_KEBAB[camel] = kebab;
}

const ACTION_CONTAINER_TAGS = new Set(['actions', 'when', 'error', 'success']);
const TEXT_ELEMENT_KEYS = new Set(['data', 'payload', 'script']);

function kebabToCamel(name: string): string {
  return KEBAB_TO_CAMEL[name] ?? name;
}

function camelToKebab(name: string): string {
  return CAMEL_TO_KEBAB[name] ?? name;
}

function camelCaseToKebab(name: string): string {
  return name.replace(/[A-Z]/g, (m) => '-' + m.toLowerCase());
}

function kebabCaseToCamel(name: string): string {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

function isPrimitive(value: unknown): value is string | number | boolean {
  return typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean';
}

export function parseXmlDeclaration(xml: string): string {
  const match = XML_DECLARATION_REGEX.exec(xml);
  return match ? match[0] : '';
}

export function parseRootAttributes(xml: string): string[] {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  if (doc.querySelector('parsererror')) return [];

  const root = doc.documentElement;
  const known = new Set(['name', 'author', 'status']);
  const attrs: string[] = [];
  for (const attr of Array.from(root.attributes)) {
    if (known.has(attr.localName) && !attr.namespaceURI) continue;
    if (attr.name === 'xmlns') continue;
    attrs.push(`${attr.name}="${attr.value}"`);
  }
  return attrs;
}

export function parseCitrusXml(xml: string): Test {
  const parser = new DOMParser();
  const doc = parser.parseFromString(xml, 'application/xml');
  const parseError = doc.querySelector('parsererror');
  if (parseError) {
    throw new Error('Invalid Citrus XML');
  }

  const root = doc.documentElement;
  return parseTestElement(root);
}

function parseTestElement(el: Element): Test {
  const test: Test = {
    name: el.getAttribute('name') ?? '',
    actions: [],
  };

  if (el.getAttribute('author')) test.author = el.getAttribute('author')!;
  if (el.getAttribute('status')) test.status = el.getAttribute('status')!;

  for (const child of Array.from(el.children)) {
    const tag = child.localName;
    switch (tag) {
      case 'description':
        test.description = child.textContent ?? '';
        break;
      case 'variables':
        test.variables = parseVariables(child);
        break;
      case 'endpoints':
        test.endpoints = parseEndpoints(child);
        break;
      case 'configuration':
        test.configuration = parseConfiguration(child);
        break;
      case 'actions':
        test.actions = parseActions(child);
        break;
      case 'finally':
        test.finally = parseActions(child);
        break;
    }
  }

  return test;
}

function parseVariables(el: Element): Test['variables'] {
  const variables: NonNullable<Test['variables']> = [];
  for (const child of Array.from(el.children)) {
    if (child.localName === 'variable') {
      variables.push(parseVariable(child));
    }
  }
  return variables;
}

function parseVariable(child: Element): NonNullable<Test['variables']>[number] {
  const variable: NonNullable<Test['variables']>[number] = {
    name: child.getAttribute('name') ?? '',
  };
  if (child.getAttribute('value')) {
    variable.value = child.getAttribute('value')!;
  }
  const valueEl = child.querySelector(':scope > value');
  if (valueEl) {
    const scriptEl = valueEl.querySelector(':scope > script');
    if (scriptEl) {
      variable.script = {
        type: scriptEl.getAttribute('type') ?? undefined,
        content: scriptEl.textContent ?? undefined,
        file: scriptEl.getAttribute('file') ?? undefined,
        charset: scriptEl.getAttribute('charset') ?? undefined,
      };
    }
  }
  return variable;
}

function parseEndpoints(el: Element): Test['endpoints'] {
  const endpoints: NonNullable<Test['endpoints']> = [];
  for (const child of Array.from(el.children)) {
    const endpoint = elementToJson(child);
    endpoints.push({ [child.localName]: endpoint });
  }
  return endpoints;
}

function parseConfiguration(el: Element): Test['configuration'] {
  const config: NonNullable<Test['configuration']> = {};
  const beansEl = el.querySelector(':scope > beans');
  if (beansEl) {
    config.beans = Array.from(beansEl.children)
      .filter((beanEl) => beanEl.localName === 'bean')
      .map(parseBean);
  }
  return config;
}

function parseBean(beanEl: Element): NonNullable<NonNullable<Test['configuration']>['beans']>[number] {
  const bean: NonNullable<NonNullable<Test['configuration']>['beans']>[number] = {
    name: beanEl.getAttribute('name') ?? '',
    type: beanEl.getAttribute('type') ?? '',
  };
  const properties: Record<string, string> = {};
  let hasProperties = false;
  for (const propEl of Array.from(beanEl.children)) {
    if (propEl.localName === 'property') {
      const name = propEl.getAttribute('name');
      const value = propEl.getAttribute('value');
      if (name && value) {
        properties[name] = value;
        hasProperties = true;
      }
    }
  }
  if (hasProperties) bean.properties = properties;
  return bean;
}

function parseActions(el: Element): TestActions[] {
  const actions: TestActions[] = [];
  for (const child of Array.from(el.children)) {
    const actionName = kebabToCamel(child.localName);
    const actionContent = parseActionContent(child, actionName);
    actions.push({ [actionName]: actionContent } as TestActions);
  }
  return actions;
}

function collectAttributes(el: Element): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const attr of Array.from(el.attributes)) {
    if (!attr.namespaceURI) {
      result[kebabCaseToCamel(attr.localName)] = coerceValue(attr.value);
    }
  }
  return result;
}

function groupChildrenByTag(el: Element): Map<string, Element[]> {
  const childMap = new Map<string, Element[]>();
  for (const child of Array.from(el.children)) {
    const tag = child.localName;
    if (!childMap.has(tag)) childMap.set(tag, []);
    childMap.get(tag)!.push(child);
  }
  return childMap;
}

function parseActionContent(el: Element, actionName: string): Record<string, unknown> {
  const result = collectAttributes(el);
  const childMap = groupChildrenByTag(el);

  for (const [tag, elements] of childMap) {
    parseActionChild(result, tag, elements);
  }

  if (actionName === 'createVariables' && !result.variables) {
    result.variables = [];
  }

  return result;
}

function parseActionChild(result: Record<string, unknown>, tag: string, elements: Element[]): void {
  if (ACTION_CONTAINER_TAGS.has(tag)) {
    result[tag] = parseActions(elements[0]);
    return;
  }

  if (tag === 'description') {
    parseDescriptionChild(result, elements);
    return;
  }

  if (tag === 'message') {
    parseMessageChild(result, elements);
    return;
  }

  if (tag === 'variables') {
    result.variables = parseCreateVariables(elements[0]);
    return;
  }

  if (tag === 'variable' && elements.length > 0) {
    result.variables = elements.map((v) => ({
      name: v.getAttribute('name') ?? '',
      ...(v.getAttribute('value') ? { value: v.getAttribute('value')! } : {}),
    }));
    return;
  }

  parseGenericChild(result, tag, elements);
}

function parseDescriptionChild(result: Record<string, unknown>, elements: Element[]): void {
  if (elements.length === 1 && elements[0].children.length === 0) {
    result.description = elements[0].textContent ?? '';
  } else {
    result.description = elementToJson(elements[0]);
  }
}

function parseMessageChild(result: Record<string, unknown>, elements: Element[]): void {
  if (elements.length === 1) {
    result.message =
      elements[0].children.length === 0 && elements[0].attributes.length === 0
        ? (elements[0].textContent ?? '')
        : elementToJson(elements[0]);
  }
}

function parseGenericChild(result: Record<string, unknown>, tag: string, elements: Element[]): void {
  if (elements.length === 1) {
    const child = elements[0];
    result[tag] =
      child.children.length === 0 && child.attributes.length === 0 ? (child.textContent ?? '') : elementToJson(child);
  } else {
    result[tag] = elements.map((e) => elementToJson(e));
  }
}

function parseCreateVariables(el: Element): { name: string; value?: string }[] {
  const vars: { name: string; value?: string }[] = [];
  for (const child of Array.from(el.children)) {
    if (child.localName === 'variable') {
      const v: { name: string; value?: string } = { name: child.getAttribute('name') ?? '' };
      if (child.getAttribute('value')) v.value = child.getAttribute('value')!;
      vars.push(v);
    }
  }
  return vars;
}

function elementToJson(el: Element): Record<string, unknown> {
  if (el.localName === 'payload' && el.children.length > 0) {
    const serializer = new XMLSerializer();
    return {
      '#xml': Array.from(el.childNodes)
        .map((n) => serializer.serializeToString(n))
        .join(''),
    };
  }

  const result = collectAttributes(el);
  const childMap = groupChildrenByTag(el);

  for (const [tag, elements] of childMap) {
    if (elements.length === 1) {
      const child = elements[0];
      result[tag] =
        child.children.length === 0 && child.attributes.length === 0 ? (child.textContent ?? '') : elementToJson(child);
    } else {
      result[tag] = elements.map((e) => elementToJson(e));
    }
  }

  if (el.children.length === 0) {
    const text = el.textContent?.trim();
    if (text) {
      result['#text'] = text;
    }
  }

  return result;
}

function coerceValue(value: string): string | number | boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  const num = Number(value);
  if (Number.isFinite(num) && String(num) === value) return num;
  return value;
}

export function serializeCitrusXml(test: Test, xmlDeclaration?: string, rootAttributes: string[] = []): string {
  const lines: string[] = [];

  lines.push(xmlDeclaration ?? '<?xml version="1.0" encoding="UTF-8"?>');

  const attrs: string[] = [`xmlns="${CITRUS_XML_NAMESPACE}"`, ...rootAttributes];
  if (test.name) attrs.push(`name="${escapeXml(test.name)}"`);
  if (test.author) attrs.push(`author="${escapeXml(test.author)}"`);
  if (test.status) attrs.push(`status="${escapeXml(test.status)}"`);

  lines.push(`<test ${attrs.join(' ')}>`);

  if (test.description) {
    lines.push(`  <description>${escapeXml(test.description)}</description>`);
  }

  serializeVariables(test, lines);
  serializeEndpoints(test, lines);
  serializeConfiguration(test, lines);

  if (test.actions?.length) {
    lines.push('  <actions>');
    serializeActions(test.actions, lines, 2);
    lines.push('  </actions>');
  }

  if (test.finally?.length) {
    lines.push('  <finally>');
    serializeActions(test.finally, lines, 2);
    lines.push('  </finally>');
  }

  lines.push('</test>');
  return lines.join('\n') + '\n';
}

function serializeVariables(test: Test, lines: string[]): void {
  if (!test.variables?.length) return;

  lines.push('  <variables>');
  for (const v of test.variables) {
    if (v.script) {
      serializeScriptVariable(v, lines);
    } else if (v.value !== undefined) {
      lines.push(`    <variable name="${escapeXml(v.name)}" value="${escapeXml(v.value)}"/>`);
    } else {
      lines.push(`    <variable name="${escapeXml(v.name)}"/>`);
    }
  }
  lines.push('  </variables>');
}

function serializeScriptVariable(v: NonNullable<Test['variables']>[number], lines: string[]): void {
  lines.push(`    <variable name="${escapeXml(v.name)}">`, '      <value>');
  const scriptAttrs = [`type="${escapeXml(v.script!.type ?? '')}"`];
  if (v.script!.file) scriptAttrs.push(`file="${escapeXml(v.script!.file)}"`);
  if (v.script!.charset) scriptAttrs.push(`charset="${escapeXml(v.script!.charset)}"`);
  lines.push(
    `        <script ${scriptAttrs.join(' ')}>${escapeXml(v.script!.content ?? '')}</script>`,
    '      </value>',
    '    </variable>',
  );
}

function serializeEndpoints(test: Test, lines: string[]): void {
  if (!test.endpoints?.length) return;

  lines.push('  <endpoints>');
  for (const endpoint of test.endpoints) {
    const ep = endpoint as Record<string, unknown>;
    for (const [type, content] of Object.entries(ep)) {
      serializeJsonElement(content as Record<string, unknown>, type, lines, 2);
    }
  }
  lines.push('  </endpoints>');
}

function serializeConfiguration(test: Test, lines: string[]): void {
  if (!test.configuration) return;

  lines.push('  <configuration>');
  if (test.configuration.beans?.length) {
    lines.push('    <beans>');
    for (const bean of test.configuration.beans) {
      serializeBean(bean, lines);
    }
    lines.push('    </beans>');
  }
  lines.push('  </configuration>');
}

function serializeBean(bean: NonNullable<NonNullable<Test['configuration']>['beans']>[number], lines: string[]): void {
  if (bean.properties && Object.keys(bean.properties).length > 0) {
    lines.push(`      <bean name="${escapeXml(bean.name)}" type="${escapeXml(bean.type)}">`);
    for (const [k, v] of Object.entries(bean.properties)) {
      lines.push(`        <property name="${escapeXml(k)}" value="${escapeXml(v)}"/>`);
    }
    lines.push('      </bean>');
  } else {
    lines.push(`      <bean name="${escapeXml(bean.name)}" type="${escapeXml(bean.type)}"/>`);
  }
}

function serializeActions(actions: TestActions[], lines: string[], depth: number): void {
  for (const action of actions) {
    for (const [key, value] of Object.entries(action)) {
      if (value === undefined || value === null) continue;
      const xmlTag = camelToKebab(key);
      serializeActionElement(value as Record<string, unknown>, xmlTag, lines, depth);
    }
  }
}

function classifyActionEntry(key: string, value: unknown): 'container' | 'variables' | 'text' | 'attr' | 'child' {
  if (ACTION_CONTAINER_TAGS.has(key)) return 'container';
  if (key === 'variables' && Array.isArray(value)) return 'variables';
  if (isPrimitive(value)) {
    return key === 'message' || key === 'description' || TEXT_ELEMENT_KEYS.has(key) ? 'text' : 'attr';
  }
  if (typeof value === 'object') return 'child';
  return 'attr';
}

function serializeActionElement(
  content: Record<string, unknown>,
  xmlTag: string,
  lines: string[],
  depth: number,
): void {
  const indent = '  '.repeat(depth);
  const attrs: string[] = [];
  const children: [string, unknown][] = [];

  for (const [key, value] of Object.entries(content)) {
    if (value === undefined || value === null) continue;
    const kind = classifyActionEntry(key, value);
    if (kind === 'attr' && isPrimitive(value)) {
      attrs.push(`${camelCaseToKebab(key)}="${escapeXml(String(value))}"`);
    } else if (kind !== 'attr') {
      children.push([key, value]);
    }
  }

  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  if (children.length === 0) {
    lines.push(`${indent}  <${xmlTag}${attrStr}/>`);
    return;
  }

  lines.push(`${indent}  <${xmlTag}${attrStr}>`);
  for (const [key, value] of children) {
    serializeActionChild(key, value, lines, depth);
  }
  lines.push(`${indent}  </${xmlTag}>`);
}

function serializeActionChild(key: string, value: unknown, lines: string[], depth: number): void {
  if (ACTION_CONTAINER_TAGS.has(key)) {
    serializeContainerChild(key, value as TestActions[], lines, depth);
    return;
  }

  if (key === 'variables' && Array.isArray(value)) {
    serializeInlineVariables(value as { name: string; value?: string }[], lines, depth);
    return;
  }

  if (key === 'message' || key === 'description' || TEXT_ELEMENT_KEYS.has(key)) {
    serializeTextChild(key, value, lines, depth);
    return;
  }

  serializeObjectOrArrayChild(key, value, lines, depth);
}

function serializeContainerChild(key: string, actions: TestActions[], lines: string[], depth: number): void {
  const childIndent = '  '.repeat(depth + 1);
  lines.push(`${childIndent}  <${key}>`);
  serializeActions(actions, lines, depth + 2);
  lines.push(`${childIndent}  </${key}>`);
}

function serializeInlineVariables(variables: { name: string; value?: string }[], lines: string[], depth: number): void {
  const childIndent = '  '.repeat(depth + 1);
  for (const v of variables) {
    if (v.value !== undefined) {
      lines.push(`${childIndent}  <variable name="${escapeXml(v.name)}" value="${escapeXml(v.value)}"/>`);
    } else {
      lines.push(`${childIndent}  <variable name="${escapeXml(v.name)}"/>`);
    }
  }
}

function serializeTextChild(key: string, value: unknown, lines: string[], depth: number): void {
  const childIndent = '  '.repeat(depth + 1);
  if (typeof value === 'object' && value !== null) {
    serializeJsonElement(value as Record<string, unknown>, key, lines, depth + 1, true);
  } else {
    lines.push(`${childIndent}  <${key}>${escapeXml(String(value))}</${key}>`);
  }
}

function serializeObjectOrArrayChild(key: string, value: unknown, lines: string[], depth: number): void {
  if (typeof value === 'object' && !Array.isArray(value)) {
    serializeJsonElement(value as Record<string, unknown>, key, lines, depth + 1);
  } else if (Array.isArray(value)) {
    for (const item of value) {
      if (typeof item === 'object') {
        serializeJsonElement(item as Record<string, unknown>, key, lines, depth + 1);
      }
    }
  }
}

function classifyJsonEntry(
  key: string,
  value: unknown,
  textAsChildren: boolean,
): 'text' | 'textChild' | 'attr' | 'child' {
  if (key === '#text' && isPrimitive(value)) return 'text';
  if (isPrimitive(value)) {
    return textAsChildren && TEXT_ELEMENT_KEYS.has(key) ? 'textChild' : 'attr';
  }
  return 'child';
}

function partitionJsonEntries(
  obj: Record<string, unknown>,
  textAsChildren: boolean,
): { attrs: string[]; children: [string, unknown][]; textContent: string | undefined; rawXml: string | undefined } {
  const attrs: string[] = [];
  const children: [string, unknown][] = [];
  let textContent: string | undefined;
  let rawXml: string | undefined;

  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null) continue;
    if (key === '#xml' && typeof value === 'string') {
      rawXml = value;
      continue;
    }
    const kind = classifyJsonEntry(key, value, textAsChildren);
    if (kind === 'text' && isPrimitive(value)) {
      textContent = String(value);
    } else if (kind === 'attr' && isPrimitive(value)) {
      attrs.push(`${camelCaseToKebab(key)}="${escapeXml(String(value))}"`);
    } else if (kind !== 'text' && kind !== 'attr') {
      children.push([key, value]);
    }
  }

  return { attrs, children, textContent, rawXml };
}

function serializeJsonElement(
  obj: Record<string, unknown>,
  tag: string,
  lines: string[],
  depth: number,
  textAsChildren = false,
): void {
  const indent = '  '.repeat(depth);
  const { attrs, children, textContent, rawXml } = partitionJsonEntries(obj, textAsChildren);
  const attrStr = attrs.length > 0 ? ' ' + attrs.join(' ') : '';

  if (rawXml !== undefined) {
    lines.push(`${indent}  <${tag}${attrStr}>${rawXml}</${tag}>`);
    return;
  }

  if (children.length === 0 && textContent === undefined) {
    lines.push(`${indent}  <${tag}${attrStr}/>`);
    return;
  }

  if (children.length === 0 && textContent !== undefined) {
    lines.push(`${indent}  <${tag}${attrStr}>${escapeXml(textContent)}</${tag}>`);
    return;
  }

  lines.push(`${indent}  <${tag}${attrStr}>`);
  if (textContent !== undefined) {
    lines.push(`${'  '.repeat(depth + 1)}  ${escapeXml(textContent)}`);
  }
  for (const [key, value] of children) {
    serializeJsonChild(key, value, lines, depth, textAsChildren);
  }
  lines.push(`${indent}  </${tag}>`);
}

function serializeJsonChild(
  key: string,
  value: unknown,
  lines: string[],
  depth: number,
  textAsChildren: boolean,
): void {
  if (isPrimitive(value)) {
    const childIndent = '  '.repeat(depth + 1);
    lines.push(`${childIndent}  <${camelCaseToKebab(key)}>${escapeXml(String(value))}</${camelCaseToKebab(key)}>`);
  } else if (typeof value === 'object' && !Array.isArray(value)) {
    serializeJsonElement(value as Record<string, unknown>, key, lines, depth + 1, textAsChildren);
  } else if (Array.isArray(value)) {
    serializeJsonArray(key, value, lines, depth, textAsChildren);
  }
}

function serializeJsonArray(
  key: string,
  items: unknown[],
  lines: string[],
  depth: number,
  textAsChildren: boolean,
): void {
  const indent = '  '.repeat(depth + 1);
  const singularTag = key.endsWith('s') ? key.slice(0, -1) : key;
  lines.push(`${indent}  <${key}>`);
  for (const item of items) {
    if (typeof item === 'object') {
      serializeJsonElement(item as Record<string, unknown>, singularTag, lines, depth + 2, textAsChildren);
    }
  }
  lines.push(`${indent}  </${key}>`);
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}
