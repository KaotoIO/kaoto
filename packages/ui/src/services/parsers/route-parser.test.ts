import {
  ErrorHandlerDeserializer,
  Intercept,
  InterceptFrom,
  InterceptSendToEndpoint,
  OnCompletion,
  OnException,
} from '@kaoto/camel-catalog/types';

import { CamelRouteVisualEntity } from '../../models';
import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { ParsedTable } from '../../models/documentation';
import { CamelErrorHandlerVisualEntity } from '../../models/visualization/flows/camel-error-handler-visual-entity';
import { CamelInterceptFromVisualEntity } from '../../models/visualization/flows/camel-intercept-from-visual-entity';
import { CamelInterceptSendToEndpointVisualEntity } from '../../models/visualization/flows/camel-intercept-send-to-endpoint-visual-entity';
import { CamelInterceptVisualEntity } from '../../models/visualization/flows/camel-intercept-visual-entity';
import { CamelOnCompletionVisualEntity } from '../../models/visualization/flows/camel-on-completion-visual-entity';
import { CamelOnExceptionVisualEntity } from '../../models/visualization/flows/camel-on-exception-visual-entity';
import { CamelRouteConfigurationVisualEntity } from '../../models/visualization/flows/camel-route-configuration-visual-entity';
import { camelRouteYaml, mockRandomValues } from '../../stubs';
import { routeConfigurationFullYaml } from '../../stubs/route-configuration-full';
import { RouteParser } from './route-parser';

