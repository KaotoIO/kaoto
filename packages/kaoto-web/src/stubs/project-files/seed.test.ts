import { buildTree } from '../../components/Explorer/build-tree';
import { isValidIntegrationId } from '../../utils/validators';
import { SEED_PROJECT_FILES } from './seed';

describe('SEED_PROJECT_FILES', () => {
  it('uses ids that are valid in the integration route', () => {
    SEED_PROJECT_FILES.forEach((file) => {
      expect(isValidIntegrationId(file.id)).toBe(true);
    });
  });

  it('has unique ids and paths', () => {
    const ids = SEED_PROJECT_FILES.map((file) => file.id);
    const paths = SEED_PROJECT_FILES.map((file) => file.path);

    expect(new Set(ids).size).toBe(SEED_PROJECT_FILES.length);
    expect(new Set(paths).size).toBe(SEED_PROJECT_FILES.length);
  });

  it('gives every integration and test file content', () => {
    SEED_PROJECT_FILES.filter((file) => file.type !== 'document').forEach((file) => {
      expect(file.content.trim()).not.toBe('');
    });
  });

  it('keeps the folder layout of the former stub tree', () => {
    const tree = buildTree(SEED_PROJECT_FILES.map((file) => ({ ...file, id: file.id ?? '' })));

    expect(tree.map((node) => node.id)).toEqual(['integrations', 'resources']);
  });
});
