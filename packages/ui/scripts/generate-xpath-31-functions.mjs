// @ts-check
/**
 * Generates the XPath 3.1 function catalog for the DataMapper from W3C specifications.
 *
 * Fetches two W3C sources:
 * - function-catalog.xml — machine-readable function signatures (names, arguments, return types)
 * - xpath-functions.xml — spec source with section hierarchy used to classify functions into groups
 *
 * The generator reads the project's Types enum and FUNCTION_GROUPS const at generation time
 * so that generated code stays in sync with the codebase without duplicating type knowledge.
 *
 * Output: one TypeScript file per function group under src/services/xpath/3.1/, plus an
 * aggregator that re-exports them all. Groups marked as hand-written in GROUP_CONFIG are
 * imported by the aggregator but their files are never overwritten.
 *
 * Run: yarn generate:xpath-functions
 *
 * @module generate-xpath-31-functions
 */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

import { XMLParser } from 'fast-xml-parser';
import prettier from 'prettier';

const CATALOG_URL = 'https://www.w3.org/TR/xpath-functions-31/function-catalog.xml';
const SPEC_SOURCE_URL =
  'https://raw.githubusercontent.com/w3c/qtspecs/6cef5545618cd2edfd94f32af488a16bb19c598c/specifications/xpath-functions-31/src/xpath-functions.xml';
const OUTPUT_DIR = 'src/services/xpath/3.1';

const TYPES_TS_PATH = 'src/models/datamapper/types.ts';
const XPATH_MODEL_PATH = 'src/services/xpath/xpath-model.ts';

/**
 * XDM types that don't have a 1:1 matching Types enum value.
 * Mapped to the enum MEMBER NAME (not the code string).
 */
const XDM_TYPE_OVERRIDES = {
  'xs:NOTATION': 'AnyAtomicType',
  'xs:gYearMonth': 'AnyAtomicType',
  'xs:gYear': 'AnyAtomicType',
  'xs:gMonthDay': 'AnyAtomicType',
  'xs:gDay': 'AnyAtomicType',
  'xs:gMonth': 'AnyAtomicType',
  'xs:dateTimeStamp': 'DateTime',
  'xs:base64Binary': 'String',
  'xs:hexBinary': 'String',
  'xs:language': 'String',
  'xs:nonNegativeInteger': 'Integer',
  'xs:yearMonthDuration': 'Duration',
  'array(*)': 'Array',
  'comment()': 'AnyType',
  'processing-instruction()': 'AnyType',
  none: 'EmptySequence',
};

/** @type {Map<string, string>} enum value → member name, populated by loadTypesEnum() */
let enumValueToMember = new Map();
/** @type {Set<string>} spec types that fell back to a generic mapping */
const unmappedTypes = new Set();

async function loadTypesEnum() {
  const content = await readFile(TYPES_TS_PATH, 'utf-8');
  const enumMatch = content.match(/export enum Types \{([^}]*)\}/);
  if (!enumMatch) throw new Error(`Could not find Types enum in ${TYPES_TS_PATH}`);

  const memberRegex = /(\w+) = '([^']+)'/g;
  let m;
  while ((m = memberRegex.exec(enumMatch[1])) !== null) {
    enumValueToMember.set(m[2], m[1]);
  }
  console.log(`Loaded ${enumValueToMember.size} Types enum members from ${TYPES_TS_PATH}`);

  for (const memberName of Object.values(XDM_TYPE_OVERRIDES)) {
    if (![...enumValueToMember.values()].includes(memberName)) {
      throw new Error(`XDM_TYPE_OVERRIDES references Types.${memberName} which doesn't exist in ${TYPES_TS_PATH}`);
    }
  }
}

