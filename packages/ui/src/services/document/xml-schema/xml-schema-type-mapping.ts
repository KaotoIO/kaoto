import { NS_XML_SCHEMA } from '../../../models/datamapper/standard-namespaces';
import { Types } from '../../../models/datamapper/types';
import { capitalize } from '../../../serializers/xml/utils/xml-utils';

/**
 * Map an XML Schema QName to the DataMapper type used for compatibility checks.
 * User-defined types remain containers; known built-in aliases collapse to the
 * primitive type families understood by the DataMapper.
 */
export function mapXmlSchemaTypeToEnum(namespaceURI: string, localPart: string): Types {
  if (namespaceURI !== NS_XML_SCHEMA) return Types.Container;

  const directType = Types[capitalize(localPart) as keyof typeof Types];
  if (directType) return directType;

  switch (localPart.toLowerCase()) {
    case 'string':
    case 'normalizedstring':
    case 'token':
    case 'language':
    case 'nmtoken':
    case 'nmtokens':
    case 'name':
    case 'id':
    case 'idref':
    case 'idrefs':
    case 'entity':
    case 'entities':
      return Types.String;

    case 'int':
    case 'integer':
    case 'long':
    case 'short':
    case 'byte':
    case 'unsignedint':
    case 'unsignedlong':
    case 'unsignedshort':
    case 'unsignedbyte':
    case 'nonpositiveinteger':
    case 'negativeinteger':
    case 'nonnegativeinteger':
      return Types.Integer;

    case 'datetime':
      return Types.DateTime;

    case 'gyear':
    case 'gyearmonth':
    case 'gmonth':
    case 'gmonthday':
    case 'gday':
      return Types.Date;

    case 'duration':
    case 'daytimeduration':
    case 'yearmonthduration':
      return Types.Duration;

    case 'hexbinary':
    case 'base64binary':
      return Types.String;

    case 'anyuri':
      return Types.AnyURI;

    case 'qname':
      return Types.QName;

    case 'notation':
      return Types.String;

    case 'anysimpletype':
      return Types.AnyAtomicType;

    default:
      return Types.AnyType;
  }
}
