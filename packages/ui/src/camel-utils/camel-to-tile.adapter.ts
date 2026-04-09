import { ITile } from '../components/Catalog/Catalog.models';
import { getIconRequest } from '../icon-resolver/getIconRequest';
import {
  CatalogKind,
  ICamelComponentDefinition,
  ICamelProcessorDefinition,
  ICitrusComponentDefinition,
  IKameletDefinition,
} from '../models';

export const camelComponentToTile = async (componentDef: ICamelComponentDefinition): Promise<ITile> => {
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

  const { icon: iconUrl } = await getIconRequest(CatalogKind.Component, name);

  return {
    type: CatalogKind.Component,
    name,
    title,
    description,
    headerTags,
    tags,
    provider,
    version,
    iconUrl,
  };
};

export const camelProcessorToTile = async (processorDef: ICamelProcessorDefinition): Promise<ITile> => {
  const { name, title, description, supportLevel, label, provider } = processorDef.model;
  const headerTags: string[] = ['Processor'];
  const tags = label.split(',');

  if (supportLevel) {
    headerTags.push(supportLevel);
  }

  const { icon: iconUrl } = await getIconRequest(CatalogKind.Processor, name);

  return {
    type: CatalogKind.Processor,
    name,
    title,
    description,
    headerTags,
    tags,
    provider,
    iconUrl,
  };
};

export const camelEntityToTile = async (processorDef: ICamelProcessorDefinition): Promise<ITile> => {
  const entityTile = await camelProcessorToTile(processorDef);
  entityTile.type = CatalogKind.Entity;
  entityTile.headerTags = ['Entity'];

  const { icon: iconUrl } = await getIconRequest(CatalogKind.Entity, entityTile.name);
  entityTile.iconUrl = iconUrl;

  return entityTile;
};

export const kameletToTile = async (kameletDef: IKameletDefinition): Promise<ITile> => {
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

  const { icon: iconUrl } = await getIconRequest(CatalogKind.Kamelet, kameletDef.metadata.name);

  return {
    type: CatalogKind.Kamelet,
    name: kameletDef.metadata.name,
    title: kameletDef.spec.definition.title,
    description: kameletDef.spec.definition.description,
    headerTags,
    tags,
    version,
    iconUrl,
  };
};

export const citrusComponentToTile = async (componentDefinition: ICitrusComponentDefinition): Promise<ITile> => {
  const { kind, version, name, title, description } = componentDefinition;

  const headerTags: string[] = [kind];
  const tags: string[] = [];

  const { icon: iconUrl } = await getIconRequest(kind, name);

  return {
    type: kind,
    name: name,
    title: title || name,
    description: description,
    headerTags,
    tags,
    version,
    iconUrl,
  };
};
