import { ITile } from '../components/Catalog/Catalog.models';
import { CatalogKind } from '../models/catalog-kind';

export const kameletSourceTile: ITile = {
  type: CatalogKind.Kamelet,
  name: 'source',
  title: 'Kamelet Source',
  tags: ['source'],
  iconUrl: 'test',
};

export const kameletSinkTile: ITile = {
  type: CatalogKind.Kamelet,
  name: 'sink',
  title: 'Kamelet Sink',
  tags: ['sink'],
  iconUrl: 'test',
};

export const kameletBeerSourceTile: ITile = {
  type: CatalogKind.Kamelet,
  name: 'beer-source',
  title: 'Beer source',
  tags: ['source'],
  iconUrl: 'test',
};

export const kameletStringTemplateActionTile: ITile = {
  type: CatalogKind.Kamelet,
  name: 'string-template-action',
  title: 'String Template Action',
  tags: ['action'],
  iconUrl: 'test',
};

export const kameletSSHSinkTile: ITile = {
  type: CatalogKind.Kamelet,
  name: 'ssh-sink',
  title: 'SSH Sink',
  tags: ['sink'],
  iconUrl: 'test',
};

export const processorCircuitBreakerTile: ITile = {
  type: CatalogKind.Processor,
  name: 'circuitBreaker',
  title: 'Circuit Breaker',
  tags: ['eip', 'routing', 'error'],
  iconUrl: 'test',
};

export const processorOnFallbackTile: ITile = {
  type: CatalogKind.Processor,
  name: 'onFallback',
  title: 'On Fallback',
  tags: ['eip', 'routing', 'error'],
  iconUrl: 'test',
};

export const processorTile: ITile = {
  type: CatalogKind.Processor,
  name: 'choice',
  title: 'Choice',
  tags: ['eip', 'routing'],
  iconUrl: 'test',
};

export const processorWhenTile: ITile = {
  type: CatalogKind.Processor,
  name: 'when',
  title: 'When',
  tags: ['eip', 'routing'],
  iconUrl: 'test',
};

export const processorOtherwiseTile: ITile = {
  type: CatalogKind.Processor,
  name: 'otherwise',
  title: 'Otherwise',
  tags: ['eip', 'routing'],
  iconUrl: 'test',
};

export const processorInterceptTile: ITile = {
  type: CatalogKind.Processor,
  name: 'intercept',
  title: 'Intercept',
  tags: ['configuration'],
  iconUrl: 'test',
};

export const processorDoCatchTile: ITile = {
  type: CatalogKind.Processor,
  name: 'doCatch',
  title: 'Do Catch',
  tags: ['eip', 'error'],
  iconUrl: 'test',
};

export const processorDoFinallyTile: ITile = {
  type: CatalogKind.Processor,
  name: 'doFinally',
  title: 'Do Finally',
  tags: ['eip', 'error'],
  iconUrl: 'test',
};

export const componentSlackTile: ITile = {
  type: CatalogKind.Component,
  name: 'slack',
  title: 'Slack',
  tags: ['social'],
  iconUrl: 'test',
};

export const componentKubernetesSecretsTile: ITile = {
  type: CatalogKind.Component,
  name: 'kube-secrets',
  title: 'Kubernetes Secrets',
  tags: ['container', 'cloud', 'producerOnly'],
  iconUrl: 'test',
};

export const componentCronTile: ITile = {
  type: CatalogKind.Component,
  name: 'cron',
  title: 'Cron',
  tags: ['scheduling', 'consumerOnly'],
  iconUrl: 'test',
};

export const componentDirectTile: ITile = {
  type: CatalogKind.Component,
  name: 'direct',
  title: 'Direct',
  tags: ['messaging'],
  iconUrl: 'test',
};

export const tiles: ITile[] = [
  kameletSourceTile,
  kameletSinkTile,
  kameletBeerSourceTile,
  kameletStringTemplateActionTile,
  kameletSSHSinkTile,
  processorTile,
  processorCircuitBreakerTile,
  processorOnFallbackTile,
  processorWhenTile,
  processorOtherwiseTile,
  processorInterceptTile,
  processorDoCatchTile,
  processorDoFinallyTile,
  componentSlackTile,
  componentKubernetesSecretsTile,
  componentCronTile,
  componentDirectTile,
];

