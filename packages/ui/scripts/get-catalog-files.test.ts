import { getCatalogFiles } from './get-catalog-files.mjs';

describe('getCatalogFiles', () => {
  const { basePath, files } = getCatalogFiles();
  const relativeFiles = files.map((file: string) => file.replace(/\\/g, '/').slice(basePath.length + 1));

  it('lists the catalog index', () => {
    expect(relativeFiles).toContain('index.json');
  });

  it('lists the starter templates, which new files are created from', () => {
    const templates = relativeFiles.filter((file: string) => file.startsWith('starter-templates/'));

    expect(templates.some((file: string) => file.endsWith('.json'))).toBe(true);
    expect(templates.some((file: string) => file.endsWith('.yaml'))).toBe(true);
  });

  it('lists YAML and XML files only from the starter templates', () => {
    const others = relativeFiles.filter(
      (file: string) => !file.startsWith('starter-templates/') && (file.endsWith('.yaml') || file.endsWith('.xml')),
    );

    expect(others).toEqual([]);
  });
});
