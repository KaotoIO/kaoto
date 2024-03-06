export const sourceDoc = {
  name: 'SourceDocument1',
  fields: [
    { name: 'field1' },
    { name: 'field2', fields: [{ name: 'field1' }, { name: 'field2' }, { name: 'field3' }] },
    { name: 'field3' },
  ],
};

export const targetDoc = {
  name: 'TargetDocument1',
  fields: [
    { name: 'field1' },
    { name: 'field2', fields: [{ name: 'field1' }, { name: 'field2' }, { name: 'field3' }] },
    { name: 'field3' },
  ],
};