async function loadFunctionGroups() {
  const content = await readFile(XPATH_MODEL_PATH, 'utf-8');
  const match = content.match(/export const FUNCTION_GROUPS\s*=\s*\{([^}]*)\}\s*as\s+const/);
  if (!match) throw new Error(`Could not find FUNCTION_GROUPS in ${XPATH_MODEL_PATH}`);

  const keys = new Set();
  const memberRegex = /(\w+)\s?:/g;
  let m;
  while ((m = memberRegex.exec(match[1])) !== null) {
    keys.add(m[1]);
  }
  console.log(`Loaded ${keys.size} FunctionGroup keys from ${XPATH_MODEL_PATH}`);

  const configKeys = new Set(Object.keys(GROUP_CONFIG));
  for (const key of keys) {
    if (!configKeys.has(key)) {
      throw new Error(`FUNCTION_GROUPS has '${key}' but GROUP_CONFIG is missing it — add an entry to GROUP_CONFIG`);
    }
  }
  for (const key of configKeys) {
    if (!keys.has(key)) {
      throw new Error(`GROUP_CONFIG has '${key}' but FUNCTION_GROUPS is missing it — add it to ${XPATH_MODEL_PATH}`);
    }
  }
}

function resolveXdmType(xdmType) {
  if (XDM_TYPE_OVERRIDES[xdmType]) {
    return `Types.${XDM_TYPE_OVERRIDES[xdmType]}`;
  }

  if (enumValueToMember.has(xdmType)) {
    return `Types.${enumValueToMember.get(xdmType)}`;
  }

  if (xdmType.startsWith('xs:')) {
    const localName = xdmType.slice(3);
    if (enumValueToMember.has(localName)) {
      return `Types.${enumValueToMember.get(localName)}`;
    }
  }

  return null;
}

/**
 * Maps spec section IDs (div1/div2 @id) to internal FunctionGroup keys.
 * The generator resolves most-specific section first (div3 > div2 > div1)
 * and falls back to parent sections. If a function has section info but no
 * mapping here, generation fails — add an explicit entry to fix it.
 */
const SECTION_TO_GROUP = {
  accessors: 'Node',
  'errors-and-diagnostics': 'Context',
  'numeric-functions': 'Numeric',
  'string-functions': 'String',
  'anyURI-functions': 'String',
  'boolean-functions': 'Boolean',
  durations: 'DateAndTime',
  'dates-times': 'DateAndTime',
  'QName-funcs': 'QName',
  'node-functions': 'Node',
  'sequence-functions': 'Sequence',
  'json-functions': 'Sequence',
  context: 'Context',
  'higher-order-functions': 'HigherOrder',
  'substring.functions': 'SubstringMatching',
  'string.match': 'PatternMatching',
  'map-functions': 'MapFunctions',
  'array-functions': 'ArrayFunctions',
};

const GROUP_CONFIG = {
  String:            { filename: 'string',            varName: 'stringFunctions' },
  SubstringMatching: { filename: 'substringmatching', varName: 'substringMatchingFunctions' },
  PatternMatching:   { filename: 'patternmatching',   varName: 'patternMatchingFunctions' },
  Numeric:           { filename: 'numeric',           varName: 'numericFunctions' },
  DateAndTime:       { filename: 'datetime',          varName: 'dateAndTimeFunctions' },
  Boolean:           { filename: 'boolean',           varName: 'booleanFunctions' },
  QName:             { filename: 'qname',             varName: 'qnameFunctions' },
  Node:              { filename: 'node',              varName: 'nodeFunctions' },
  Sequence:          { filename: 'sequence',          varName: 'sequenceFunctions' },
  Context:           { filename: 'context',           varName: 'contextFunctions' },
  Math:              { filename: 'math',              varName: 'mathFunctions' },
  MapFunctions:      { filename: 'map',               varName: 'mapFunctions' },
  ArrayFunctions:    { filename: 'array',             varName: 'arrayFunctions' },
  HigherOrder:       { filename: 'higherorder',       varName: 'higherOrderFunctions' },
  XSLT:              { filename: 'xslt',              varName: 'xsltFunctions', handWritten: true },
};

/**
 * Parses the W3C spec source XML to build a map from 'prefix:name' to its
 * enclosing section hierarchy ({div1, div2, div3}).
 *
 * The spec uses <?function prefix:name?> processing instructions within
 * div1/div2/div3 sections to reference function definitions.
 */
