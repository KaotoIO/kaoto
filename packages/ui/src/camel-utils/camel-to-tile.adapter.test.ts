import { CatalogKind, ICamelComponentDefinition, ICamelProcessorDefinition, IKameletDefinition } from '../models';
import { camelComponentToTile, camelProcessorToTile, kameletToTile } from './camel-to-tile.adapter';

describe('camelComponentToTile', () => {
  it('should return a tile with the correct type', () => {
    const componentDef = {
      component: {
        name: 'my-component',
        title: 'My Component',
        description: 'My Component Description',
      },
    } as ICamelComponentDefinition;

    const tile = camelComponentToTile(componentDef);

    expect(tile.type).toEqual(CatalogKind.Component);
    expect(tile.name).toEqual('my-component');
    expect(tile.description).toEqual('My Component Description');
  });

  it('should populate the headerTags', () => {
    const componentDef = {
      component: {
        supportLevel: 'Preview',
      },
    } as ICamelComponentDefinition;

    const tile = camelComponentToTile(componentDef);

    expect(tile.headerTags).toEqual(['Component', 'Preview']);
  });

  it('should populate the tags and version', () => {
    const componentDef = {
      component: {
        label: 'label1,label2',
        version: '4.0.0',
      },
    } as ICamelComponentDefinition;

    const tile = camelComponentToTile(componentDef);

    expect(tile.tags).toEqual(['label1', 'label2']);
    expect(tile.version).toEqual('4.0.0');
  });

  it('should populate tags with `consumerOnly` and `producerOnly` when applicable', () => {
    const componentDef = {
      component: {
        consumerOnly: true,
        producerOnly: true,
      },
    } as ICamelComponentDefinition;

    const tile = camelComponentToTile(componentDef);

    expect(tile.tags).toEqual(['consumerOnly', 'producerOnly']);
  });

  it('should replace the supportLevel header tag if the component is deprecated', () => {
    const componentDef = {
      component: {
        supportLevel: 'Stable',
        deprecated: true,
      },
    } as ICamelComponentDefinition;

    const tile = camelComponentToTile(componentDef);

    expect(tile.headerTags).toEqual(['Component', 'Deprecated']);
  });
});

describe('camelProcessorToTile', () => {
  it('should return a tile with the correct type', () => {
    const processorDef = {
      model: {
        name: 'my-processor',
        title: 'My Processor',
        description: 'My Processor Description',
        label: 'label1,label2',
      },
    } as ICamelProcessorDefinition;

    const tile = camelProcessorToTile(processorDef);

    expect(tile.type).toEqual(CatalogKind.Processor);
    expect(tile.name).toEqual('my-processor');
    expect(tile.description).toEqual('My Processor Description');
  });

  it('should populate the tags', () => {
    const processorDef = {
      model: {
        label: 'label1,label2',
      },
    } as ICamelProcessorDefinition;

    const tile = camelProcessorToTile(processorDef);

    expect(tile.tags).toEqual(['label1', 'label2']);
  });
});

describe('kameletToTile', () => {
  it('should return a tile with the correct type', () => {
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

    const tile = kameletToTile(kameletDef);

    expect(tile.type).toEqual(CatalogKind.Kamelet);
    expect(tile.name).toEqual('my-kamelet');
    expect(tile.description).toEqual('My Kamelet Description');
  });

  it('should populate the tags for type', () => {
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

    const tile = kameletToTile(kameletDef);

    expect(tile.tags).toEqual(['source']);
  });

  it('should use the selected CatalogKind.Kamelet by default', () => {
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

    const tile = kameletToTile(kameletDef);

    expect(tile.type).toEqual(CatalogKind.Kamelet);
  });

  it('should populate the version for annotations', () => {
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

    const tile = kameletToTile(kameletDef);

    expect(tile.version).toEqual('1.0.0');
  });

  it('should populate the headerTags', () => {
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

    const tile = kameletToTile(kameletDef);

    expect(tile.headerTags).toEqual(['Kamelet', 'Preview']);
  });
});
