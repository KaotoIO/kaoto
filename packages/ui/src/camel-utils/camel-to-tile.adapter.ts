import { ITile } from '../components/Catalog/Tile.models';
import { CatalogKind, ICamelComponentDefinition, ICamelProcessorDefinition } from '../models';
import { IKameletDefinition } from '../models/kamelets-catalog';

export const camelComponentToTile = (componentDef: ICamelComponentDefinition): ITile => {
  const { name, title, description, supportLevel, label, version } = componentDef.component;
  const headerTags: string[] = [];
  const tags: string[] = [];

  if (supportLevel) {
    headerTags.push(supportLevel);
  }
  if (label) {
    tags.push(...label.split(','));
  }
  if (version) {
    tags.push(version);
  }

  return {
    type: CatalogKind.Component,
    name,
    title,
    description,
    headerTags,
    tags,
    rawObject: componentDef,
  };
};

export const camelProcessorToTile = (processorDef: ICamelProcessorDefinition): ITile => {
  const { name, title, description, label } = processorDef.model;
  const tags = label.split(',');

  return {
    type: CatalogKind.Processor,
    name,
    title,
    description,
    tags,
    rawObject: processorDef,
  };
};

export const kameletToTile = (kameletDef: IKameletDefinition): ITile => {
  const tags: string[] = [];
  if (kameletDef.metadata.labels['camel.apache.org/kamelet.type']) {
    tags.push(kameletDef.metadata.labels['camel.apache.org/kamelet.type']);
  }
  if (kameletDef.metadata.annotations['camel.apache.org/catalog.version']) {
    tags.push(kameletDef.metadata.annotations['camel.apache.org/catalog.version']);
  }

  return {
    type: CatalogKind.Kamelet,
    name: kameletDef.metadata.name,
    title: kameletDef.spec.definition.title,
    description: kameletDef.spec.definition.description,
    tags,
    rawObject: kameletDef,
  };
};
