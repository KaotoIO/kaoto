import type {
  XPathFunctionArgument,
  XPathFunctionCatalog,
  XPathFunctionEntry,
} from '@kaoto/camel-catalog/xpath-functions/xpath-function-catalog';

import { IFunctionArgumentDefinition, IFunctionDefinition } from '../../models/datamapper/mapping';
import { Types } from '../../models/datamapper/types';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { FunctionGroup } from './xpath-model';

const XDM_TYPE_MAP: Record<string, Types> = {
  'xs:string': Types.String,
  'xs:boolean': Types.Boolean,
  'xs:integer': Types.Integer,
  'xs:decimal': Types.Decimal,
  'xs:double': Types.Double,
  'xs:float': Types.Float,
  'xs:date': Types.Date,
  'xs:dateTime': Types.DateTime,
  'xs:time': Types.Time,
  'xs:duration': Types.Duration,
  'xs:dayTimeDuration': Types.DayTimeDuration,
  'xs:QName': Types.QName,
  'xs:NCName': Types.NCName,
  'xs:anyURI': Types.AnyURI,
  'xs:anyAtomicType': Types.AnyAtomicType,
  'xs:untypedAtomic': Types.UntypedAtomic,
  'xs:positiveInteger': Types.PositiveInteger,
  numeric: Types.Numeric,
  'item()': Types.Item,
  'element()': Types.Element,
  'node()': Types.Node,
  'document-node()': Types.DocumentNode,
  'attribute()': Types.Attribute,
  'text()': Types.TextNode,
  'namespace-node()': Types.NamespaceNode,
  'map(*)': Types.Map,
  'function(*)': Types.FunctionType,
  'empty-sequence()': Types.EmptySequence,
  'array(*)': Types.Array,
  none: Types.EmptySequence,
};

function resolveXdmType(xdmType: string): Types {
  return XDM_TYPE_MAP[xdmType] ?? Types.Item;
}

function isReturnCollection(cardinality: string): boolean {
  return cardinality === '*' || cardinality === '+';
}

function convertArgument(raw: XPathFunctionArgument): IFunctionArgumentDefinition {
  return {
    name: raw.name,
    displayName: raw.displayName,
    description: raw.description,
    type: resolveXdmType(raw.type),
    minOccurs: raw.minOccurs,
    maxOccurs: raw.maxOccurs,
  };
}

function convertFunction(raw: XPathFunctionEntry): IFunctionDefinition {
  const def: IFunctionDefinition = {
    name: raw.name,
    displayName: raw.displayName,
    description: raw.description,
    returnType: resolveXdmType(raw.returnType),
    arguments: raw.arguments.map(convertArgument),
  };
  if (isReturnCollection(raw.returnCardinality)) {
    def.returnCollection = true;
  }
  return def;
}

export function convertXPathFunctionCatalog(
  rawCatalog: XPathFunctionCatalog,
): Record<FunctionGroup, IFunctionDefinition[]> {
  const result = {} as Record<FunctionGroup, IFunctionDefinition[]>;
  for (const [group, functions] of Object.entries(rawCatalog)) {
    result[group as FunctionGroup] = functions.map(convertFunction);
  }
  return result;
}

const cachedCatalog = new Map<string, Record<FunctionGroup, IFunctionDefinition[]>>();

/**
 * Fetches the XPath function catalog JSON from the camel-catalog assets and converts it
 * to IFunctionDefinition records grouped by FunctionGroup. Results are cached per version.
 */
export async function loadXPathFunctionCatalog(version: string): Promise<Record<FunctionGroup, IFunctionDefinition[]>> {
  const cached = cachedCatalog.get(version);
  if (cached) return cached;

  const catalogPath = `${CatalogSchemaLoader.DEFAULT_CATALOG_BASE_PATH}/xpath-functions/xpath-functions-${version}.json`;
  const { body } = await CatalogSchemaLoader.fetchFile<XPathFunctionCatalog>(catalogPath);
  const converted = convertXPathFunctionCatalog(body);
  cachedCatalog.set(version, converted);
  return converted;
}
