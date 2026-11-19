import { MetaDataConstants } from '../constants';
import { QName } from '../QName';
import { XmlSchemaCollection } from '../XmlSchemaCollection';
import { XmlSchemaObject } from '../XmlSchemaObject';

const NS = 'urn:test';
const EXT = 'urn:ext';

/** Reads a global element `a` with the given extension attributes and content */
const readElement = (attributes: string, content = ''): XmlSchemaObject => {
  const schema = new XmlSchemaCollection().read(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:ext="${EXT}" targetNamespace="${NS}">` +
      `<xs:element name="a" type="xs:string" ${attributes}>${content}</xs:element>` +
      '</xs:schema>',
    () => {},
  );
  return schema.getElementByName('a')!;
};

/** The extension nodes stored under `key`, as `{namespace}localName` → attribute value or element name */
const extensions = (schemaObject: XmlSchemaObject, key: string) => {
  const map = schemaObject.getMetaInfoMap().get(key) as Map<QName, Node> | undefined;
  return map && Object.fromEntries([...map].map(([name, node]) => [name.toString(), node.nodeValue ?? node.nodeName]));
};

describe('DefaultExtensionDeserializer', () => {
  it('stores the extension attributes of a schema object by their QName', () => {
    const element = readElement('ext:hint="x" ext:label="y"');

    expect(extensions(element, MetaDataConstants.EXTERNAL_ATTRIBUTES)).toEqual({
      [new QName(EXT, 'hint').toString()]: 'x',
      [new QName(EXT, 'label').toString()]: 'y',
    });
    expect(extensions(element, MetaDataConstants.EXTERNAL_ELEMENTS)).toBeUndefined();
  });

  it('stores the extension elements of a schema object by their QName', () => {
    const element = readElement('', '<ext:info/><ext:source/>');

    expect(extensions(element, MetaDataConstants.EXTERNAL_ELEMENTS)).toEqual({
      [new QName(EXT, 'info').toString()]: 'ext:info',
      [new QName(EXT, 'source').toString()]: 'ext:source',
    });
    expect(extensions(element, MetaDataConstants.EXTERNAL_ATTRIBUTES)).toBeUndefined();
  });

  it('stores extension attributes and elements of the same schema object apart', () => {
    const element = readElement('ext:hint="x"', '<ext:info/>');

    expect(extensions(element, MetaDataConstants.EXTERNAL_ATTRIBUTES)).toEqual({
      [new QName(EXT, 'hint').toString()]: 'x',
    });
    expect(extensions(element, MetaDataConstants.EXTERNAL_ELEMENTS)).toEqual({
      [new QName(EXT, 'info').toString()]: 'ext:info',
    });
  });
});
