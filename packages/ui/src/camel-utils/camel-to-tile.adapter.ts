import { ITile } from '../components/Catalog/Catalog.models';
import {
  CatalogKind,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  ICitrusComponentDefinition,
  IKameletDefinition,
} from '../models';

export const camelComponentToTile = (componentDef: ICamelComponentDefinition): ITile => {
  const { name, title, description, supportLevel, label, provider, version } = componentDef.component;
  const headerTags: string[] = ['Component'];
  const tags: string[] = [];

  if (supportLevel && !componentDef.component.deprecated) {
    headerTags.push(supportLevel);
  } else {
    headerTags.push('Deprecated');
  }
  if (label) {
    tags.push(...label.split(','));
  }
  if (componentDef.component.consumerOnly) {
    tags.push('consumerOnly');
  }
  if (componentDef.component.producerOnly) {
    tags.push('producerOnly');
  }

  return {
    type: CatalogKind.Component,
    name,
    title,
    description,
    headerTags,
    tags,
    provider,
    version,
  };
};

export const camelProcessorToTile = (processorDef: ICamelProcessorDefinition): ITile => {
  const { name, title, description, supportLevel, label, provider } = processorDef.model;
  const headerTags: string[] = ['Processor'];
  const tags = label.split(',');

  if (supportLevel) {
    headerTags.push(supportLevel);
  }

  return {
    type: CatalogKind.Processor,
    name,
    title,
    description,
    headerTags,
    tags,
    provider,
  };
};

export const camelEntityToTile = (processorDef: ICamelProcessorDefinition): ITile => {
  const entityTile = camelProcessorToTile(processorDef);
  entityTile.type = CatalogKind.Entity;
  entityTile.headerTags = ['Entity'];

  return entityTile;
};

export const kameletToTile = (kameletDef: IKameletDefinition): ITile => {
  const headerTags: string[] = ['Kamelet'];
  if (kameletDef.metadata.annotations['camel.apache.org/kamelet.support.level']) {
    headerTags.push(kameletDef.metadata.annotations['camel.apache.org/kamelet.support.level']);
  }

  const tags: string[] = [];
  if (kameletDef.metadata.labels['camel.apache.org/kamelet.type']) {
    tags.push(kameletDef.metadata.labels['camel.apache.org/kamelet.type']);
  }

  let version = undefined;
  if (kameletDef.metadata.annotations['camel.apache.org/catalog.version']) {
    version = kameletDef.metadata.annotations['camel.apache.org/catalog.version'];
  }

  return {
    type: CatalogKind.Kamelet,
    name: kameletDef.metadata.name,
    title: kameletDef.spec.definition.title,
    description: kameletDef.spec.definition.description,
    headerTags,
    tags,
    version,
  };
};

export const citrusComponentToTile = (componentDefinition: ICitrusComponentDefinition): ITile => {
  const headerTags: string[] = [componentDefinition.kind];
  const tags: string[] = [];
  const version = '4.9.2'; // ToDo: Use version when populated in component definitions in Citrus catalog

  return {
    type: componentDefinition.kind,
    name: componentDefinition.name,
    title: componentDefinition.title || componentDefinition.name,
    description: componentDefinition.description,
    headerTags,
    tags,
    version,
  };
};
