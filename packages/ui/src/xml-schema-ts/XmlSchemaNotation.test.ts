import { QName } from './QName';
import { XmlSchema } from './XmlSchema';
import { XmlSchemaCollection } from './XmlSchemaCollection';
import { XmlSchemaNotation } from './XmlSchemaNotation';

const NS = 'urn:test';

const read = (content: string): XmlSchema =>
  new XmlSchemaCollection().read(
    `<xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema" targetNamespace="${NS}">${content}</xs:schema>`,
    () => {},
  );

describe('XmlSchemaNotation', () => {
  it('reads a notation with its name and identifiers', () => {
    const schema = read('<xs:notation name="png" public="image/png" system="viewer.exe"/>');

    const notation = schema.getNotations().get(new QName(NS, 'png'))!;

    expect(notation.getName()).toBe('png');
    expect(notation.getQName()?.toString()).toBe(new QName(NS, 'png').toString());
    expect(notation.getPublicNotation()).toBe('image/png');
    expect(notation.getSystem()).toBe('viewer.exe');
  });

  it('is a named global component of the schema that declares it', () => {
    const schema = read('<xs:notation name="png" public="image/png"/>');

    const notation = schema.getNotations().get(new QName(NS, 'png'))!;

    expect(notation.getParent()).toBe(schema);
    expect(notation.isTopLevel()).toBe(true);
    expect(notation.isAnonymous()).toBe(false);
    expect(schema.getItems()).toContain(notation);
  });

  it('reads and writes the public identifier through getPublic and setPublic too', () => {
    const notation = new XmlSchemaNotation(read(''));

    notation.setPublic('image/png');

    expect(notation.getPublic()).toBe('image/png');
    expect(notation.getPublicNotation()).toBe('image/png');
  });

  it('moves a notation to its new name in the schema when it is renamed', () => {
    const schema = read('');
    const notation = new XmlSchemaNotation(schema);
    notation.setName('png');

    notation.setName('jpeg');

    expect(schema.getNotations().get(new QName(NS, 'png'))).toBeUndefined();
    expect(schema.getNotations().get(new QName(NS, 'jpeg'))).toBe(notation);
  });
});