describe('RouteParser', () => {
  let rcEntity: CamelRouteConfigurationVisualEntity;
  let routeEntity: CamelRouteVisualEntity;

  beforeAll(async () => {
    mockRandomValues();

    const resource = CamelResourceFactory.createCamelResource(camelRouteYaml);
    await resource.initialize();
    routeEntity = resource.getVisualEntities()[0] as CamelRouteVisualEntity;

    const rcResource = CamelResourceFactory.createCamelResource(routeConfigurationFullYaml);
    await rcResource.initialize();
    rcEntity = rcResource.getVisualEntities()[0] as CamelRouteConfigurationVisualEntity;
  });

  describe('parseRouteEntity()', () => {
    it('should parse route', () => {
      const parsed = RouteParser.parseRouteEntity(routeEntity);

      expect(parsed.title).toBe('route-8888');
      expect(parsed.description).toBeUndefined();
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(5);
      expect(parsed.headers[0]).toBe('Step ID');
      expect(parsed.headers[1]).toBe('Step');
      expect(parsed.headers[2]).toBe('URI');
      expect(parsed.headers[3]).toBe('Parameter Name');
      expect(parsed.headers[4]).toBe('Value');
      expect(parsed.data).toHaveLength(11);
      expect(parsed.data[0][0]).toBeUndefined();
      expect(parsed.data[0][1]).toBe('from');
      expect(parsed.data[0][2]).toBe('timer');
      expect(parsed.data[0][3]).toBe('timerName');
      expect(parsed.data[0][4]).toBe('tutorial');
    });
  });

  describe('parseRouteConfigurationEntity()', () => {
    it('should parse route configuration', () => {
      const parsed = RouteParser.parseRouteConfigurationEntity(rcEntity);

      expect(parsed).toHaveLength(7);

      expect(parsed[0].title).toBe('routeConfiguration-1956');
      expect(parsed[0].description).toBeUndefined();
      expect(parsed[0].headingLevel).toBe('h1');
      expect(parsed[0].headers).toHaveLength(2);
      expect(parsed[0].headers[0]).toBe('Parameter Name');
      expect(parsed[0].headers[1]).toBe('Parameter Value');
      expect(parsed[0].data).toHaveLength(0);

      expect(parsed[1].title).toBe('defaultErrorHandler');
      expect(parsed[1].headingLevel).toBe('h2');

      expect(parsed[2].title).toBe('Intercept');
      expect(parsed[2].headingLevel).toBe('h2');

      expect(parsed[3].title).toBe('Intercept From');
      expect(parsed[3].headingLevel).toBe('h2');

      expect(parsed[4].title).toBe('Intercept Send To Endpoint');
      expect(parsed[4].headingLevel).toBe('h2');

      expect(parsed[5].title).toBe('On Completion');
      expect(parsed[5].headingLevel).toBe('h2');

      expect(parsed[6].title).toBe('On Exception');
      expect(parsed[6].headingLevel).toBe('h2');
    });
  });

  describe('parseErrorHandlerEntity()', () => {
    it('should parse error handler', () => {
      const entity = new CamelErrorHandlerVisualEntity({
        errorHandler: rcEntity.entityDef.routeConfiguration.errorHandler as ErrorHandlerDeserializer,
      });
      const parsed = RouteParser.parseErrorHandlerEntity(entity) as ParsedTable;

      expect(parsed.title).toBe('errorHandler-1234');
      expect(parsed.description).toBe('');
      expect(parsed.headers).toHaveLength(2);
      expect(parsed.headers[0]).toBe('Parameter Name');
      expect(parsed.headers[1]).toBe('Parameter Value');
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0][0]).toBe('defaultErrorHandler.level');
      expect(parsed.data[0][1]).toBe('ERROR');
    });
  });

  describe('parseInterceptEntity()', () => {
    it('should parse intercept', () => {
      const entity = new CamelInterceptVisualEntity({
        intercept: rcEntity.entityDef.routeConfiguration.intercept as Intercept,
      });
      const parsed = RouteParser.parseInterceptEntity(entity) as ParsedTable;

      expect(parsed.title).toBe('Intercept');
      expect(parsed.description).toBe('');
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(6);
      expect(parsed.headers[0]).toBe('ID');
      expect(parsed.headers[1]).toBe('Step ID');
      expect(parsed.headers[2]).toBe('Step');
      expect(parsed.headers[3]).toBe('URI');
      expect(parsed.headers[4]).toBe('Parameter Name');
      expect(parsed.headers[5]).toBe('Value');
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0][0]).toBe('intercept-2829');
      expect(parsed.data[0][1]).toBe('to-4106');
      expect(parsed.data[0][2]).toBe('to');
      expect(parsed.data[0][3]).toBe('activemq');
      expect(parsed.data[0][4]).toBe('description');
      expect(parsed.data[0][5]).toBe('some desc intercept activemq');
    });
  });

  describe('parseInterceptFromEntity()', () => {
    it('should parse interceptFrom', () => {
      const entity = new CamelInterceptFromVisualEntity({
        interceptFrom: rcEntity.entityDef.routeConfiguration.interceptFrom as InterceptFrom,
      });
      const parsed = RouteParser.parseInterceptFromEntity(entity) as ParsedTable;

      expect(parsed.title).toBe('interceptFrom-1234');
      expect(parsed.description).toBe('');
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(6);
      expect(parsed.headers[0]).toBe('ID');
      expect(parsed.headers[1]).toBe('Step ID');
      expect(parsed.headers[2]).toBe('Step');
      expect(parsed.headers[3]).toBe('URI');
      expect(parsed.headers[4]).toBe('Parameter Name');
      expect(parsed.headers[5]).toBe('Value');
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0][0]).toBe('interceptFrom-3077');
      expect(parsed.data[0][1]).toBe('to-4830');
      expect(parsed.data[0][2]).toBe('to');
      expect(parsed.data[0][3]).toBe('activemq6');
      expect(parsed.data[0][4]).toBe('');
      expect(parsed.data[0][5]).toBe('');
    });
  });

  describe('parseInterceptSendToEndpointEntity()', () => {
    it('should parse interceptSendToEndpoint', () => {
      const entity = new CamelInterceptSendToEndpointVisualEntity({
        interceptSendToEndpoint: rcEntity.entityDef.routeConfiguration
          .interceptSendToEndpoint as InterceptSendToEndpoint,
      });
      const parsed = RouteParser.parseInterceptSendToEndpointEntity(entity) as ParsedTable;

      expect(parsed.title).toBe('Intercept Send To Endpoint');
      expect(parsed.description).toBe('');
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(6);
      expect(parsed.headers[0]).toBe('ID');
      expect(parsed.headers[1]).toBe('Step ID');
      expect(parsed.headers[2]).toBe('Step');
      expect(parsed.headers[3]).toBe('URI');
      expect(parsed.headers[4]).toBe('Parameter Name');
      expect(parsed.headers[5]).toBe('Value');
      expect(parsed.data).toHaveLength(2);
      expect(parsed.data[0][0]).toBe('interceptSendToEndpoint-1407');
      expect(parsed.data[0][1]).toBe('');
      expect(parsed.data[0][2]).toBe('');
      expect(parsed.data[0][3]).toBe('');
      expect(parsed.data[0][4]).toBe('uri');
      expect(parsed.data[0][5]).toBe('direct:dummy');
    });
  });

  describe('parseOnCompletionEntity()', () => {
    it('should parse onCompletion', () => {
      const entity = new CamelOnCompletionVisualEntity({
        onCompletion: rcEntity.entityDef.routeConfiguration.onCompletion as OnCompletion,
      });
      const parsed = RouteParser.parseOnCompletionEntity(entity) as ParsedTable;

      expect(parsed.title).toBe('onCompletion-1234');
      expect(parsed.description).toBe('');
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(6);
      expect(parsed.headers[0]).toBe('ID');
      expect(parsed.headers[1]).toBe('Step ID');
      expect(parsed.headers[2]).toBe('Step');
      expect(parsed.headers[3]).toBe('URI');
      expect(parsed.headers[4]).toBe('Parameter Name');
      expect(parsed.headers[5]).toBe('Value');
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0][0]).toBe('onCompletion-3828');
      expect(parsed.data[0][1]).toBe('to-2313');
      expect(parsed.data[0][2]).toBe('to');
      expect(parsed.data[0][3]).toBe('asterisk');
      expect(parsed.data[0][4]).toBe('');
      expect(parsed.data[0][5]).toBe('');
    });
  });

  describe('parseOnExceptionEntity()', () => {
    it('should parse onException', () => {
      const entity = new CamelOnExceptionVisualEntity({
        onException: rcEntity.entityDef.routeConfiguration.onException as OnException,
      });
      const parsed = RouteParser.parseOnExceptionEntity(entity) as ParsedTable;

      expect(parsed.title).toBe('onException-1234');
      expect(parsed.description).toBe('');
      expect(parsed.headingLevel).toBe('h1');
      expect(parsed.headers).toHaveLength(6);
      expect(parsed.headers[0]).toBe('ID');
      expect(parsed.headers[1]).toBe('Step ID');
      expect(parsed.headers[2]).toBe('Step');
      expect(parsed.headers[3]).toBe('URI');
      expect(parsed.headers[4]).toBe('Parameter Name');
      expect(parsed.headers[5]).toBe('Value');
      expect(parsed.data).toHaveLength(1);
      expect(parsed.data[0][0]).toBe('onException-2301');
      expect(parsed.data[0][1]).toBe('to-3485');
      expect(parsed.data[0][2]).toBe('to');
      expect(parsed.data[0][3]).toBe('arangodb');
      expect(parsed.data[0][4]).toBe('');
      expect(parsed.data[0][5]).toBe('');
    });
  });
});