export const longTileList: ITile[] = [
  {
    name: 'activemq',
    tags: ['messaging'],
    title: 'ActiveMQ 5.x',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'activemq6',
    tags: ['messaging'],
    title: 'ActiveMQ 6.x',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'amqp',
    tags: ['messaging'],
    title: 'AMQP',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'arangodb',
    tags: ['database'],
    title: 'ArangoDb',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'as2',
    tags: ['file'],
    title: 'AS2',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'cxf',
    tags: ['http'],
    title: 'CXF',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'exec',
    tags: ['messaging'],
    title: 'Exec',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'toD',
    tags: ['eip'],
    title: 'to D',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'doTry',
    tags: ['eip'],
    title: 'doTry',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'Validate',
    tags: ['eip'],
    title: 'Validate',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'when',
    tags: ['eip'],
    title: 'when',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'onException',
    tags: ['eip'],
    title: 'onException',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'wireTap',
    tags: ['eip'],
    title: 'wireTap',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'intercept',
    tags: ['eip'],
    title: 'intercept',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'saga',
    tags: ['eip'],
    title: 'saga',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'script',
    tags: ['eip'],
    title: 'script',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'sort',
    tags: ['eip'],
    title: 'sort',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'sink',
    tags: ['sink'],
    title: 'Kamelet Sink',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'kafka-source',
    tags: ['source'],
    title: 'Kafka Source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'http-source',
    tags: ['source'],
    title: 'http-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'ssh-source',
    tags: ['source'],
    title: 'ssh-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'jira-source',
    tags: ['source'],
    title: 'jira-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'coffee-source',
    tags: ['source'],
    title: 'coffee-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'mariadb-source',
    tags: ['source'],
    title: 'mariadbsource',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'dropbox-source',
    tags: ['source'],
    title: 'dropbox-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'cassandra-source',
    tags: ['source'],
    title: 'cassandrasource',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'aws-redshift-source',
    tags: ['source'],
    title: 'aws-redshift-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'redis-source',
    tags: ['source'],
    title: 'redis-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'pulsar-sink',
    tags: ['sink'],
    title: 'pulsar-sink',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'dropbox-sink',
    tags: ['source'],
    title: 'dropbox-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'activemq-1',
    tags: ['messaging'],
    title: 'ActiveMQ 5.x',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'activemq6-1',
    tags: ['messaging'],
    title: 'ActiveMQ 6.x',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'amqp-1',
    tags: ['messaging'],
    title: 'AMQP',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'arangodb-1',
    tags: ['database'],
    title: 'ArangoDb',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'as2-1',
    tags: ['file'],
    title: 'AS2',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'cxf-1',
    tags: ['http'],
    title: 'CXF',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'exec-1',
    tags: ['messaging'],
    title: 'Exec',
    type: 'component',
    iconUrl: 'test',
  },
  {
    name: 'toD-1',
    tags: ['eip'],
    title: 'to D',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'doTry-1',
    tags: ['eip'],
    title: 'doTry',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'Validate-1',
    tags: ['eip'],
    title: 'Validate',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'when-1',
    tags: ['eip'],
    title: 'when',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'onException-1',
    tags: ['eip'],
    title: 'onException',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'wireTap-1',
    tags: ['eip'],
    title: 'wireTap',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'intercept-1',
    tags: ['eip'],
    title: 'intercept',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'saga-1',
    tags: ['eip'],
    title: 'saga',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'script-1',
    tags: ['eip'],
    title: 'script',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'sort-1',
    tags: ['eip'],
    title: 'sort',
    type: 'processor',
    iconUrl: 'test',
  },
  {
    name: 'sink-1',
    tags: ['sink'],
    title: 'Kamelet Sink',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'kafka-source-1',
    tags: ['source'],
    title: 'Kafka Source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'http-source-1',
    tags: ['source'],
    title: 'http-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'ssh-source-1',
    tags: ['source'],
    title: 'ssh-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'jira-source-1',
    tags: ['source'],
    title: 'jira-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'coffee-source-1',
    tags: ['source'],
    title: 'coffee-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'mariadb-source-1',
    tags: ['source'],
    title: 'mariadbsource',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'dropbox-source-1',
    tags: ['source'],
    title: 'dropbox-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'cassandra-source-1',
    tags: ['source'],
    title: 'cassandrasource',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'aws-redshift-source-1',
    tags: ['source'],
    title: 'aws-redshift-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'redis-source-1',
    tags: ['source'],
    title: 'redis-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'pulsar-sink-1',
    tags: ['sink'],
    title: 'pulsar-sink',
    type: 'kamelet',
    iconUrl: 'test',
  },
  {
    name: 'dropbox-sink-1',
    tags: ['source'],
    title: 'dropbox-source',
    type: 'kamelet',
    iconUrl: 'test',
  },
];
