import { NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import { Types } from '../../../models/datamapper/types';

interface XmlSchemaBuiltInType {
  localName: string;
  type: Types;
  caseInsensitiveType?: Types;
}

export const XML_SCHEMA_BUILT_IN_TYPES: ReadonlyArray<XmlSchemaBuiltInType> = [
  { localName: 'anyType', type: Types.AnyType },
  { localName: 'anySimpleType', type: Types.AnyAtomicType },
  { localName: 'anyAtomicType', type: Types.AnyAtomicType },
  { localName: 'string', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'boolean', type: Types.Boolean },
  { localName: 'decimal', type: Types.Decimal },
  { localName: 'float', type: Types.Float },
  { localName: 'double', type: Types.Double },
  { localName: 'duration', type: Types.Duration, caseInsensitiveType: Types.Duration },
  { localName: 'dateTime', type: Types.DateTime, caseInsensitiveType: Types.DateTime },
  { localName: 'time', type: Types.Time },
  { localName: 'date', type: Types.Date },
  { localName: 'gYearMonth', type: Types.Date, caseInsensitiveType: Types.Date },
  { localName: 'gYear', type: Types.Date, caseInsensitiveType: Types.Date },
  { localName: 'gMonthDay', type: Types.Date, caseInsensitiveType: Types.Date },
  { localName: 'gDay', type: Types.Date, caseInsensitiveType: Types.Date },
  { localName: 'gMonth', type: Types.Date, caseInsensitiveType: Types.Date },
  { localName: 'hexBinary', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'base64Binary', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'anyURI', type: Types.AnyURI, caseInsensitiveType: Types.AnyURI },
  { localName: 'QName', type: Types.QName, caseInsensitiveType: Types.QName },
  { localName: 'NOTATION', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'normalizedString', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'token', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'language', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'NMTOKEN', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'NMTOKENS', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'Name', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'NCName', type: Types.NCName },
  { localName: 'ID', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'IDREF', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'IDREFS', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'ENTITY', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'ENTITIES', type: Types.String, caseInsensitiveType: Types.String },
  { localName: 'integer', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'nonPositiveInteger', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'negativeInteger', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'long', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'int', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'short', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'byte', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'nonNegativeInteger', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'unsignedLong', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'unsignedInt', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'unsignedShort', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'unsignedByte', type: Types.Integer, caseInsensitiveType: Types.Integer },
  { localName: 'positiveInteger', type: Types.PositiveInteger },
  { localName: 'yearMonthDuration', type: Types.Duration, caseInsensitiveType: Types.Duration },
  { localName: 'dayTimeDuration', type: Types.DayTimeDuration, caseInsensitiveType: Types.Duration },
];

const XML_SCHEMA_TYPE_BY_LOCAL_NAME = new Map(
  XML_SCHEMA_BUILT_IN_TYPES.map(({ localName, type }) => [localName, type]),
);
const XML_SCHEMA_TYPE_BY_CASE_INSENSITIVE_ALIAS = new Map(
  XML_SCHEMA_BUILT_IN_TYPES.filter(({ caseInsensitiveType }) => caseInsensitiveType !== undefined).map(
    ({ localName, caseInsensitiveType }) => [localName.toLowerCase(), caseInsensitiveType!],
  ),
);

/**
 * Map an XML Schema QName to the DataMapper type used for compatibility checks.
 * User-defined types remain containers; known built-in aliases collapse to the
 * primitive type families understood by the DataMapper.
 */
export function mapXmlSchemaTypeToEnum(namespaceURI: string, localPart: string): Types {
  if (namespaceURI !== NS_XML_SCHEMA) return Types.Container;
  return (
    XML_SCHEMA_TYPE_BY_LOCAL_NAME.get(localPart) ??
    XML_SCHEMA_TYPE_BY_CASE_INSENSITIVE_ALIAS.get(localPart.toLowerCase()) ??
    Types.AnyType
  );
}
