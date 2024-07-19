import catalogLibrary from '@kaoto/camel-catalog/index.json';
import { CatalogLibrary } from '@kaoto/camel-catalog/types';
import { CatalogKind, ICamelLoadBalancerDefinition } from '../../../models';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { getFirstCatalogMap } from '../../../stubs/test-load-catalog';
import { LoadBalancerService } from './loadbalancer.service';

describe('LoadBalancerService', () => {
  beforeAll(async () => {
    const catalogsMap = await getFirstCatalogMap(catalogLibrary as CatalogLibrary);
    const loadbalancerCatalog = catalogsMap.loadbalancerCatalog;
    CamelCatalogService.setCatalogKey(CatalogKind.Loadbalancer, loadbalancerCatalog);
  });

  describe('getLoadBalancerMap', () => {
    it('should return LoadBalancer map', () => {
      const loadBalancerMap = LoadBalancerService.getLoadBalancerMap();
      expect(loadBalancerMap.failoverLoadBalancer.model.title).toEqual('Failover Load Balancer');
      expect(loadBalancerMap.stickyLoadBalancer.propertiesSchema.properties!.correlationExpression[`$comment`]).toEqual(
        'expression',
      );
      expect(loadBalancerMap.customLoadBalancer.model.description).toContain('custom load balancer');
      expect(loadBalancerMap.customLoadBalancer.propertiesSchema.properties!.ref.title).toEqual('Ref');
    });
  });

  describe('getLoadBalancerSchema', () => {
    it('should return LoadBalancer schema', () => {
      const loadBalancerMap = LoadBalancerService.getLoadBalancerMap();
      const jsonSchema = LoadBalancerService.getLoadBalancerSchema(loadBalancerMap.roundRobinLoadBalancer);
      expect(jsonSchema!.properties!.id.type).toBe('string');
      const customSchema = LoadBalancerService.getLoadBalancerSchema(loadBalancerMap.customLoadBalancer);
      expect(customSchema!.properties!.ref.type).toBe('string');
    });
  });

  describe('parseLoadBalancerModel', () => {
    let loadBalancerMap: Record<string, ICamelLoadBalancerDefinition>;
    beforeAll(() => {
      loadBalancerMap = LoadBalancerService.getLoadBalancerMap();
    });

    it('should parse #1', () => {
      const { loadBalancer: loadBalancer, model } = LoadBalancerService.parseLoadBalancerModel(loadBalancerMap, {
        roundRobinLoadBalancer: { id: 'myRoundRobin' },
      });
      expect(loadBalancer).toEqual(loadBalancerMap.roundRobinLoadBalancer);
      expect(model).toEqual({ id: 'myRoundRobin' });
    });

    it('should return undefined if model is empty', () => {
      const { loadBalancer, model } = LoadBalancerService.parseLoadBalancerModel(loadBalancerMap, {});
      expect(loadBalancer).toBeUndefined();
      expect(model).toBeUndefined();
    });

    it('should return undefined if language map and model is empty', () => {
      const { loadBalancer, model } = LoadBalancerService.parseLoadBalancerModel({}, {});
      expect(loadBalancer).toBeUndefined();
      expect(model).toBeUndefined();
    });
  });

  describe('setLoadBalancerModel', () => {
    let loadBalancerMap: Record<string, ICamelLoadBalancerDefinition>;
    beforeAll(() => {
      loadBalancerMap = LoadBalancerService.getLoadBalancerMap();
    });

    it('should write loadbalancer', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const parentModel: any = {};
      LoadBalancerService.setLoadBalancerModel(loadBalancerMap, parentModel, 'failoverLoadBalancer', {
        roundRobin: true,
      });
      expect(parentModel.failoverLoadBalancer.roundRobin).toEqual(true);
    });

    it('should write loadbalancer and remove existing', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const parentModel: any = { failoverLoadBalancer: { roundRobin: true } };
      LoadBalancerService.setLoadBalancerModel(loadBalancerMap, parentModel, 'roundRobinLoadBalancer', {
        id: 'myRoundRobin',
      });
      expect(parentModel.failoverLoadBalancer).toBeUndefined();
      expect(parentModel.roundRobinLoadBalancer.id).toEqual('myRoundRobin');
    });

    it('should not write if empty', () => {
      const parentModel: any = {};
      LoadBalancerService.setLoadBalancerModel(loadBalancerMap, parentModel, '', {});
      expect(Object.keys(parentModel).length).toBe(0);
    });
  });
});