function buildFunctionSectionMap(specXml) {
  const events = [];

  const divOpenRegex = /<(div[1-3])\s[^>]*?id="([^"]+)"[^>]*>/g;
  let m;
  while ((m = divOpenRegex.exec(specXml)) !== null) {
    events.push({ pos: m.index, type: 'open', level: m[1], id: m[2] });
  }

  const divCloseRegex = /<\/(div[1-3])\s*>/g;
  while ((m = divCloseRegex.exec(specXml)) !== null) {
    events.push({ pos: m.index, type: 'close', level: m[1] });
  }

  const funcRegex = /<\?function\s+(\w+):([\w-]+)\s*\?>/g;
  while ((m = funcRegex.exec(specXml)) !== null) {
    events.push({ pos: m.index, type: 'func', prefix: m[1], name: m[2] });
  }

  events.sort((a, b) => a.pos - b.pos);

  /** @type {Map<string, {div1: string|null, div2: string|null, div3: string|null}>} */
  const map = new Map();
  const DIV_LEVELS = ['div1', 'div2', 'div3'];
  const ids = [null, null, null];

  for (const event of events) {
    const levelIdx = DIV_LEVELS.indexOf(event.level);
    if (event.type === 'open') {
      ids[levelIdx] = event.id;
      for (let i = levelIdx + 1; i < ids.length; i++) ids[i] = null;
    } else if (event.type === 'close') {
      for (let i = levelIdx; i < ids.length; i++) ids[i] = null;
    } else {
      map.set(`${event.prefix}:${event.name}`, { div1: ids[0], div2: ids[1], div3: ids[2] });
    }
  }

  return map;
}

function resolveGroupFromSection(sectionInfo) {
  if (!sectionInfo) return null;
  for (const sectionId of [sectionInfo.div3, sectionInfo.div2, sectionInfo.div1]) {
    if (sectionId && SECTION_TO_GROUP[sectionId]) {
      return SECTION_TO_GROUP[sectionId];
    }
  }
  return null;
}

function resolveGroup(name, prefix, sectionMap) {
  if (prefix === 'math') return 'Math';
  if (prefix === 'map') return 'MapFunctions';
  if (prefix === 'array') return 'ArrayFunctions';

  const sectionInfo = sectionMap.get(`${prefix}:${name}`);
  const group = resolveGroupFromSection(sectionInfo);
  if (group) return group;

  if (sectionInfo) {
    const sectionPath = [sectionInfo.div1, sectionInfo.div2, sectionInfo.div3].filter(Boolean).join(' > ');
    throw new Error(`No SECTION_TO_GROUP mapping for ${prefix}:${name} in section hierarchy: ${sectionPath}`);
  }

  return 'Sequence';
}

function parseTypeString(typeStr) {
  if (!typeStr) return { typesEnum: resolveXdmType('item()'), cardinality: '' };

  const trimmed = typeStr.trim();

  if (trimmed === 'none') return { typesEnum: resolveXdmType('none'), cardinality: '' };
  if (trimmed === 'empty-sequence()') return { typesEnum: resolveXdmType('empty-sequence()'), cardinality: '' };

  // Function types with explicit return-type annotations (e.g. function(item()) as item()*)
  // — the trailing cardinality belongs to the return type, not the function argument itself
  if (trimmed.startsWith('function(') && trimmed !== 'function(*)') {
    return { typesEnum: resolveXdmType('function(*)'), cardinality: '' };
  }

  let cardinality = '';
  let baseType = trimmed;
  const lastChar = trimmed[trimmed.length - 1];

  if (lastChar === '?' || lastChar === '+') {
    cardinality = lastChar;
    baseType = trimmed.slice(0, -1);
  } else if (lastChar === '*' && !baseType.endsWith('(*)')) {
    cardinality = '*';
    baseType = trimmed.slice(0, -1);
  }

  const mapped = resolveXdmType(baseType);
  if (mapped) return { typesEnum: mapped, cardinality };

  if (baseType.startsWith('xs:')) {
    unmappedTypes.add(baseType);
    return { typesEnum: resolveXdmType('xs:anyAtomicType'), cardinality };
  }
  if (baseType.startsWith('map(')) return { typesEnum: resolveXdmType('map(*)'), cardinality };
  if (baseType.startsWith('array(')) return { typesEnum: resolveXdmType('array(*)'), cardinality };
  if (baseType.startsWith('element(')) return { typesEnum: resolveXdmType('element()'), cardinality };

  unmappedTypes.add(baseType);
  return { typesEnum: resolveXdmType('item()'), cardinality };
}

