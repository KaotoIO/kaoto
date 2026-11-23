import { FileType } from '../../../services/files/stored-file';
import { EditorKind, editorKindFor } from './editor-registry';

describe('editorKindFor', () => {
  it.each<[FileType, EditorKind]>([
    ['integration', 'route'],
    ['integration-test', 'route'],
    ['document', 'text'],
  ])('opens a file of type %s in the %s editor', (fileType, editorKind) => {
    expect(editorKindFor(fileType)).toBe(editorKind);
  });
});
