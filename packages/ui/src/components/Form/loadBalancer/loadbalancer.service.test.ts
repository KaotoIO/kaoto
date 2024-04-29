import * as catalogIndex from '@kaoto/camel-catalog/index.json';
import { CatalogKind, ICamelLoadBalancerDefinition } from '../../../models';
import { CamelCatalogService } from '../../../models/visualization/flows';
import { LoadBalancerService } from './loadbalancer.service';

describe('LoadBalancerService', () => {
  beforeAll(async () => {
    const loadbalancerCatalog = await import('@kaoto/camel-catalog/' + catalogIndex.catalogs.loadbalancers.file);
    /* eslint-disable  @typescript-eslint/no-explicit-any */
    delete (loadbalancerCatalog as any).default;
    CamelCatalogService.setCatalogKey(
      CatalogKind.Loadbalancer,
      loadbalancerCatalog as unknown as Record<string, ICamelLoadBalancerDefinition>,
    );
  });

  describe('getLoadBalancerMap', () => {
    it('should return LoadBalancer map', () => {
      const loadBalancerMap = LoadBalancerService.getLoadBalancerMap();
      expect(loadBalancerMap.failover.model.title).toEqual('Failover');
      expect(loadBalancerMap.sticky.propertiesSchema.properties!.correlationExpression[`$comment`]).toEqual(
        'expression',
      );
      expect(loadBalancerMap.customLoadBalancer.model.description).toContain('custom load balancer');
      expect(loadBalancerMap.customLoadBalancer.propertiesSchema.properties!.ref.title).toEqual('Ref');
    });
  });

  describe('getLoadBalancerSchema', () => {
    it('should return LoadBalancer schema', () => {
      const loadBalancerMap = LoadBalancerService.getLoadBalancerMap();
      const jsonSchema = LoadBalancerService.getLoadBalancerSchema(loadBalancerMap.roundRobin);
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
        roundRobin: { id: 'myRoundRobin' },
      });
      expect(loadBalancer).toEqual(loadBalancerMap.roundRobin);
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
      LoadBalancerService.setLoadBalancerModel(loadBalancerMap, parentModel, 'failover', { roundRobin: true });
      expect(parentModel.failover.roundRobin).toEqual(true);
    });

    it('should write loadbalancer and remove existing', () => {
      /* eslint-disable  @typescript-eslint/no-explicit-any */
      const parentModel: any = { failover: { roundRobin: true } };
      LoadBalancerService.setLoadBalancerModel(loadBalancerMap, parentModel, 'roundRobin', {
        id: 'myRoundRobin',
      });
      expect(parentModel.failover).toBeUndefined();
      expect(parentModel.roundRobin.id).toEqual('myRoundRobin');
    });

    it('should not write if empty', () => {
      const parentModel: any = {};
      LoadBalancerService.setLoadBalancerModel(loadBalancerMap, parentModel, '', {});
      expect(Object.keys(parentModel).length).toBe(0);
    });
  });
});