function cardinalityToOccurs(cardinality) {
  switch (cardinality) {
    case '?':
      return { minOccurs: 0, maxOccurs: 1 };
    case '*':
      return { minOccurs: 0, maxOccurs: 'Number.MAX_SAFE_INTEGER' };
    case '+':
      return { minOccurs: 1, maxOccurs: 'Number.MAX_SAFE_INTEGER' };
    default:
      return { minOccurs: 1, maxOccurs: 1 };
  }
}

function isCollection(cardinality) {
  return cardinality === '*' || cardinality === '+';
}

function stripXmlTags(xml) {
  let result = '';
  let inTag = false;
  for (const ch of xml) {
    if (ch === '<') {
      inTag = true;
    } else if (ch === '>') {
      inTag = false;
    } else if (!inTag) {
      result += ch;
    }
  }
  return result.replace(/\s+/g, ' ').trim();
}

function buildSummaryMap(rawXml) {
  const map = new Map();
  const tagRegex = /<fos:function\s([^>]*)>/g;
  let match;
  while ((match = tagRegex.exec(rawXml)) !== null) {
    const attrs = match[1];
    const nameMatch = /\bname="([^"]+)"/.exec(attrs);
    const prefixMatch = /\bprefix="([^"]+)"/.exec(attrs);
    if (!nameMatch || !prefixMatch) continue;

    const startPos = match.index;
    const endPos = rawXml.indexOf('</fos:function>', startPos);
    if (endPos === -1) continue;

    const funcXml = rawXml.substring(startPos, endPos);
    const summaryMatch = funcXml.match(/<fos:summary>([^<]*(?:<(?!\/fos:summary>)[^<]*)*)<\/fos:summary>/);
    if (summaryMatch) {
      const key = `${prefixMatch[1]}:${nameMatch[1]}`;
      map.set(key, stripXmlTags(summaryMatch[1]));
    }
  }
  return map;
}

