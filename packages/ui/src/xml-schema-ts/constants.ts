import { QName } from './QName';

export const DEFAULT_NS_PREFIX = '';
export const NULL_NS_URI = '';

//
// Schema Namespaces
//
export const URI_2001_SCHEMA_XSD = 'http://www.w3.org/2001/XMLSchema';
export const URI_2001_SCHEMA_XSI = 'http://www.w3.org/2001/XMLSchema-instance';
export const XML_NS_PREFIX = 'xml';
export const XML_NS_URI = 'http://www.w3.org/XML/1998/namespace';
export const XMLNS_ATTRIBUTE = 'xmlns';
export const XMLNS_ATTRIBUTE_NS_URI = 'http://www.w3.org/2000/xmlns/';
export const XMLNS_PREFIX = 'xml';
export const XMLNS_URI = 'http://www.w3.org/XML/1998/namespace';
export const XSD_ANY = new QName(URI_2001_SCHEMA_XSD, 'any');
export const XSD_ANYATOMICTYPE = new QName(URI_2001_SCHEMA_XSD, 'anyAtomicType');
export const XSD_ANYSIMPLETYPE = new QName(URI_2001_SCHEMA_XSD, 'anySimpleType');
export const XSD_ANYTYPE = new QName(URI_2001_SCHEMA_XSD, 'anyType');
export const XSD_ANYURI = new QName(URI_2001_SCHEMA_XSD, 'anyURI');
export const XSD_BASE64 = new QName(URI_2001_SCHEMA_XSD, 'base64Binary');
export const XSD_BOOLEAN = new QName(URI_2001_SCHEMA_XSD, 'boolean');
export const XSD_BYTE = new QName(URI_2001_SCHEMA_XSD, 'byte');
export const XSD_DATE = new QName(URI_2001_SCHEMA_XSD, 'date');
export const XSD_DATETIME = new QName(URI_2001_SCHEMA_XSD, 'dateTime');
export const XSD_DAY = new QName(URI_2001_SCHEMA_XSD, 'gDay');
export const XSD_DECIMAL = new QName(URI_2001_SCHEMA_XSD, 'decimal');

export const XSD_DOUBLE = new QName(URI_2001_SCHEMA_XSD, 'double');
export const XSD_DURATION = new QName(URI_2001_SCHEMA_XSD, 'duration');

export const XSD_ENTITIES = new QName(URI_2001_SCHEMA_XSD, 'ENTITIES');
export const XSD_ENTITY = new QName(URI_2001_SCHEMA_XSD, 'ENTITY');
export const XSD_FLOAT = new QName(URI_2001_SCHEMA_XSD, 'float');
export const XSD_HEXBIN = new QName(URI_2001_SCHEMA_XSD, 'hexBinary');
export const XSD_ID = new QName(URI_2001_SCHEMA_XSD, 'ID');
export const XSD_IDREF = new QName(URI_2001_SCHEMA_XSD, 'IDREF');
export const XSD_IDREFS = new QName(URI_2001_SCHEMA_XSD, 'IDREFS');
export const XSD_INT = new QName(URI_2001_SCHEMA_XSD, 'int');

export const XSD_INTEGER = new QName(URI_2001_SCHEMA_XSD, 'integer');
export const XSD_LANGUAGE = new QName(URI_2001_SCHEMA_XSD, 'language');
export const XSD_LONG = new QName(URI_2001_SCHEMA_XSD, 'long');
export const XSD_MONTH = new QName(URI_2001_SCHEMA_XSD, 'gMonth');
export const XSD_MONTHDAY = new QName(URI_2001_SCHEMA_XSD, 'gMonthDay');
export const XSD_NAME = new QName(URI_2001_SCHEMA_XSD, 'Name');

export const XSD_NCNAME = new QName(URI_2001_SCHEMA_XSD, 'NCName');
export const XSD_NEGATIVEINTEGER = new QName(URI_2001_SCHEMA_XSD, 'negativeInteger');
export const XSD_NMTOKEN = new QName(URI_2001_SCHEMA_XSD, 'NMTOKEN');
export const XSD_NMTOKENS = new QName(URI_2001_SCHEMA_XSD, 'NMTOKENS');
export const XSD_NONNEGATIVEINTEGER = new QName(URI_2001_SCHEMA_XSD, 'nonNegativeInteger');
export const XSD_NONPOSITIVEINTEGER = new QName(URI_2001_SCHEMA_XSD, 'nonPositiveInteger');
export const XSD_NORMALIZEDSTRING = new QName(URI_2001_SCHEMA_XSD, 'normalizedString');
export const XSD_NOTATION = new QName(URI_2001_SCHEMA_XSD, 'NOTATION');
export const XSD_POSITIVEINTEGER = new QName(URI_2001_SCHEMA_XSD, 'positiveInteger');
export const XSD_QNAME = new QName(URI_2001_SCHEMA_XSD, 'QName');
export const XSD_SCHEMA = new QName(URI_2001_SCHEMA_XSD, 'schema');
export const XSD_SHORT = new QName(URI_2001_SCHEMA_XSD, 'short');
// Define qnames for the all of the XSD and SOAP-ENC encodings
export const XSD_STRING = new QName(URI_2001_SCHEMA_XSD, 'string');

export const XSD_TIME = new QName(URI_2001_SCHEMA_XSD, 'time');

export const XSD_TOKEN = new QName(URI_2001_SCHEMA_XSD, 'token');

export const XSD_UNSIGNEDBYTE = new QName(URI_2001_SCHEMA_XSD, 'unsignedByte');

export const XSD_UNSIGNEDINT = new QName(URI_2001_SCHEMA_XSD, 'unsignedInt');

export const XSD_UNSIGNEDLONG = new QName(URI_2001_SCHEMA_XSD, 'unsignedLong');

export const XSD_UNSIGNEDSHORT = new QName(URI_2001_SCHEMA_XSD, 'unsignedShort');

export const XSD_YEAR = new QName(URI_2001_SCHEMA_XSD, 'gYear');

export const XSD_YEARMONTH = new QName(URI_2001_SCHEMA_XSD, 'gYearMonth');

export class MetaDataConstants {
  static readonly EXTERNAL_ATTRIBUTES = 'EXTERNAL_ATTRIBUTES';
  static readonly EXTERNAL_ELEMENTS = 'EXTERNAL_ELEMENTS';
}
