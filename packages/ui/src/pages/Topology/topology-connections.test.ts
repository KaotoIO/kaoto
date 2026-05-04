import { EdgeStyle } from '@patternfly/react-topology';

import { BaseVisualEntity } from '../../models/visualization/base-visual-entity';
import {
  buildRouteConnectionExtras,
  DYNAMIC_ENDPOINT_ID_PREFIX,
  DYNAMIC_ENDPOINT_NODE_TYPE,
  EXTERNAL_ENDPOINT_ID_PREFIX,
  EXTERNAL_ENDPOINT_NODE_TYPE,
} from './topology-connections';

const mockEntity = (id: string, json: unknown): BaseVisualEntity =>
  ({
    id,
    toJSON: () => json,
  }) as unknown as BaseVisualEntity;

describe('buildRouteConnectionExtras', () => {
  it('returns empty extras when there are no routes', () => {
    expect(buildRouteConnectionExtras([], new Map())).toEqual({ edges: [], externalNodes: [], dynamicNodes: [] });
  });

  it('connects a producer to a consumer that share a direct: endpoint', () => {
    const producer = mockEntity('route-a', {
      route: {
        id: 'route-a',
        from: { uri: 'timer:tick' },
        steps: [{ to: { uri: 'direct:foo' } }],
      },
    });
    const consumer = mockEntity('route-b', {
      route: {
        id: 'route-b',
        from: { uri: 'direct:foo' },
        steps: [{ log: { message: 'hi' } }],
      },
    });
    const map = new Map([
      ['route-a', 'A|route'],
      ['route-b', 'B|route'],
    ]);

    const { edges, externalNodes } = buildRouteConnectionExtras([producer, consumer], map);

    expect(externalNodes).toEqual([]);
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: 'A|route',
      target: 'B|route',
      label: 'direct:foo',
      edgeStyle: EdgeStyle.solid,
    });
  });

  it('strips query parameters when matching endpoints', () => {
    const producer = mockEntity('route-a', {
      route: { from: { uri: 'timer:t' }, steps: [{ to: { uri: 'direct:foo?block=true' } }] },
    });
    const consumer = mockEntity('route-b', {
      route: { from: { uri: 'direct:foo' }, steps: [] },
    });
    const map = new Map([
      ['route-a', 'A|route'],
      ['route-b', 'B|route'],
    ]);

    const { edges, externalNodes } = buildRouteConnectionExtras([producer, consumer], map);
    expect(externalNodes).toEqual([]);
    expect(edges).toHaveLength(1);
    expect(edges[0].label).toBe('direct:foo');
  });

  it('matches seda, vm and direct-vm endpoints in addition to direct', () => {
    const entities = [
      mockEntity('a', { route: { from: { uri: 'timer:t' }, steps: [{ to: { uri: 'seda:x' } }] } }),
      mockEntity('b', { route: { from: { uri: 'seda:x' }, steps: [] } }),
      mockEntity('c', { route: { from: { uri: 'timer:t' }, steps: [{ to: { uri: 'vm:y' } }] } }),
      mockEntity('d', { route: { from: { uri: 'vm:y' }, steps: [] } }),
      mockEntity('e', { route: { from: { uri: 'timer:t' }, steps: [{ to: { uri: 'direct-vm:z' } }] } }),
      mockEntity('f', { route: { from: { uri: 'direct-vm:z' }, steps: [] } }),
    ];
    const map = new Map([
      ['a', 'A|route'],
      ['b', 'B|route'],
      ['c', 'C|route'],
      ['d', 'D|route'],
      ['e', 'E|route'],
      ['f', 'F|route'],
    ]);

    const { edges, externalNodes } = buildRouteConnectionExtras(entities, map);
    expect(externalNodes).toEqual([]);
    expect(edges).toHaveLength(3);
    expect(edges.map((e: { label?: string }) => e.label ?? '').sort((a, b) => a.localeCompare(b))).toEqual([
      'direct-vm:z',
      'seda:x',
      'vm:y',
    ]);
  });

  it('ignores non-VM endpoints like http or amqp', () => {
    const producer = mockEntity('route-a', {
      route: { from: { uri: 'timer:t' }, steps: [{ to: { uri: 'http://example.com' } }] },
    });
    const consumer = mockEntity('route-b', {
      route: { from: { uri: 'http://example.com' }, steps: [] },
    });
    const map = new Map([
      ['route-a', 'A|route'],
      ['route-b', 'B|route'],
    ]);

    expect(buildRouteConnectionExtras([producer, consumer], map)).toEqual({
      edges: [],
      externalNodes: [],
      dynamicNodes: [],
    });
  });

  it('detects to inside choice/when branches', () => {
    const producer = mockEntity('route-a', {
      route: {
        from: {
          uri: 'timer:t',
          steps: [
            {
              choice: {
                when: [{ simple: '${header.x}', steps: [{ to: { uri: 'direct:branch-a' } }] }],
                otherwise: { steps: [{ to: { uri: 'direct:branch-b' } }] },
              },
            },
          ],
        },
      },
    });
    const consumerA = mockEntity('route-b', { route: { from: { uri: 'direct:branch-a' }, steps: [] } });
    const consumerB = mockEntity('route-c', { route: { from: { uri: 'direct:branch-b' }, steps: [] } });
    const map = new Map([
      ['route-a', 'A|route'],
      ['route-b', 'B|route'],
      ['route-c', 'C|route'],
    ]);

    const { edges } = buildRouteConnectionExtras([producer, consumerA, consumerB], map);
    expect(edges).toHaveLength(2);
    expect(edges.map((e: { label?: string }) => e.label ?? '').sort((a, b) => a.localeCompare(b))).toEqual([
      'direct:branch-a',
      'direct:branch-b',
    ]);
  });

  it('also detects toD, wireTap, enrich and pollEnrich URIs', () => {
    const producer = mockEntity('route-a', {
      route: {
        from: {
          uri: 'timer:t',
          steps: [
            { toD: { uri: 'direct:dyn' } },
            { wireTap: { uri: 'direct:wire' } },
            { enrich: { uri: 'direct:rich' } },
            { pollEnrich: { uri: 'direct:poll' } },
          ],
        },
      },
    });
    const consumers = ['dyn', 'wire', 'rich', 'poll'].map((name, i) =>
      mockEntity(`c-${i}`, { route: { from: { uri: `direct:${name}` }, steps: [] } }),
    );
    const map = new Map<string, string>([
      ['route-a', 'A|route'],
      ['c-0', 'C0|route'],
      ['c-1', 'C1|route'],
      ['c-2', 'C2|route'],
      ['c-3', 'C3|route'],
    ]);

    const { edges } = buildRouteConnectionExtras([producer, ...consumers], map);
    expect(edges.map((e: { label?: string }) => e.label ?? '').sort((a, b) => a.localeCompare(b))).toEqual([
      'direct:dyn',
      'direct:poll',
      'direct:rich',
      'direct:wire',
    ]);
  });

  it('skips a route that calls itself via direct (and emits no external node)', () => {
    const entity = mockEntity('route-a', {
      route: { from: { uri: 'direct:loop' }, steps: [{ to: { uri: 'direct:loop' } }] },
    });
    const map = new Map([['route-a', 'A|route']]);
    expect(buildRouteConnectionExtras([entity], map)).toEqual({ edges: [], externalNodes: [], dynamicNodes: [] });
  });

  it('treats uri: "direct" with parameters.name as equivalent to "direct:name"', () => {
    const producer = mockEntity('route-a', {
      route: {
        from: { uri: 'timer:t' },
        steps: [{ to: { uri: 'direct', parameters: { name: 'route2' } } }],
      },
    });
    const consumer = mockEntity('route-b', {
      route: { from: { uri: 'direct', parameters: { name: 'route2' } } },
    });
    const map = new Map([
      ['route-a', 'A|route'],
      ['route-b', 'B|route'],
    ]);

    const { edges } = buildRouteConnectionExtras([producer, consumer], map);
    expect(edges).toHaveLength(1);
    expect(edges[0].label).toBe('direct:route2');
  });

  it('matches the canonical form (uri: direct:foo) against the parametric form (uri: direct + parameters.name)', () => {
    const producer = mockEntity('route-a', {
      route: { from: { uri: 'timer:t' }, steps: [{ to: { uri: 'direct:route2' } }] },
    });
    const consumer = mockEntity('route-b', {
      route: { from: { uri: 'direct', parameters: { name: 'route2' } } },
    });
    const map = new Map([
      ['route-a', 'A|route'],
      ['route-b', 'B|route'],
    ]);

    const { edges } = buildRouteConnectionExtras([producer, consumer], map);
    expect(edges).toHaveLength(1);
    expect(edges[0].label).toBe('direct:route2');
  });

  it('handles shorthand string form (to: "direct:foo")', () => {
    const producer = mockEntity('route-a', {
      route: { from: { uri: 'timer:t' }, steps: [{ to: 'direct:foo' }] },
    });
    const consumer = mockEntity('route-b', { route: { from: 'direct:foo', steps: [] } });
    const map = new Map([
      ['route-a', 'A|route'],
      ['route-b', 'B|route'],
    ]);

    const { edges } = buildRouteConnectionExtras([producer, consumer], map);
    expect(edges).toHaveLength(1);
    expect(edges[0].label).toBe('direct:foo');
  });

  it('emits an external-endpoint node and dashed edge when no consumer matches', () => {
    const producer = mockEntity('route-a', {
      route: { from: { uri: 'timer:t' }, steps: [{ to: { uri: 'direct:externalOne' } }] },
    });
    const map = new Map([['route-a', 'A|route']]);

    const { edges, externalNodes } = buildRouteConnectionExtras([producer], map);

    expect(externalNodes).toHaveLength(1);
    expect(externalNodes[0]).toMatchObject({
      id: `${EXTERNAL_ENDPOINT_ID_PREFIX}direct:externalOne`,
      type: EXTERNAL_ENDPOINT_NODE_TYPE,
      label: 'direct:externalOne',
    });
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: 'A|route',
      target: `${EXTERNAL_ENDPOINT_ID_PREFIX}direct:externalOne`,
      label: 'direct:externalOne',
      edgeStyle: EdgeStyle.dashed,
    });
  });

  it('reuses the same external-endpoint node when multiple producers reference it', () => {
    const producerA = mockEntity('route-a', {
      route: { from: { uri: 'timer:t' }, steps: [{ to: { uri: 'direct:shared' } }] },
    });
    const producerB = mockEntity('route-b', {
      route: { from: { uri: 'timer:t' }, steps: [{ to: { uri: 'direct:shared' } }] },
    });
    const map = new Map([
      ['route-a', 'A|route'],
      ['route-b', 'B|route'],
    ]);

    const { edges, externalNodes } = buildRouteConnectionExtras([producerA, producerB], map);

    expect(externalNodes).toHaveLength(1);
    expect(edges).toHaveLength(2);
    expect(edges.map((e) => e.source).sort((a, b) => a.localeCompare(b))).toEqual(['A|route', 'B|route']);
    expect(edges.every((e) => e.target === `${EXTERNAL_ENDPOINT_ID_PREFIX}direct:shared`)).toBe(true);
  });

  it('emits a dynamic-endpoint node for a toD with an expression URI', () => {
    const producer = mockEntity('route-a', {
      route: {
        from: { uri: 'timer:t', steps: [{ toD: { uri: '${header.foo}' } }] },
      },
    });
    const map = new Map([['route-a', 'A|route']]);

    const { edges, externalNodes, dynamicNodes } = buildRouteConnectionExtras([producer], map);

    expect(externalNodes).toEqual([]);
    expect(dynamicNodes).toHaveLength(1);
    expect(dynamicNodes[0]).toMatchObject({
      id: `${DYNAMIC_ENDPOINT_ID_PREFIX}\${header.foo}`,
      type: DYNAMIC_ENDPOINT_NODE_TYPE,
      label: '${header.foo}',
    });
    expect(edges).toHaveLength(1);
    expect(edges[0]).toMatchObject({
      source: 'A|route',
      target: `${DYNAMIC_ENDPOINT_ID_PREFIX}\${header.foo}`,
      label: '${header.foo}',
    });
  });

  it('reuses the same dynamic-endpoint node when the same expression is referenced twice', () => {
    const producerA = mockEntity('route-a', {
      route: { from: { uri: 'timer:t', steps: [{ toD: { uri: '${header.target}' } }] } },
    });
    const producerB = mockEntity('route-b', {
      route: { from: { uri: 'timer:t', steps: [{ toD: { uri: '${header.target}' } }] } },
    });
    const map = new Map([
      ['route-a', 'A|route'],
      ['route-b', 'B|route'],
    ]);

    const { edges, dynamicNodes } = buildRouteConnectionExtras([producerA, producerB], map);
    expect(dynamicNodes).toHaveLength(1);
    expect(edges).toHaveLength(2);
  });

  it('does not emit an external node for a producer when at least one internal consumer matches', () => {
    const producer = mockEntity('route-a', {
      route: { from: { uri: 'timer:t' }, steps: [{ to: { uri: 'direct:foo' } }] },
    });
    const consumer = mockEntity('route-b', { route: { from: { uri: 'direct:foo' }, steps: [] } });
    const map = new Map([
      ['route-a', 'A|route'],
      ['route-b', 'B|route'],
    ]);

    const { externalNodes } = buildRouteConnectionExtras([producer, consumer], map);
    expect(externalNodes).toEqual([]);
  });
});
