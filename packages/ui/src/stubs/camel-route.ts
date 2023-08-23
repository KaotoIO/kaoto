import { CamelRoute, Step } from '../camel-entities';

/**
 * This is a stub for a CamelRoute object.
 * It is used to test the Canvas component.
 * This stub is based on the following Camel YAML Route:
 *
 * - route:
 *     id: route-1525
 *     from:
 *       uri: 'timer:'
 *       steps:
 *       - choice:
 *           when:
 *           - steps:
 *             - log: {}
 *           otherwise:
 *             steps:
 *             - log: {}
 *       - log: {}
 */
const timerStep = new Step({ id: 'timer', name: 'timer' });

const choiceStep = new Step({ id: 'choice', name: 'choice' });
const whenStep = new Step({ id: 'when', name: 'when' });
const whenLogStep = new Step({ id: 'whenLog', name: 'whenLog' });
const otherwiseStep = new Step({ id: 'otherwise', name: 'otherwise' });
const otherwiseLogStep = new Step({ id: 'otherwiseLog', name: 'otherwiseLog' });

const logStep = new Step({ id: 'log', name: 'log' });

timerStep._getSteps().push(choiceStep, logStep);

choiceStep._getSteps().push(whenStep, otherwiseStep);
whenStep._getSteps().push(whenLogStep);
otherwiseStep._getSteps().push(otherwiseLogStep);

const camelRoute = new CamelRoute();
camelRoute._getSteps().push(timerStep);

export { camelRoute };
