import { ITile } from '../components/Catalog/Catalog.models';
import { CatalogKind } from '../models/catalog-kind';

export const kameletSourceTile: ITile = {
  type: CatalogKind.Kamelet,
  name: 'source',
  title: 'Kamelet Source',
  tags: ['source'],
};

export const kameletSinkTile: ITile = {
  type: CatalogKind.Kamelet,
  name: 'sink',
  title: 'Kamelet Sink',
  tags: ['sink'],
};

export const kameletBeerSourceTile: ITile = {
  type: CatalogKind.Kamelet,
  name: 'beer-source',
  title: 'Beer source',
  tags: ['source'],
};

export const kameletStringTemplateActionTile: ITile = {
  type: CatalogKind.Kamelet,
  name: 'string-template-action',
  title: 'String Template Action',
  tags: ['action'],
};

export const kameletSSHSinkTile: ITile = {
  type: CatalogKind.Kamelet,
  name: 'ssh-sink',
  title: 'SSH Sink',
  tags: ['sink'],
};

export const processorTile: ITile = {
  type: CatalogKind.Processor,
  name: 'choice',
  title: 'Choice',
  tags: ['eip', 'routing'],
};

export const processorWhenTile: ITile = {
  type: CatalogKind.Processor,
  name: 'when',
  title: 'When',
  tags: ['eip', 'routing'],
};

export const processorOtherwiseTile: ITile = {
  type: CatalogKind.Processor,
  name: 'otherwise',
  title: 'Otherwise',
  tags: ['eip', 'routing'],
};

export const processorInterceptTile: ITile = {
  type: CatalogKind.Processor,
  name: 'intercept',
  title: 'Intercept',
  tags: ['configuration'],
};

export const componentSlackTile: ITile = {
  type: CatalogKind.Component,
  name: 'slack',
  title: 'Slack',
  tags: ['social'],
};

export const componentKubernetesSecretsTile: ITile = {
  type: CatalogKind.Component,
  name: 'kube-secrets',
  title: 'Kubernetes Secrets',
  tags: ['container', 'cloud', 'producerOnly'],
};

export const componentCronTile: ITile = {
  type: CatalogKind.Component,
  name: 'cron',
  title: 'Cron',
  tags: ['scheduling', 'consumerOnly'],
};

export const tiles: ITile[] = [
  kameletSourceTile,
  kameletSinkTile,
  kameletBeerSourceTile,
  kameletStringTemplateActionTile,
  kameletSSHSinkTile,
  processorTile,
  processorWhenTile,
  processorOtherwiseTile,
  processorInterceptTile,
  componentSlackTile,
  componentKubernetesSecretsTile,
  componentCronTile,
];
