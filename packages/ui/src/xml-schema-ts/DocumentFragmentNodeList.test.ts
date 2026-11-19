import { DocumentFragmentNodeList } from './DocumentFragmentNodeList';

const NS = 'urn:test';

const parse = (xml: string): Element => new DOMParser().parseFromString(xml, 'application/xml').documentElement;

const names = (list: DocumentFragmentNodeList) => [...list].map((node) => node.nodeName);

describe('DocumentFragmentNodeList', () => {
  it('copies all children of a node, text included, when there is no filter', () => {
    const parent = parse(`<root xmlns:t="${NS}"><t:a/>text<b/></root>`);

    const list = new DocumentFragmentNodeList(parent);

    expect(list).toHaveLength(3);
    expect(names(list)).toEqual(['t:a', '#text', 'b']);
  });

  it('copies only the child elements with the given namespace and local name', () => {
    const parent = parse(`<root xmlns:t="${NS}"><t:a/>text<a/><t:b/><t:a id="2"/></root>`);

    const list = new DocumentFragmentNodeList(parent, NS, 'a');

    expect(list).toHaveLength(2);
    expect(names(list)).toEqual(['t:a', 't:a']);
    expect((list.item(1) as Element).getAttribute('id')).toBe('2');
  });

  it('copies the children instead of moving them', () => {
    const parent = parse('<root><a/></root>');

    const list = new DocumentFragmentNodeList(parent);

    expect(list.item(0)).not.toBe(parent.firstChild);
    expect(parent.childNodes).toHaveLength(1);
  });

  it('rejects a node without an owner document', () => {
    const document = new DOMParser().parseFromString('<root/>', 'application/xml');

    expect(() => new DocumentFragmentNodeList(document)).toThrow('Could not access the owner Document');
  });

  it.each<[string, (list: DocumentFragmentNodeList) => unknown]>([
    [
      'forEach',
      (list) => {
        list.forEach(() => {});
      },
    ],
    ['entries', (list) => list.entries()],
    ['keys', (list) => list.keys()],
    ['values', (list) => list.values()],
  ])('does not implement %s', (_, call) => {
    const list = new DocumentFragmentNodeList(parse('<root/>'));

    expect(() => call(list)).toThrow('Method not implemented.');
  });
});
