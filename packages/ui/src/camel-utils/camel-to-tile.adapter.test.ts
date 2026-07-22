import {
  CatalogKind,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  ICitrusComponentDefinition,
  IKameletDefinition,
} from '../models';
import {
  camelComponentToTile,
  camelEntityToTile,
  camelProcessorToTile,
  citrusComponentToTile,
  kameletToTile,
} from './camel-to-tile.adapter';

describe('camel-to-tile.adapter', () => {
  describe('camelComponentToTile', () => {
    it('should return a tile with the correct type', async () => {
      const componentDef = {
        component: {
          name: 'my-component',
          title: 'My Component',
          description: 'My Component Description',
        },
      } as ICamelComponentDefinition;

      const tile = await camelComponentToTile(componentDef);

      expect(tile.name).toBe('my-component');
      expect(tile.description).toBe('My Component Description');
    });

    it('should populate the headerTags', async () => {
      const componentDef = {
        component: {
          supportLevel: 'Preview',
        },
      } as ICamelComponentDefinition;

      const tile = await camelComponentToTile(componentDef);

      expect(tile.headerTags).toEqual(['Component', 'Preview']);
    });

    it('should populate the tags and version', async () => {
      const componentDef = {
        component: {
          label: 'label1,label2',
          version: '4.0.0',
        },
      } as ICamelComponentDefinition;

      const tile = await camelComponentToTile(componentDef);

      expect(tile.tags).toEqual(['label1', 'label2']);
      expect(tile.version).toBe('4.0.0');
    });

    it('should populate the provider', async () => {
      const componentDef = {
        component: {
          provider: 'my-provider',
        },
      } as ICamelComponentDefinition;

      const tile = await camelComponentToTile(componentDef);

      expect(tile.provider).toBe('my-provider');
    });

    it('should populate tags with `consumerOnly` and `producerOnly` when applicable', async () => {
      const componentDef = {
        component: {
          consumerOnly: true,
          producerOnly: true,
        },
      } as ICamelComponentDefinition;

      const tile = await camelComponentToTile(componentDef);

      expect(tile.tags).toEqual(['consumerOnly', 'producerOnly']);
    });

    it('should replace the supportLevel header tag if the component is deprecated', async () => {
      const componentDef = {
        component: {
          supportLevel: 'Stable',
          deprecated: true,
        },
      } as ICamelComponentDefinition;

      const tile = await camelComponentToTile(componentDef);

      expect(tile.headerTags).toEqual(['Component', 'Deprecated']);
    });
  });

  describe('camelProcessorToTile', () => {
    it('should return a tile with the correct type', async () => {
      const processorDef = {
        model: {
          name: 'my-processor',
          title: 'My Processor',
          description: 'My Processor Description',
          label: 'label1,label2',
        },
      } as ICamelProcessorDefinition;

      const tile = await camelProcessorToTile(processorDef);

      expect(tile.name).toBe('my-processor');
      expect(tile.description).toBe('My Processor Description');
    });

    it('should populate the headerTags', async () => {
      const processorDef = {
        model: {
          supportLevel: 'Preview',
          label: 'label1,label2',
        },
      } as ICamelProcessorDefinition;

      const tile = await camelProcessorToTile(processorDef);

      expect(tile.headerTags).toEqual(['Processor', 'Preview']);
    });

    it('should populate the tags', async () => {
      const processorDef = {
        model: {
          label: 'label1,label2',
        },
      } as ICamelProcessorDefinition;

      const tile = await camelProcessorToTile(processorDef);

      expect(tile.tags).toEqual(['label1', 'label2']);
    });

    it('should populate the provider', async () => {
      const processorDef = {
        model: {
          name: 'my-processor',
          title: 'My Processor',
          description: 'My Processor Description',
          label: 'label1,label2',
          provider: 'my-provider',
        },
      } as ICamelProcessorDefinition;

      const tile = await camelProcessorToTile(processorDef);

      expect(tile.provider).toBe('my-provider');
    });
  });

  describe('camelEntityToTile', () => {
    it('should return a tile with the correct type', async () => {
      const processorDef = {
        model: {
          name: 'my-entity',
          title: 'My Entity',
          description: 'My Entity Description',
          label: 'label1,label2',
        },
      } as ICamelProcessorDefinition;

      const tile = await camelEntityToTile(processorDef);

      expect(tile.name).toBe('my-entity');
      expect(tile.description).toBe('My Entity Description');
    });
  });

  describe('citrusComponentToTile', () => {
    it('should return a tile with the correct type', async () => {
      const componentDef = {
        kind: CatalogKind.TestAction,
        name: 'my-action',
        group: 'my-group',
        title: 'My Action',
        description: 'This is the description',
      } as ICitrusComponentDefinition;

      const tile = await citrusComponentToTile(componentDef);

      expect(tile.name).toBe('my-action');
      expect(tile.title).toBe('My Action');
      expect(tile.description).toBe('This is the description');
    });

    it('should return a tile with defaults', async () => {
      const componentDef = {
        kind: CatalogKind.TestContainer,
        name: 'my-container',
      } as ICitrusComponentDefinition;

      const tile = await citrusComponentToTile(componentDef);

      expect(tile.name).toBe('my-container');
      expect(tile.title).toBe('my-container');
      expect(tile.description).toBeUndefined();
    });
  });

  describe('kameletToTile', () => {
    it('should return a tile with the correct type', async () => {
      const kameletDef = {
        metadata: {
          name: 'my-kamelet',
          labels: {
            'camel.apache.org/kamelet.type': 'source',
          },
          annotations: {
            'camel.apache.org/catalog.version': '1.0.0',
          },
        },
        spec: {
          definition: {
            title: 'My Kamelet',
            description: 'My Kamelet Description',
          },
        },
      } as IKameletDefinition;

      const tile = await kameletToTile(kameletDef);

      expect(tile.name).toBe('my-kamelet');
      expect(tile.description).toBe('My Kamelet Description');
    });

    it('should populate the tags for type', async () => {
      const kameletDef = {
        metadata: {
          labels: {
            'camel.apache.org/kamelet.type': 'source',
          },
          annotations: {},
        },
        spec: {
          definition: {
            title: 'My Kamelet',
            description: 'My Kamelet Description',
          },
        },
      } as IKameletDefinition;

      const tile = await kameletToTile(kameletDef);

      expect(tile.tags).toEqual(['source']);
    });

    it('should use the selected CatalogKind.Kamelet by default', async () => {
      const kameletDef = {
        metadata: {
          labels: {
            'camel.apache.org/kamelet.type': 'source',
          },
          annotations: {},
        },
        spec: {
          definition: {
            title: 'My Kamelet',
            description: 'My Kamelet Description',
          },
        },
      } as IKameletDefinition;

      const tile = await kameletToTile(kameletDef);

      expect(tile.type).toEqual(CatalogKind.Kamelet);
    });

    it('should populate the version for annotations', async () => {
      const kameletDef = {
        metadata: {
          labels: {},
          annotations: {
            'camel.apache.org/catalog.version': '1.0.0',
          },
        },
        spec: {
          definition: {
            title: 'My Kamelet',
            description: 'My Kamelet Description',
          },
        },
      } as IKameletDefinition;

      const tile = await kameletToTile(kameletDef);

      expect(tile.version).toBe('1.0.0');
    });

    it('should populate the headerTags', async () => {
      const kameletDef = {
        metadata: {
          annotations: {
            'camel.apache.org/kamelet.support.level': 'Preview',
          },
          labels: {},
        },
        spec: {
          definition: {
            title: 'My Kamelet',
            description: 'My Kamelet Description',
          },
        },
      } as IKameletDefinition;

      const tile = await kameletToTile(kameletDef);

      expect(tile.headerTags).toEqual(['Kamelet', 'Preview']);
    });

    it('should not include support level or version when annotations are absent', async () => {
      const kameletDef = {
        metadata: {
          name: 'my-kamelet',
          annotations: undefined,
          labels: { 'camel.apache.org/kamelet.type': 'source' },
        },
        spec: {
          definition: {
            title: 'My Kamelet',
            description: 'My Kamelet Description',
          },
        },
      } as unknown as IKameletDefinition;

      const tile = await kameletToTile(kameletDef);

      expect(tile.headerTags).toEqual(['Kamelet']);
      expect(tile.version).toBeUndefined();
      expect(tile.iconUrl).toBeUndefined();
    });

    it('should not crash and should return undefined iconUrl when annotations is undefined', async () => {
      const kameletDef = {
        metadata: {
          name: 'my-kamelet',
          annotations: undefined,
          labels: {},
        },
        spec: {
          definition: {
            title: 'My Kamelet',
            description: 'My Kamelet Description',
          },
        },
      } as unknown as IKameletDefinition;

      expect(() => kameletToTile(kameletDef)).not.toThrow();
      const tile = await kameletToTile(kameletDef);
      expect(tile.iconUrl).toBeUndefined();
    });

    it('should return undefined iconUrl when the icon annotation is missing', async () => {
      const kameletDef = {
        metadata: {
          name: 'my-kamelet',
          annotations: {
            'camel.apache.org/kamelet.support.level': 'Stable',
            'camel.apache.org/catalog.version': '1.0.0',
          },
          labels: {},
        },
        spec: {
          definition: {
            title: 'My Kamelet',
            description: 'My Kamelet Description',
          },
        },
      } as unknown as IKameletDefinition;

      const tile = await kameletToTile(kameletDef);

      expect(tile.iconUrl).toBeUndefined();
    });

    it('should return the annotation value as iconUrl when the icon annotation is present', async () => {
      const iconData = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciLz4=';
      const kameletDef = {
        metadata: {
          name: 'my-kamelet',
          annotations: {
            'camel.apache.org/kamelet.support.level': 'Stable',
            'camel.apache.org/catalog.version': '1.0.0',
            'camel.apache.org/kamelet.icon': iconData,
          },
          labels: {},
        },
        spec: {
          definition: {
            title: 'My Kamelet',
            description: 'My Kamelet Description',
          },
        },
      } as unknown as IKameletDefinition;

      const tile = await kameletToTile(kameletDef);

      expect(tile.iconUrl).toEqual(iconData);
    });

    it('should not include type tag when labels are absent', async () => {
      const kameletDef = {
        metadata: {
          name: 'my-kamelet',
          annotations: { 'camel.apache.org/kamelet.support.level': 'Stable' },
          labels: undefined,
        },
        spec: {
          definition: {
            title: 'My Kamelet',
            description: 'My Kamelet Description',
          },
        },
      } as unknown as IKameletDefinition;

      const tile = await kameletToTile(kameletDef);

      expect(tile.tags).toEqual([]);
    });
  });
});
