import { CamelRouteVisualEntity } from '../../../models';
import { CamelErrorHandlerVisualEntity } from '../../../models/visualization/flows/camel-error-handler-visual-entity';
import { CamelInterceptFromVisualEntity } from '../../../models/visualization/flows/camel-intercept-from-visual-entity';
import { CamelInterceptSendToEndpointVisualEntity } from '../../../models/visualization/flows/camel-intercept-send-to-endpoint-visual-entity';
import { CamelInterceptVisualEntity } from '../../../models/visualization/flows/camel-intercept-visual-entity';
import { CamelOnCompletionVisualEntity } from '../../../models/visualization/flows/camel-on-completion-visual-entity';
import { CamelOnExceptionVisualEntity } from '../../../models/visualization/flows/camel-on-exception-visual-entity';
import { CamelRestConfigurationVisualEntity } from '../../../models/visualization/flows/camel-rest-configuration-visual-entity';
import { CamelRestVisualEntity } from '../../../models/visualization/flows/camel-rest-visual-entity';
import { CamelRouteConfigurationVisualEntity } from '../../../models/visualization/flows/camel-route-configuration-visual-entity';
import { BeansEntity } from '../../../models/visualization/metadata';

export type EntityDefinition =
  | CamelRouteVisualEntity
  | CamelErrorHandlerVisualEntity
  | CamelRestVisualEntity
  | BeansEntity
  | CamelInterceptFromVisualEntity
  | CamelInterceptSendToEndpointVisualEntity
  | CamelInterceptVisualEntity
  | CamelRouteConfigurationVisualEntity
  | CamelOnCompletionVisualEntity
  | CamelOnExceptionVisualEntity
  | CamelRestConfigurationVisualEntity;
