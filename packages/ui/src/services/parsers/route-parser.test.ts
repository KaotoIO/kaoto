import { CamelResourceFactory } from '../../models/camel/camel-resource-factory';
import { camelRouteYaml } from '../../stubs';
import { RouteParser } from './route-parser';
import { CamelRouteVisualEntity } from '../../models';
import { routeConfigurationFullYaml } from '../../stubs/route-configuration-full';
import { CamelRouteConfigurationVisualEntity } from '../../models/visualization/flows/camel-route-configuration-visual-entity';
import { CamelErrorHandlerVisualEntity } from '../../models/visualization/flows/camel-error-handler-visual-entity';
import {
  ErrorHandlerDeserializer,
  Intercept,
  InterceptFrom,
  InterceptSendToEndpoint,
  OnCompletion,
  OnException,
} from '@kaoto/camel-catalog/types';
import { CamelInterceptVisualEntity } from '../../models/visualization/flows/camel-intercept-visual-entity';
import { CamelInterceptFromVisualEntity } from '../../models/visualization/flows/camel-intercept-from-visual-entity';
import { CamelInterceptSendToEndpointVisualEntity } from '../../models/visualization/flows/camel-intercept-send-to-endpoint-visual-entity';
import { CamelOnCompletionVisualEntity } from '../../models/visualization/flows/camel-on-completion-visual-entity';
import { CamelOnExceptionVisualEntity } from '../../models/visualization/flows/camel-on-exception-visual-entity';
import { ParsedTable } from '../../models/documentation';

