import { CamelCatalogService } from '../../models';
import {
  BOB_CUSTOM_MODE_ROOT_ENTITY_NAME,
  BOB_CUSTOM_MODE_SCHEMA_KEY,
  BobCatalogIndex,
} from '../../models/bob/bob-catalog-index';
import { ComponentsCatalog } from '../../models/camel/camel-catalog-index';
import { ICamelProcessorDefinition } from '../../models/camel/camel-processors-catalog';
import { CatalogKind } from '../../models/catalog-kind';
import { CatalogSchemaLoader } from '../../utils/catalog-schema-loader';
import { DynamicCatalog } from '../dynamic-catalog';
import { DynamicCatalogRegistry } from '../dynamic-catalog-registry';
import { BobComponentsProvider, BobToolsProvider } from '../providers/bob-components.provider';
import { CamelProcessorsProvider } from '../providers/camel-components.provider';

export async function fetchBobCatalog(options: {
  catalogIndex: BobCatalogIndex;
  relativeBasePath: string;
}): Promise<void> {
  const { catalogIndex, relativeBasePath } = options;

  const toolsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.BobTool]>(
    `${relativeBasePath}/${catalogIndex.catalogs.tools.file}`,
  );
  const componentsFiles = CatalogSchemaLoader.fetchFile<ComponentsCatalog[CatalogKind.BobComponent]>(
    `${relativeBasePath}/${catalogIndex.catalogs.components.file}`,
  );
  const rootSchemaFile = CatalogSchemaLoader.fetchFile<ICamelProcessorDefinition['propertiesSchema']>(
    `${relativeBasePath}/${catalogIndex.schemas[BOB_CUSTOM_MODE_SCHEMA_KEY].file}`,
  );

  const [tools, components, rootSchema] = await Promise.all([toolsFiles, componentsFiles, rootSchemaFile]);

  const customModeRootEntity: ComponentsCatalog[CatalogKind.Entity] = {
    [BOB_CUSTOM_MODE_ROOT_ENTITY_NAME]: { propertiesSchema: rootSchema.body } as ICamelProcessorDefinition,
  };

  CamelCatalogService.setCatalogKey(CatalogKind.BobTool, tools.body);
  CamelCatalogService.setCatalogKey(CatalogKind.BobComponent, components.body);
  CamelCatalogService.setCatalogKey(CatalogKind.Entity, customModeRootEntity);

  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.Entity,
    new DynamicCatalog(new CamelProcessorsProvider(customModeRootEntity)),
  );
  DynamicCatalogRegistry.get().setCatalog(CatalogKind.BobTool, new DynamicCatalog(new BobToolsProvider(tools.body)));
  DynamicCatalogRegistry.get().setCatalog(
    CatalogKind.BobComponent,
    new DynamicCatalog(new BobComponentsProvider(components.body)),
  );
}
