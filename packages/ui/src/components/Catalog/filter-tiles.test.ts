import { CatalogKind } from '../../models/catalog-kind';
import { ITile } from './Catalog.models';
import { filterTiles } from './filter-tiles';

describe('filterTiles', () => {
  const tilesMap: Record<string, ITile> = {
    activemq: {
      name: 'activemq',
      title: 'ActiveMQ',
      description: 'Send messages to (or consume from) Apache ActiveMQ.',
      tags: ['messaging'],
      type: CatalogKind.Component,
    },
    cometd: {
      name: 'cometd',
      title: 'CometD',
      description:
        'Offers publish/subscribe, peer-to-peer (via a server), and RPC style messaging using the CometD/Bayeux protocol.',
      tags: ['networking', 'messaging'],
      type: CatalogKind.Component,
    },
    cron: {
      name: 'cron',
      title: 'Cron',
      description: 'Schedule a task to run at a specific time.',
      tags: ['scheduling'],
      type: CatalogKind.Component,
      provider: 'Red Hat',
    },
    hazelcast: {
      name: 'hazelcast',
      title: 'Hazelcast',
      description: 'Perform operations on Hazelcast distributed queue.',
      tags: ['cache', 'clustering', 'messaging'],
      type: CatalogKind.Component,
    },
    setBody: {
      name: 'setBody',
      title: 'Set Body',
      description: 'Set the message body.',
      tags: ['eip', 'transformation'],
      type: CatalogKind.Pattern,
    },
    split: {
      name: 'split',
      title: 'Split',
      description: 'Split a message into parts.',
      tags: ['eip', 'routing'],
      type: CatalogKind.Pattern,
    },
    beerSource: {
      name: 'beerSource',
      title: 'Beer Source',
      description: 'A source that emits beer.',
      tags: ['beer', 'source'],
      type: CatalogKind.Kamelet,
    },
    slackSource: {
      name: 'slackSource',
      title: 'Slack Source',
      description: 'A source that emits messages from Slack.',
      tags: ['slack', 'source'],
      type: CatalogKind.Kamelet,
    },
  };
  const tiles = Object.values(tilesMap);

  it('should filter tiles by search term', () => {
    const options = { searchTerm: 'message' };
    const result = filterTiles(tiles, options);

    expect(result).toEqual([tilesMap.activemq, tilesMap.setBody, tilesMap.split, tilesMap.slackSource]);
  });

  it('should filter tiles by provider', () => {
    const options = { selectedProviders: ['Red Hat'] };
    const result = filterTiles(tiles, options);

    expect(result).toEqual([tilesMap.cron]);
  });

  it('should return tiles without provider when community is selected', () => {
    const options = { selectedProviders: ['Community'] };
    const result = filterTiles(tiles, options);

    expect(result).toEqual([
      tilesMap.activemq,
      tilesMap.cometd,
      tilesMap.hazelcast,
      tilesMap.setBody,
      tilesMap.split,
      tilesMap.beerSource,
      tilesMap.slackSource,
    ]);
  });

  it('should filter tiles by a single tag', () => {
    const options = { searchTags: ['messaging'] };
    const result = filterTiles(tiles, options);
    expect(result).toEqual([tilesMap.activemq, tilesMap.cometd, tilesMap.hazelcast]);
  });

  it('should filter tiles by multiple tags', () => {
    const options = { searchTags: ['messaging', 'clustering'] };
    const result = filterTiles(tiles, options);
    expect(result).toEqual([tilesMap.hazelcast]);
  });

  it('should filter tiles by search term and tags', () => {
    const options = { searchTerm: 'cr', searchTags: ['scheduling'] };
    const result = filterTiles(tiles, options);
    expect(result).toEqual([tilesMap.cron]);
  });
});
