import { isDefined } from '@kaoto/forms';

import { XmlCamelResourceSerializer, YamlCamelResourceSerializer } from '../../serializers';
import { KaotoResourceSerializer } from '../kaoto-resource';
import { getResourceTypeFromPath, SourceSchemaType } from './source-schema-type';

/**
 * Detects the resource schema type of a given source without instantiating a
 * full `KaotoResource`. Used where the schema type is needed but constructing
 * the resource would be wasteful or premature (for example, when selecting a
 * catalog before the entities provider has mounted).
 *
 * Detection mirrors the precedence used by `CamelResourceFactory.createCamelResource`:
 * 1. Path-based hint (extensions such as `.kamelet.yaml`, `.citrus.yaml`, etc.).
 * 2. Content inspection: Citrus tests via an `actions` array, Camel-K resources
 *    via the `kind` field, otherwise fall back to `Route`.
 *
 * A parity test asserts this function agrees with
 * `CamelResourceFactory.createCamelResource(...).getType()` across all known
 * shapes.
 */
export const detectSchemaType = (source?: string, path?: string): SourceSchemaType => {
  const pathType = getResourceTypeFromPath(path);

  if (pathType === SourceSchemaType.Test) {
    return SourceSchemaType.Test;
  }

  const parsed = parseSource(source, path);

  if (isCitrusShape(parsed, pathType)) {
    return SourceSchemaType.Test;
  }

  const camelKType = detectCamelKKind(parsed, pathType);
  if (camelKType) {
    return camelKType;
  }

  return pathType ?? SourceSchemaType.Route;
};

const parseSource = (source?: string, path?: string): unknown => {
  if (typeof source !== 'string' || source.length === 0) {
    return undefined;
  }

  try {
    const serializer = pickSerializer(source, path);
    return serializer.parse(source);
  } catch {
    return undefined;
  }
};

const pickSerializer = (source: string, path?: string): KaotoResourceSerializer => {
  if (!path) {
    return XmlCamelResourceSerializer.isApplicable(source)
      ? new XmlCamelResourceSerializer()
      : new YamlCamelResourceSerializer();
  }

  return path.endsWith('.xml') ? new XmlCamelResourceSerializer() : new YamlCamelResourceSerializer();
};

const isCitrusShape = (parsed: unknown, pathType?: SourceSchemaType): boolean => {
  if (pathType === SourceSchemaType.Test) return true;
  if (!isDefined(parsed) || Array.isArray(parsed) || typeof parsed !== 'object') return false;
  const actions = (parsed as { actions?: unknown }).actions;
  return Array.isArray(actions);
};

const detectCamelKKind = (parsed: unknown, pathType?: SourceSchemaType): SourceSchemaType | undefined => {
  const record =
    isDefined(parsed) && !Array.isArray(parsed) && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : {};
  const kind = record['kind'] ?? pathType;

  if (
    kind === SourceSchemaType.Integration ||
    kind === SourceSchemaType.Kamelet ||
    kind === SourceSchemaType.KameletBinding ||
    kind === SourceSchemaType.Pipe
  ) {
    return kind;
  }

  return undefined;
};
