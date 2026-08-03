import { XPathFunction, XPathFunctionArgument } from '@kaoto/camel-catalog/types';

import { IFunctionArgumentDefinition, IFunctionDefinition } from '../../../models/datamapper/mapping';
import { TYPE_STRING_TO_TYPES, Types } from '../../../models/datamapper/types';
import { CATEGORY_TO_FUNCTION_GROUP, FunctionGroup } from '../xpath-model';

const JAVA_MAX_INT = 2147483647;

/**
 * Converts the raw XPath/XSLT function catalog from {@link @kaoto/camel-catalog} into
 * the DataMapper's {@link IFunctionDefinition} format, bridging the catalog's string-based
 * type system (e.g. `"xs:string"`) to the {@link Types} enum.
 */
export class XPathCatalogConverter {
  /** Maps a catalog type string (e.g. `"xs:string?"`, `"map(*)"`) to the DataMapper {@link Types} enum. */
  static mapXPathTypeToTypes(typeStr: string): Types {
    const base = XPathCatalogConverter.stripCardinality(typeStr);

    const direct = TYPE_STRING_TO_TYPES[base];
    if (direct) return direct;

    if (base.startsWith('document-node(')) return Types.DocumentNode;
    if (base.startsWith('element(')) return Types.Element;
    if (base.startsWith('array(')) return Types.Item;
    if (base.startsWith('map(')) return Types.Item;
    if (base.startsWith('function(')) return Types.Item;

    return Types.Item;
  }

  /** Converts the raw catalog JSON into grouped {@link IFunctionDefinition} arrays keyed by {@link FunctionGroup}. */
  static convertCatalog(
    raw: Record<string, Record<string, XPathFunction>>,
  ): Partial<Record<FunctionGroup, IFunctionDefinition[]>> {
    const result: Partial<Record<FunctionGroup, IFunctionDefinition[]>> = {};

    for (const categoryKey of Object.keys(raw)) {
      const group = CATEGORY_TO_FUNCTION_GROUP[categoryKey];
      if (!group) continue;

      const functions = raw[categoryKey];
      result[group] = Object.values(functions).map(XPathCatalogConverter.convertFunction);
    }

    return result;
  }

  private static stripCardinality(typeStr: string): string {
    const last = typeStr[typeStr.length - 1];
    if (last === '?' || last === '*' || last === '+') {
      return typeStr.slice(0, -1);
    }
    return typeStr;
  }

  private static convertArgument(arg: XPathFunctionArgument): IFunctionArgumentDefinition {
    return {
      name: arg.name,
      displayName: arg.displayName,
      description: arg.description,
      type: XPathCatalogConverter.mapXPathTypeToTypes(arg.type),
      minOccurs: arg.minOccurs,
      maxOccurs: arg.maxOccurs === JAVA_MAX_INT ? Number.MAX_SAFE_INTEGER : arg.maxOccurs,
    };
  }

  private static convertFunction(func: XPathFunction): IFunctionDefinition {
    return {
      name: func.name,
      displayName: func.displayName,
      description: func.description,
      returnType: XPathCatalogConverter.mapXPathTypeToTypes(func.returnType),
      returnCollection: func.returnCollection || undefined,
      arguments: func.arguments.map(XPathCatalogConverter.convertArgument),
    };
  }
}