describe('RouteParser', () => {
  describe('parseRouteEntity()', () => {
    it('should parse route', () => {
      const routeEntity = CamelResourceFactory.createCamelResource(
        camelRouteYaml,
      ).getVisualEntities()[0] as CamelRouteVisualEntity;
      const parsed = RouteParser.parseRouteEntity(routeEntity);

      expect(parsed.title).toEqual('route-8888');
      expect(parsed.description).toBeUndefined();
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(5);
      expect(parsed.headers[0]).toEqual('Step ID');
      expect(parsed.headers[1]).toEqual('Step');
      expect(parsed.headers[2]).toEqual('URI');
      expect(parsed.headers[3]).toEqual('Parameter Name');
      expect(parsed.headers[4]).toEqual('Value');
      expect(parsed.data.length).toEqual(11);
      expect(parsed.data[0][0]).toBeUndefined();
      expect(parsed.data[0][1]).toEqual('from');
      expect(parsed.data[0][2]).toEqual('timer');
      expect(parsed.data[0][3]).toEqual('timerName');
      expect(parsed.data[0][4]).toEqual('tutorial');
    });
  });

  const rcEntity = CamelResourceFactory.createCamelResource(
    routeConfigurationFullYaml,
  ).getVisualEntities()[0] as CamelRouteConfigurationVisualEntity;

  describe('parseRouteConfigurationEntity()', () => {
    it('should parse route configuration', () => {
      const parsed = RouteParser.parseRouteConfigurationEntity(rcEntity);

      expect(parsed.length).toEqual(7);

      expect(parsed[0].title).toEqual('routeConfiguration-1956');
      expect(parsed[0].description).toBeUndefined();
      expect(parsed[0].headingLevel).toEqual('h1');
      expect(parsed[0].headers.length).toEqual(2);
      expect(parsed[0].headers[0]).toEqual('Parameter Name');
      expect(parsed[0].headers[1]).toEqual('Parameter Value');
      expect(parsed[0].data.length).toEqual(0);

      expect(parsed[1].title).toEqual('defaultErrorHandler');
      expect(parsed[1].headingLevel).toEqual('h2');

      expect(parsed[2].title).toEqual('Intercept');
      expect(parsed[2].headingLevel).toEqual('h2');

      expect(parsed[3].title).toEqual('Intercept From');
      expect(parsed[3].headingLevel).toEqual('h2');

      expect(parsed[4].title).toEqual('Intercept Send To Endpoint');
      expect(parsed[4].headingLevel).toEqual('h2');

      expect(parsed[5].title).toEqual('On Completion');
      expect(parsed[5].headingLevel).toEqual('h2');

      expect(parsed[6].title).toEqual('On Exception');
      expect(parsed[6].headingLevel).toEqual('h2');
    });
  });

  describe('parseErrorHandlerEntity()', () => {
    it('should parse error handler', () => {
      const entity = new CamelErrorHandlerVisualEntity({
        errorHandler: rcEntity.entityDef.routeConfiguration.errorHandler as ErrorHandlerDeserializer,
      });
      const parsed = RouteParser.parseErrorHandlerEntity(entity) as ParsedTable;

      expect(parsed.title).toEqual('errorHandler-1234');
      expect(parsed.description).toEqual('');
      expect(parsed.headers.length).toEqual(2);
      expect(parsed.headers[0]).toEqual('Parameter Name');
      expect(parsed.headers[1]).toEqual('Parameter Value');
      expect(parsed.data.length).toEqual(1);
      expect(parsed.data[0][0]).toEqual('defaultErrorHandler.level');
      expect(parsed.data[0][1]).toEqual('ERROR');
    });
  });

  describe('parseInterceptEntity()', () => {
    it('should parse intercept', () => {
      const entity = new CamelInterceptVisualEntity({
        intercept: rcEntity.entityDef.routeConfiguration.intercept as Intercept,
      });
      const parsed = RouteParser.parseInterceptEntity(entity) as ParsedTable;

      expect(parsed.title).toEqual('Intercept');
      expect(parsed.description).toEqual('');
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(6);
      expect(parsed.headers[0]).toEqual('ID');
      expect(parsed.headers[1]).toEqual('Step ID');
      expect(parsed.headers[2]).toEqual('Step');
      expect(parsed.headers[3]).toEqual('URI');
      expect(parsed.headers[4]).toEqual('Parameter Name');
      expect(parsed.headers[5]).toEqual('Value');
      expect(parsed.data.length).toEqual(1);
      expect(parsed.data[0][0]).toEqual('intercept-2829');
      expect(parsed.data[0][1]).toEqual('to-4106');
      expect(parsed.data[0][2]).toEqual('to');
      expect(parsed.data[0][3]).toEqual('activemq');
      expect(parsed.data[0][4]).toEqual('description');
      expect(parsed.data[0][5]).toEqual('some desc intercept activemq');
    });
  });

  describe('parseInterceptFromEntity()', () => {
    it('should parse interceptFrom', () => {
      const entity = new CamelInterceptFromVisualEntity({
        interceptFrom: rcEntity.entityDef.routeConfiguration.interceptFrom as InterceptFrom,
      });
      const parsed = RouteParser.parseInterceptFromEntity(entity) as ParsedTable;

      expect(parsed.title).toEqual('interceptFrom-1234');
      expect(parsed.description).toEqual('');
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(6);
      expect(parsed.headers[0]).toEqual('ID');
      expect(parsed.headers[1]).toEqual('Step ID');
      expect(parsed.headers[2]).toEqual('Step');
      expect(parsed.headers[3]).toEqual('URI');
      expect(parsed.headers[4]).toEqual('Parameter Name');
      expect(parsed.headers[5]).toEqual('Value');
      expect(parsed.data.length).toEqual(1);
      expect(parsed.data[0][0]).toEqual('interceptFrom-3077');
      expect(parsed.data[0][1]).toEqual('to-4830');
      expect(parsed.data[0][2]).toEqual('to');
      expect(parsed.data[0][3]).toEqual('activemq6');
      expect(parsed.data[0][4]).toEqual('');
      expect(parsed.data[0][5]).toEqual('');
    });
  });

  describe('parseInterceptSendToEndpointEntity()', () => {
    it('should parse interceptSendToEndpoint', () => {
      const entity = new CamelInterceptSendToEndpointVisualEntity({
        interceptSendToEndpoint: rcEntity.entityDef.routeConfiguration
          .interceptSendToEndpoint as InterceptSendToEndpoint,
      });
      const parsed = RouteParser.parseInterceptSendToEndpointEntity(entity) as ParsedTable;

      expect(parsed.title).toEqual('Intercept Send To Endpoint');
      expect(parsed.description).toEqual('');
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(6);
      expect(parsed.headers[0]).toEqual('ID');
      expect(parsed.headers[1]).toEqual('Step ID');
      expect(parsed.headers[2]).toEqual('Step');
      expect(parsed.headers[3]).toEqual('URI');
      expect(parsed.headers[4]).toEqual('Parameter Name');
      expect(parsed.headers[5]).toEqual('Value');
      expect(parsed.data.length).toEqual(2);
      expect(parsed.data[0][0]).toEqual('interceptSendToEndpoint-1407');
      expect(parsed.data[0][1]).toEqual('');
      expect(parsed.data[0][2]).toEqual('');
      expect(parsed.data[0][3]).toEqual('');
      expect(parsed.data[0][4]).toEqual('uri');
      expect(parsed.data[0][5]).toEqual('direct:dummy');
    });
  });

  describe('parseOnCompletionEntity()', () => {
    it('should parse onCompletion', () => {
      const entity = new CamelOnCompletionVisualEntity({
        onCompletion: rcEntity.entityDef.routeConfiguration.onCompletion as OnCompletion,
      });
      const parsed = RouteParser.parseOnCompletionEntity(entity) as ParsedTable;

      expect(parsed.title).toEqual('onCompletion-1234');
      expect(parsed.description).toEqual('');
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(6);
      expect(parsed.headers[0]).toEqual('ID');
      expect(parsed.headers[1]).toEqual('Step ID');
      expect(parsed.headers[2]).toEqual('Step');
      expect(parsed.headers[3]).toEqual('URI');
      expect(parsed.headers[4]).toEqual('Parameter Name');
      expect(parsed.headers[5]).toEqual('Value');
      expect(parsed.data.length).toEqual(1);
      expect(parsed.data[0][0]).toEqual('onCompletion-3828');
      expect(parsed.data[0][1]).toEqual('to-2313');
      expect(parsed.data[0][2]).toEqual('to');
      expect(parsed.data[0][3]).toEqual('asterisk');
      expect(parsed.data[0][4]).toEqual('');
      expect(parsed.data[0][5]).toEqual('');
    });
  });

  describe('parseOnExceptionEntity()', () => {
    it('should parse onException', () => {
      const entity = new CamelOnExceptionVisualEntity({
        onException: rcEntity.entityDef.routeConfiguration.onException as OnException,
      });
      const parsed = RouteParser.parseOnExceptionEntity(entity) as ParsedTable;

      expect(parsed.title).toEqual('onException-1234');
      expect(parsed.description).toEqual('');
      expect(parsed.headingLevel).toEqual('h1');
      expect(parsed.headers.length).toEqual(6);
      expect(parsed.headers[0]).toEqual('ID');
      expect(parsed.headers[1]).toEqual('Step ID');
      expect(parsed.headers[2]).toEqual('Step');
      expect(parsed.headers[3]).toEqual('URI');
      expect(parsed.headers[4]).toEqual('Parameter Name');
      expect(parsed.headers[5]).toEqual('Value');
      expect(parsed.data.length).toEqual(1);
      expect(parsed.data[0][0]).toEqual('onException-2301');
      expect(parsed.data[0][1]).toEqual('to-3485');
      expect(parsed.data[0][2]).toEqual('to');
      expect(parsed.data[0][3]).toEqual('arangodb');
      expect(parsed.data[0][4]).toEqual('');
      expect(parsed.data[0][5]).toEqual('');
    });
  });
});
