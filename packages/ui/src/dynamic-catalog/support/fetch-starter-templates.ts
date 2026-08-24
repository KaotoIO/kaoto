import { CatalogDefinition, CatalogLibrary } from '@kaoto/camel-catalog/types';

import { CatalogKind } from '../../models/catalog-kind';
import { DynamicCatalog } from '../dynamic-catalog';
import { DynamicCatalogRegistry } from '../dynamic-catalog-registry';
import { StarterTemplatesProvider } from '../providers/starter-templates.provider';

export async function fetchStarterTemplates(basePath: string, catalogLibrary: CatalogLibrary): Promise<void> {
  if (!catalogLibrary.starterTemplates) return;

  const indexUrl = `${basePath}/${catalogLibrary.starterTemplates}`;
  const indexBasePath = indexUrl.substring(0, indexUrl.lastIndexOf('/'));

  const indexResponse = await fetch(indexUrl);
  const catalogDefinition = (await indexResponse.json()) as CatalogDefinition;

  const entries = Object.entries(catalogDefinition.catalogs);
  const templatePairs = await Promise.all(
    entries.map(async ([name, entry]) => {
      const fileUrl = `${indexBasePath}/${entry.file}`;
      const fileResponse = await fetch(fileUrl);
      const content = await fileResponse.text();
      return [name, content] as [string, string];
    }),
  );

  const embeddedTemplates: Record<string, string> = Object.fromEntries(templatePairs);

  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.StarterTemplate,
    new DynamicCatalog(new StarterTemplatesProvider(embeddedTemplates)),
  );
}