function toDisplayName(name) {
  return name
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function ensureArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function mergeSignatures(protos) {
  const sorted = [...protos].sort((a, b) => {
    const aLen = ensureArray(a['fos:arg']).length;
    const bLen = ensureArray(b['fos:arg']).length;
    return bLen - aLen;
  });

  const longest = sorted[0];
  const longestArgs = ensureArray(longest['fos:arg']);
  const shortestArgCount = Math.min(...protos.map((p) => ensureArray(p['fos:arg']).length));

  const args = longestArgs.map((arg, i) => {
    const typeStr = arg['@_type'] || 'item()';
    const { typesEnum, cardinality } = parseTypeString(typeStr);
    const occurs = cardinalityToOccurs(cardinality);
    const argName = arg['@_name'] || `arg${i + 1}`;

    if (i >= shortestArgCount) {
      occurs.minOccurs = 0;
    }

    return {
      name: argName,
      displayName: `$${argName}`,
      description: toDisplayName(argName),
      type: typesEnum,
      minOccurs: occurs.minOccurs,
      maxOccurs: occurs.maxOccurs,
    };
  });

  const returnTypeStr = longest['@_return-type'] || 'item()*';
  const { typesEnum: returnType, cardinality: returnCardinality } = parseTypeString(returnTypeStr);

  return { args, returnType, returnCollection: isCollection(returnCardinality) };
}

function processFunction(func, summaryMap, sectionMap) {
  const name = func['@_name'];
  const prefix = func['@_prefix'];

  if (prefix === 'op') return null;

  const protos = ensureArray(func['fos:signatures']?.['fos:proto']);
  if (protos.length === 0) return null;

  const group = resolveGroup(name, prefix, sectionMap);
  const summary = summaryMap.get(`${prefix}:${name}`) || '';
  const displayName = toDisplayName(name);

  let funcDef;
  if (name === 'concat' && prefix === 'fn') {
    funcDef = {
      name,
      displayName: 'Concatenate',
      description: summary || 'Concatenates two or more xs:anyAtomicType arguments cast to xs:string.',
      returnType: 'Types.String',
      returnCollection: false,
      args: [
        {
          name: 'args',
          displayName: '$args',
          description: 'Arguments',
          type: 'Types.AnyAtomicType',
          minOccurs: 2,
          maxOccurs: 'Number.MAX_SAFE_INTEGER',
        },
      ],
    };
  } else {
    const { args, returnType, returnCollection } = mergeSignatures(protos);
    funcDef = { name, displayName, description: summary, returnType, returnCollection, args };
  }

  const functionName = prefix === 'fn' ? name : `${prefix}:${name}`;

  return { group, functionName, ...funcDef };
}

function escapeString(str) {
  return str.replaceAll('\\', String.raw`\\`).replaceAll("'", String.raw`\'`).replaceAll('\n', String.raw`\n`);
}

function generateFunctionEntry(func) {
  const lines = [
    '  {',
    `    name: '${escapeString(func.functionName)}',`,
    `    displayName: '${escapeString(func.displayName)}',`,
    `    description: '${escapeString(func.description)}',`,
    `    returnType: ${func.returnType},`,
  ];
  if (func.returnCollection) {
    lines.push('    returnCollection: true,');
  }
  lines.push('    arguments: [');

  for (const arg of func.args) {
    const parts = [
      `name: '${escapeString(arg.name)}'`,
      `displayName: '${escapeString(arg.displayName)}'`,
      `description: '${escapeString(arg.description)}'`,
      `type: ${arg.type}`,
      `minOccurs: ${arg.minOccurs}`,
      `maxOccurs: ${arg.maxOccurs}`,
    ];
    const oneLine = `      { ${parts.join(', ')} },`;
    if (oneLine.length <= 120) {
      lines.push(oneLine);
    } else {
      lines.push(
        '      {',
        ...parts.map((p) => `        ${p},`),
        '      },',
      );
    }
  }

  lines.push('    ],', '  },');
  return lines.join('\n');
}

function generateGroupFile(groupKey, functions) {
  const varName = GROUP_CONFIG[groupKey].varName;
  const entries = functions.map(generateFunctionEntry).join('\n');

  return `// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: ${CATALOG_URL}
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { Types } from '../../../models/datamapper/types';

export const ${varName}: IFunctionDefinition[] = [
${entries}
];
`;
}

function generateAggregator(groupKeys) {
  const imports = [];
  const entries = [];

  for (const groupKey of groupKeys) {
    const { varName, filename } = GROUP_CONFIG[groupKey];
    imports.push(`import { ${varName} } from './xpath-3.1-functions-${filename}';`);
    entries.push(`  ${groupKey}: ${varName},`);
  }
  imports.sort((a, b) => a.localeCompare(b));

  return `// AUTO-GENERATED — DO NOT EDIT MANUALLY
// Regenerate with: yarn generate:xpath-functions
// Source: ${CATALOG_URL}
import { IFunctionDefinition } from '../../../models/datamapper/mapping';
import { FunctionGroup } from '../xpath-model';
${imports.join('\n')}

export const XPATH_3_1_FUNCTIONS: Record<FunctionGroup, IFunctionDefinition[]> = {
${entries.join('\n')}
};
`;
}

async function fetchSpecSources() {
  console.log('Fetching function catalog and spec source...');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);

  try {
    const [catalogResponse, specResponse] = await Promise.all([
      fetch(CATALOG_URL, { signal: controller.signal }),
      fetch(SPEC_SOURCE_URL, { signal: controller.signal }),
    ]);

    if (!catalogResponse.ok) {
      throw new Error(`Failed to fetch catalog: ${catalogResponse.status} ${catalogResponse.statusText}`);
    }
    if (!specResponse.ok) {
      throw new Error(`Failed to fetch spec source: ${specResponse.status} ${specResponse.statusText}`);
    }

    const catalogXml = await catalogResponse.text();
    const specXml = await specResponse.text();
    console.log(`Downloaded catalog (${catalogXml.length} bytes) and spec source (${specXml.length} bytes)`);
    return { catalogXml, specXml };
  } finally {
    clearTimeout(timeout);
  }
}

