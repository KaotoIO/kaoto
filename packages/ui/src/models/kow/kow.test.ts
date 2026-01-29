/**
 * KOW (Kaoto Object Walker) Tests
 *
 * These tests demonstrate how to use the KOW tree infrastructure for:
 * - Creating and navigating trees
 * - Using type guards
 * - Implementing custom visitors
 * - Sorting with the SortingVisitor
 */
import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { parse } from 'yaml';

import { DynamicCatalogRegistry } from '../../dynamic-catalog';
import { DynamicCatalog } from '../../dynamic-catalog/dynamic-catalog';
import { ICatalogProvider } from '../../dynamic-catalog/models';
import { getFirstCatalogMap } from '../../stubs/test-load-catalog';
import { CatalogKind } from '../catalog-kind';
import {
  CamelKowNodeType,
  // Camel implementation
  createCamelKowTree,
  ICamelKowNode,
  // Base interfaces
  IKowNode,
  IKowNodeVisitor,
  // Visitors
  SortingVisitor,
} from './index';

describe('KOW - Kaoto Object Walker', () => {
  beforeAll(async () => {
    // Load all catalogs properly
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);

    // Set up DynamicCatalogRegistry
    const registry = DynamicCatalogRegistry.get();

    // Create providers for each catalog type
    const createProvider = <T>(catalogMap: Record<string, T>): ICatalogProvider<T> => ({
      id: 'test-provider',
      fetch: async (key: string) => catalogMap[key],
      fetchAll: async () => catalogMap,
    });

    registry.setCatalog(CatalogKind.Component, new DynamicCatalog(createProvider(catalogsMap.componentCatalogMap)));
    registry.setCatalog(CatalogKind.Processor, new DynamicCatalog(createProvider(catalogsMap.modelCatalogMap)));
    registry.setCatalog(CatalogKind.Pattern, new DynamicCatalog(createProvider(catalogsMap.patternCatalogMap)));
    registry.setCatalog(CatalogKind.Entity, new DynamicCatalog(createProvider(catalogsMap.entitiesCatalog)));
    registry.setCatalog(CatalogKind.Language, new DynamicCatalog(createProvider(catalogsMap.languageCatalog)));
    registry.setCatalog(CatalogKind.Dataformat, new DynamicCatalog(createProvider(catalogsMap.dataformatCatalog)));
    registry.setCatalog(CatalogKind.Loadbalancer, new DynamicCatalog(createProvider(catalogsMap.loadbalancerCatalog)));

    // Pre-populate the cache by fetching each catalog entry
    await Promise.all([
      ...Object.keys(catalogsMap.componentCatalogMap).map((key) => registry.getEntity(CatalogKind.Component, key)),
      ...Object.keys(catalogsMap.modelCatalogMap).map((key) => registry.getEntity(CatalogKind.Processor, key)),
      ...Object.keys(catalogsMap.patternCatalogMap).map((key) => registry.getEntity(CatalogKind.Pattern, key)),
      ...Object.keys(catalogsMap.entitiesCatalog).map((key) => registry.getEntity(CatalogKind.Entity, key)),
      ...Object.keys(catalogsMap.languageCatalog).map((key) => registry.getEntity(CatalogKind.Language, key)),
      ...Object.keys(catalogsMap.dataformatCatalog).map((key) => registry.getEntity(CatalogKind.Dataformat, key)),
      ...Object.keys(catalogsMap.loadbalancerCatalog).map((key) => registry.getEntity(CatalogKind.Loadbalancer, key)),
    ]);
  });

  afterAll(() => {
    DynamicCatalogRegistry.get().clearRegistry();
  });

  describe('Tree Creation', () => {
    it('should create a KOW tree from a simple route', () => {
      const routeData = {
        id: 'route-1',
        from: {
          uri: 'timer:tick',
          steps: [],
        },
      };

      const tree = createCamelKowTree('route', routeData);

      expect(tree.name).toBe('route');
      expect(tree.path).toBe('route');
      expect(tree.type).toBe(CamelKowNodeType.Entity);
      expect(tree.data).toEqual(routeData);
    });

    it('should create a KOW tree from YAML', () => {
      const yaml = `
        id: my-route
        from:
          uri: timer:tick
          parameters:
            period: 1000
          steps:
            - log:
                message: Hello World
      `;

      const routeData = parse(yaml);
      const tree = createCamelKowTree('route', routeData);

      expect(tree.name).toBe('route');
      expect(tree.type).toBe(CamelKowNodeType.Entity);
    });
  });

  describe('Tree Navigation', () => {
    it('should navigate to children', () => {
      const routeData = {
        id: 'route-1',
        from: {
          uri: 'timer:tick',
          steps: [{ log: { message: 'Hello' } }, { to: { uri: 'direct:end' } }],
        },
      };

      const tree = createCamelKowTree('route', routeData);
      const children = tree.getChildren();

      // Route has 'from' as a child (id is primitive, not a child node)
      expect(children.length).toBeGreaterThan(0);

      // Find the 'from' child
      const fromChild = children.find((c) => c.name === 'from');
      expect(fromChild).toBeDefined();
      expect(fromChild?.type).toBe(CamelKowNodeType.Entity);
    });

    it('should navigate parent relationships', () => {
      const routeData = {
        id: 'route-1',
        from: {
          uri: 'timer:tick',
          steps: [],
        },
      };

      const tree = createCamelKowTree('route', routeData);
      const children = tree.getChildren();
      const fromChild = children.find((c) => c.name === 'from');

      expect(fromChild?.getParent()).toBe(tree);
      expect(tree.getParent()).toBeUndefined();
    });

    it('should check if node has children', () => {
      const routeData = {
        id: 'route-1',
        from: {
          uri: 'timer:tick',
          steps: [],
        },
      };

      const tree = createCamelKowTree('route', routeData);
      expect(tree.hasChildren()).toBe(true);
    });
  });

  describe('Camel Type Guards', () => {
    it('should identify Entity nodes', () => {
      const tree = createCamelKowTree('route', { id: 'route-1' });
      expect(tree.isEntity()).toBe(true);
      expect(tree.isEip()).toBe(false);
    });

    it('should identify EIP nodes', () => {
      const tree = createCamelKowTree('choice', {
        when: [{ simple: '${body} == "test"', steps: [] }],
      });
      expect(tree.isEip()).toBe(true);
      expect(tree.isEntity()).toBe(false);
    });

    it('should identify Language nodes', () => {
      const tree = createCamelKowTree('simple', {
        expression: '${body}',
        resultType: 'java.lang.String',
      });
      expect(tree.isLanguage()).toBe(true);
    });

    it('should provide URI access for components', () => {
      const tree = createCamelKowTree('from', {
        uri: 'timer:tick?period=1000',
        steps: [],
      }) as ICamelKowNode;

      expect(tree.getUri()).toBe('timer:tick?period=1000');
      expect(tree.getComponentName()).toBe('timer');
    });
  });

  describe('Visitor Pattern', () => {
    /**
     * Example: Custom visitor that counts nodes by type
     */
    class NodeCounterVisitor implements IKowNodeVisitor<CamelKowNodeType, Map<CamelKowNodeType, number>> {
      visit(node: IKowNode<unknown, CamelKowNodeType, unknown>): Map<CamelKowNodeType, number> {
        const counts = new Map<CamelKowNodeType, number>();

        // Count this node
        const currentCount = counts.get(node.type) || 0;
        counts.set(node.type, currentCount + 1);

        // Visit children and merge counts
        for (const child of node.getChildren()) {
          const childCounts = child.accept(this);
          for (const [type, count] of childCounts) {
            const existing = counts.get(type) || 0;
            counts.set(type, existing + count);
          }
        }

        return counts;
      }
    }

    it('should support custom visitors', () => {
      const routeData = {
        id: 'route-1',
        from: {
          uri: 'timer:tick',
          steps: [
            { log: { message: 'Hello' } },
            {
              choice: {
                when: [{ simple: '${body}', steps: [{ to: { uri: 'direct:a' } }] }],
                otherwise: { steps: [{ to: { uri: 'direct:b' } }] },
              },
            },
          ],
        },
      };

      const tree = createCamelKowTree('route', routeData);
      const visitor = new NodeCounterVisitor();
      const counts = tree.accept(visitor);

      // Should have counted entities and EIPs
      expect(counts.get(CamelKowNodeType.Entity)).toBeGreaterThan(0);
    });

    /**
     * Example: Custom visitor that collects all URIs
     */
    class UriCollectorVisitor implements IKowNodeVisitor<CamelKowNodeType, string[]> {
      visit(node: IKowNode<unknown, CamelKowNodeType, unknown>): string[] {
        const uris: string[] = [];

        // Check if this node has a URI
        const data = node.data as Record<string, unknown>;
        if (typeof data?.uri === 'string') {
          uris.push(data.uri);
        }

        // Visit children
        for (const child of node.getChildren()) {
          uris.push(...child.accept(this));
        }

        return uris;
      }
    }

    it('should collect all URIs with a custom visitor', () => {
      const routeData = {
        id: 'route-1',
        from: {
          uri: 'timer:tick',
          steps: [{ to: { uri: 'log:info' } }, { to: { uri: 'direct:end' } }],
        },
      };

      const tree = createCamelKowTree('route', routeData);
      const visitor = new UriCollectorVisitor();
      const uris = tree.accept(visitor);

      expect(uris).toContain('timer:tick');
      expect(uris).toContain('log:info');
      expect(uris).toContain('direct:end');
    });

    /**
     * Example: Custom visitor that finds nodes by name
     */
    class NodeFinderVisitor implements IKowNodeVisitor<
      CamelKowNodeType,
      IKowNode<unknown, CamelKowNodeType, unknown>[]
    > {
      constructor(private targetName: string) {}

      visit(node: IKowNode<unknown, CamelKowNodeType, unknown>): IKowNode<unknown, CamelKowNodeType, unknown>[] {
        const matches: IKowNode<unknown, CamelKowNodeType, unknown>[] = [];

        if (node.name === this.targetName) {
          matches.push(node);
        }

        for (const child of node.getChildren()) {
          matches.push(...child.accept(this));
        }

        return matches;
      }
    }

    it('should find nodes by name with a custom visitor', () => {
      const routeData = {
        id: 'route-1',
        from: {
          uri: 'timer:tick',
          steps: [
            { log: { message: 'First log' } },
            { to: { uri: 'direct:middle' } },
            { log: { message: 'Second log' } },
          ],
        },
      };

      const tree = createCamelKowTree('route', routeData);
      const visitor = new NodeFinderVisitor('log');
      const logNodes = tree.accept(visitor);

      expect(logNodes.length).toBe(2);
      expect(logNodes.every((n) => n.name === 'log')).toBe(true);
    });
  });

  describe('SortingVisitor', () => {
    it('should sort route properties by catalog index', () => {
      // Properties in wrong order
      const unsortedRoute = {
        description: 'A test route',
        from: {
          steps: [],
          uri: 'timer:tick',
          id: 'from-1',
        },
        id: 'route-1',
      };

      const tree = createCamelKowTree('route', unsortedRoute);
      const sortingVisitor = new SortingVisitor();
      const sorted = tree.accept(sortingVisitor);

      // Verify properties are in correct order
      const keys = Object.keys(sorted);
      expect(keys.indexOf('id')).toBeLessThan(keys.indexOf('description'));
      expect(keys.indexOf('description')).toBeLessThan(keys.indexOf('from'));
    });

    it('should sort nested processor properties', () => {
      const unsortedRoute = {
        id: 'route-1',
        from: {
          steps: [
            {
              setBody: {
                simple: {
                  resultType: 'java.lang.String',
                  expression: '${body}',
                  id: 'simple-1',
                },
              },
            },
          ],
          uri: 'timer:tick',
          id: 'from-1',
        },
      };

      const tree = createCamelKowTree('route', unsortedRoute);
      const sortingVisitor = new SortingVisitor();
      const sorted = tree.accept(sortingVisitor);

      // Verify from properties are sorted
      const fromKeys = Object.keys(sorted.from as object);
      expect(fromKeys.indexOf('id')).toBeLessThan(fromKeys.indexOf('uri'));
      expect(fromKeys.indexOf('uri')).toBeLessThan(fromKeys.indexOf('steps'));
    });

    it('should preserve array order while sorting object properties', () => {
      const route = {
        id: 'route-1',
        from: {
          uri: 'timer:tick',
          steps: [{ log: { message: 'First' } }, { log: { message: 'Second' } }, { log: { message: 'Third' } }],
        },
      };

      const tree = createCamelKowTree('route', route);
      const sortingVisitor = new SortingVisitor();
      const sorted = tree.accept(sortingVisitor);

      // Steps array order should be preserved
      const steps = (sorted.from as { steps: Array<{ log: { message: string } }> }).steps;
      expect(steps[0].log.message).toBe('First');
      expect(steps[1].log.message).toBe('Second');
      expect(steps[2].log.message).toBe('Third');
    });
  });

  describe('Real-world Examples', () => {
    it('should handle a complex route with choice and expressions', () => {
      const yaml = `
        id: complex-route
        description: A complex route with multiple EIPs
        from:
          uri: timer:tick
          parameters:
            period: 1000
          steps:
            - setHeader:
                name: myHeader
                simple:
                  expression: "\${header.foo}"
            - choice:
                when:
                  - simple: "\${body} == 'test'"
                    steps:
                      - log:
                          message: Matched test
                  - simple: "\${body} == 'other'"
                    steps:
                      - log:
                          message: Matched other
                otherwise:
                  steps:
                    - log:
                        message: No match
            - to:
                uri: direct:end
      `;

      const routeData = parse(yaml);
      const tree = createCamelKowTree('route', routeData);

      // Tree should be created successfully
      expect(tree.name).toBe('route');
      expect(tree.type).toBe(CamelKowNodeType.Entity);

      // Should have children
      expect(tree.hasChildren()).toBe(true);

      // Sorting should work
      const sortingVisitor = new SortingVisitor();
      const sorted = tree.accept(sortingVisitor);
      expect(sorted).toBeDefined();
      expect(Object.keys(sorted).length).toBeGreaterThan(0);
    });

    it('should handle error handler configurations', () => {
      const errorHandlerData = {
        deadLetterChannel: {
          deadLetterUri: 'direct:deadLetter',
          deadLetterHandleNewException: true,
          redeliveryPolicy: {
            maximumRedeliveries: 3,
            redeliveryDelay: 1000,
          },
        },
      };

      const tree = createCamelKowTree('errorHandler', errorHandlerData);

      expect(tree.name).toBe('errorHandler');
      expect(tree.type).toBe(CamelKowNodeType.Entity);

      // Sorting should work
      const sortingVisitor = new SortingVisitor();
      const sorted = tree.accept(sortingVisitor);
      expect(sorted).toBeDefined();
    });
  });
});
