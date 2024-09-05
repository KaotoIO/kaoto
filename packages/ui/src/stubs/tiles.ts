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

export const longTileList: ITile[] = [
  {
    name: 'activemq',
    tags: ['messaging'],
    title: 'ActiveMQ 5.x',
    type: 'component',
  },
  {
    name: 'activemq6',
    tags: ['messaging'],
    title: 'ActiveMQ 6.x',
    type: 'component',
  },
  {
    name: 'amqp',
    tags: ['messaging'],
    title: 'AMQP',
    type: 'component',
  },
  {
    name: 'arangodb',
    tags: ['database'],
    title: 'ArangoDb',
    type: 'component',
  },
  {
    name: 'as2',
    tags: ['file'],
    title: 'AS2',
    type: 'component',
  },
  {
    name: 'cxf',
    tags: ['http'],
    title: 'CXF',
    type: 'component',
  },
  {
    name: 'exec',
    tags: ['messaging'],
    title: 'Exec',
    type: 'component',
  },
  {
    name: 'toD',
    tags: ['eip'],
    title: 'to D',
    type: 'processor',
  },
  {
    name: 'doTry',
    tags: ['eip'],
    title: 'doTry',
    type: 'processor',
  },
  {
    name: 'Validate',
    tags: ['eip'],
    title: 'Validate',
    type: 'processor',
  },
  {
    name: 'when',
    tags: ['eip'],
    title: 'when',
    type: 'processor',
  },
  {
    name: 'onException',
    tags: ['eip'],
    title: 'onException',
    type: 'processor',
  },
  {
    name: 'wireTap',
    tags: ['eip'],
    title: 'wireTap',
    type: 'processor',
  },
  {
    name: 'intercept',
    tags: ['eip'],
    title: 'intercept',
    type: 'processor',
  },
  {
    name: 'saga',
    tags: ['eip'],
    title: 'saga',
    type: 'processor',
  },
  {
    name: 'script',
    tags: ['eip'],
    title: 'script',
    type: 'processor',
  },
  {
    name: 'sort',
    tags: ['eip'],
    title: 'sort',
    type: 'processor',
  },
  {
    name: 'sink',
    tags: ['sink'],
    title: 'Kamelet Sink',
    type: 'kamelet',
  },
  {
    name: 'kafka-source',
    tags: ['source'],
    title: 'Kafka Source',
    type: 'kamelet',
  },
  {
    name: 'http-source',
    tags: ['source'],
    title: 'http-source',
    type: 'kamelet',
  },
  {
    name: 'ssh-source',
    tags: ['source'],
    title: 'ssh-source',
    type: 'kamelet',
  },
  {
    name: 'jira-source',
    tags: ['source'],
    title: 'jira-source',
    type: 'kamelet',
  },
  {
    name: 'coffee-source',
    tags: ['source'],
    title: 'coffee-source',
    type: 'kamelet',
  },
  {
    name: 'mariadb-source',
    tags: ['source'],
    title: 'mariadbsource',
    type: 'kamelet',
  },
  {
    name: 'dropbox-source',
    tags: ['source'],
    title: 'dropbox-source',
    type: 'kamelet',
  },
  {
    name: 'cassandra-source',
    tags: ['source'],
    title: 'cassandrasource',
    type: 'kamelet',
  },
  {
    name: 'aws-redshift-source',
    tags: ['source'],
    title: 'aws-redshift-source',
    type: 'kamelet',
  },
  {
    name: 'redis-source',
    tags: ['source'],
    title: 'redis-source',
    type: 'kamelet',
  },
  {
    name: 'pulsar-sink',
    tags: ['sink'],
    title: 'pulsar-sink',
    type: 'kamelet',
  },
  {
    name: 'dropbox-sink',
    tags: ['source'],
    title: 'dropbox-source',
    type: 'kamelet',
  },
  {
    name: 'activemq-1',
    tags: ['messaging'],
    title: 'ActiveMQ 5.x',
    type: 'component',
  },
  {
    name: 'activemq6-1',
    tags: ['messaging'],
    title: 'ActiveMQ 6.x',
    type: 'component',
  },
  {
    name: 'amqp-1',
    tags: ['messaging'],
    title: 'AMQP',
    type: 'component',
  },
  {
    name: 'arangodb-1',
    tags: ['database'],
    title: 'ArangoDb',
    type: 'component',
  },
  {
    name: 'as2-1',
    tags: ['file'],
    title: 'AS2',
    type: 'component',
  },
  {
    name: 'cxf-1',
    tags: ['http'],
    title: 'CXF',
    type: 'component',
  },
  {
    name: 'exec-1',
    tags: ['messaging'],
    title: 'Exec',
    type: 'component',
  },
  {
    name: 'toD-1',
    tags: ['eip'],
    title: 'to D',
    type: 'processor',
  },
  {
    name: 'doTry-1',
    tags: ['eip'],
    title: 'doTry',
    type: 'processor',
  },
  {
    name: 'Validate-1',
    tags: ['eip'],
    title: 'Validate',
    type: 'processor',
  },
  {
    name: 'when-1',
    tags: ['eip'],
    title: 'when',
    type: 'processor',
  },
  {
    name: 'onException-1',
    tags: ['eip'],
    title: 'onException',
    type: 'processor',
  },
  {
    name: 'wireTap-1',
    tags: ['eip'],
    title: 'wireTap',
    type: 'processor',
  },
  {
    name: 'intercept-1',
    tags: ['eip'],
    title: 'intercept',
    type: 'processor',
  },
  {
    name: 'saga-1',
    tags: ['eip'],
    title: 'saga',
    type: 'processor',
  },
  {
    name: 'script-1',
    tags: ['eip'],
    title: 'script',
    type: 'processor',
  },
  {
    name: 'sort-1',
    tags: ['eip'],
    title: 'sort',
    type: 'processor',
  },
  {
    name: 'sink-1',
    tags: ['sink'],
    title: 'Kamelet Sink',
    type: 'kamelet',
  },
  {
    name: 'kafka-source-1',
    tags: ['source'],
    title: 'Kafka Source',
    type: 'kamelet',
  },
  {
    name: 'http-source-1',
    tags: ['source'],
    title: 'http-source',
    type: 'kamelet',
  },
  {
    name: 'ssh-source-1',
    tags: ['source'],
    title: 'ssh-source',
    type: 'kamelet',
  },
  {
    name: 'jira-source-1',
    tags: ['source'],
    title: 'jira-source',
    type: 'kamelet',
  },
  {
    name: 'coffee-source-1',
    tags: ['source'],
    title: 'coffee-source',
    type: 'kamelet',
  },
  {
    name: 'mariadb-source-1',
    tags: ['source'],
    title: 'mariadbsource',
    type: 'kamelet',
  },
  {
    name: 'dropbox-source-1',
    tags: ['source'],
    title: 'dropbox-source',
    type: 'kamelet',
  },
  {
    name: 'cassandra-source-1',
    tags: ['source'],
    title: 'cassandrasource',
    type: 'kamelet',
  },
  {
    name: 'aws-redshift-source-1',
    tags: ['source'],
    title: 'aws-redshift-source',
    type: 'kamelet',
  },
  {
    name: 'redis-source-1',
    tags: ['source'],
    title: 'redis-source',
    type: 'kamelet',
  },
  {
    name: 'pulsar-sink-1',
    tags: ['sink'],
    title: 'pulsar-sink',
    type: 'kamelet',
  },
  {
    name: 'dropbox-sink-1',
    tags: ['source'],
    title: 'dropbox-source',
    type: 'kamelet',
  },
];