function groupFunctions(functions, summaryMap, sectionMap) {
  /** @type {Record<string, Array<*>>} */
  const grouped = {};
  let skippedOp = 0;
  let processed = 0;
  const unmappedFunctions = [];

  for (const func of functions) {
    const result = processFunction(func, summaryMap, sectionMap);
    if (!result) {
      skippedOp++;
      continue;
    }
    processed++;
    const { group } = result;
    if (!grouped[group]) grouped[group] = [];
    grouped[group].push(result);

    const key = `${func['@_prefix']}:${func['@_name']}`;
    if (!sectionMap.has(key) && func['@_prefix'] !== 'op') {
      unmappedFunctions.push(key);
    }
  }

  if (unmappedFunctions.length > 0) {
    console.log(`\nNote: ${unmappedFunctions.length} functions not found in spec source (defaulted to Sequence):`);
    console.log(`  ${unmappedFunctions.join(', ')}`);
  }

  return { grouped, processed, skippedOp };
}

async function formatWithPrettier(content, filePath) {
  const config = await prettier.resolveConfig(filePath);
  return prettier.format(content, { ...config, filepath: filePath });
}

async function writeGroupFiles(grouped, allGroupKeys) {
  await mkdir(OUTPUT_DIR, { recursive: true });

  let totalFunctions = 0;
  for (const groupKey of allGroupKeys) {
    if (GROUP_CONFIG[groupKey].handWritten) {
      console.log(`  (skipping ${groupKey} — hand-written)`);
      continue;
    }
    const funcs = grouped[groupKey] || [];
    totalFunctions += funcs.length;
    const content = generateGroupFile(groupKey, funcs);
    const filename = `${OUTPUT_DIR}/xpath-3.1-functions-${GROUP_CONFIG[groupKey].filename}.ts`;
    const formatted = await formatWithPrettier(content, resolve(filename));
    await writeFile(filename, formatted);
    console.log(`  ${filename} (${funcs.length} functions)`);
  }

  const aggregator = generateAggregator(allGroupKeys);
  const aggregatorPath = `${OUTPUT_DIR}/xpath-3.1-functions.ts`;
  const formattedAggregator = await formatWithPrettier(aggregator, resolve(aggregatorPath));
  await writeFile(aggregatorPath, formattedAggregator);
  console.log(`  ${aggregatorPath}`);

  return totalFunctions;
}

async function main() {
  await Promise.all([loadTypesEnum(), loadFunctionGroups()]);

  const { catalogXml, specXml } = await fetchSpecSources();

  const sectionMap = buildFunctionSectionMap(specXml);
  console.log(`Extracted section mapping for ${sectionMap.size} functions from spec source`);

  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    isArray: (name) => ['fos:function', 'fos:proto', 'fos:arg', 'fos:property', 'fos:properties', 'p'].includes(name),
  });
  const doc = parser.parse(catalogXml);
  const functions = doc['fos:functions']?.['fos:function'] || [];
  console.log(`Parsed ${functions.length} function definitions from catalog`);

  const summaryMap = buildSummaryMap(catalogXml);
  const { grouped, processed, skippedOp } = groupFunctions(functions, summaryMap, sectionMap);

  const allGroupKeys = Object.keys(GROUP_CONFIG);
  for (const key of allGroupKeys) {
    if (!grouped[key]) grouped[key] = [];
  }

  const totalFunctions = await writeGroupFiles(grouped, allGroupKeys);

  if (unmappedTypes.size > 0) {
    console.warn(`\nWarning: ${unmappedTypes.size} spec type(s) fell back to generic mapping:`);
    for (const t of [...unmappedTypes].sort((a, b) => a.localeCompare(b))) {
      console.warn(`  ${t} — add to XDM_TYPE_OVERRIDES if a specific Types.* member is appropriate`);
    }
  }

  console.log(`\nDone: ${processed} functions generated, ${skippedOp} op: functions skipped`);
  console.log(`Total: ${totalFunctions} functions across ${allGroupKeys.length} groups`);
}

try {
  await main();
} catch (err) {
  console.error('Error:', err.message);
  process.exit(1);
}
