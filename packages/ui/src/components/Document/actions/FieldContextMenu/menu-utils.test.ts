import { IField } from '../../../../models/datamapper/document';
import { Types } from '../../../../models/datamapper/types';
import { buildSelectSelfAction } from './menu-utils';

function mockField(overrides: Partial<IField> = {}): IField {
  return {
    name: 'field',
    displayName: 'Field',
    id: 'field-id',
    type: Types.String,
    fields: [],
    minOccurs: 1,
    maxOccurs: 1,
    namespacePrefix: null,
    namespaceURI: '',
    namedTypeFragmentRefs: [],
    predicates: [],
    ...overrides,
  } as IField;
}

describe('buildSelectSelfAction', () => {
  it('should build action with member and parent names', () => {
    const member = mockField({ displayName: 'Email' });
    const parent = mockField({ displayName: 'ContactInfo' });
    const onClick = vi.fn();

    const action = buildSelectSelfAction(member, parent, onClick, 'test-id');

    expect(action.label).toBe("Select 'Email' in 'ContactInfo'");
    expect(action.testId).toBe('test-id');
    action.onClick();
    expect(onClick).toHaveBeenCalled();
  });

  it('should build action without parent name when parentField is undefined', () => {
    const member = mockField({ displayName: 'Email' });
    const onClick = vi.fn();

    const action = buildSelectSelfAction(member, undefined, onClick, 'test-id');

    expect(action.label).toBe("Select 'Email'");
  });

  it('should use empty string when memberField is undefined', () => {
    const onClick = vi.fn();

    const action = buildSelectSelfAction(undefined, undefined, onClick, 'test-id');

    expect(action.label).toBe("Select ''");
  });

  it('should fall back to field.name when displayName is empty', () => {
    const member = mockField({ displayName: '', name: 'emailAddr' });
    const onClick = vi.fn();

    const action = buildSelectSelfAction(member, undefined, onClick, 'test-id');

    expect(action.label).toBe("Select 'emailAddr'");
  });

  it('should use custom displayName function when provided', () => {
    const member = mockField({ displayName: 'Email' });
    const parent = mockField({ displayName: 'Contact' });
    const onClick = vi.fn();
    const customDisplay = (f: IField) => f.name.toUpperCase();

    const action = buildSelectSelfAction(member, parent, onClick, 'test-id', customDisplay);

    expect(action.label).toBe("Select 'FIELD' in 'FIELD'");
  });
});
