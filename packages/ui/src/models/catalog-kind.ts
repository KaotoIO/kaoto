/** Kaoto catalog kinds */
export const enum CatalogKind {
  /** Camel components catalog, f.i. amqp, log, timer */
  Component = 'component',

  /** Camel model catalog, f.i. route, from, eips, routeTemplate, languages, dataformats, loadbalancer */
  Processor = 'processor',

  /** Camel processors (EIPs) definitions, f.i. log, to, toD, transform, filter */
  Pattern = 'pattern',

  /** Camel entities catalog, f.i. from, route, routeTemplate */
  Entity = 'entity',

  /** Camel languages catalog, f.i. simple, groovy, kotlin */
  Language = 'language',

  /** Camel dataformats catalog, f.i. json, xml, csv */
  Dataformat = 'dataformat',

  /** Camel loadbalancer catalog, f.i. round-robin, failover, random */
  Loadbalancer = 'loadbalancer',

  /** Camel kamelets catalog, f.i. xj-template-action */
  Kamelet = 'kamelet',

  /** Functions catalog, f.i. simple/bodyAs, x-path/concatenate */
  Function = 'function',

  /** Citrus test action group catalog, f.i. http, soap, camel, kubernetes */
  TestActionGroup = 'testActionGroup',

  /** Citrus test action catalog, f.i. echo, delay, send, receive */
  TestAction = 'testAction',

  /** Citrus test action container catalog, f.i. iterate, conditional, sequential, parallel */
  TestContainer = 'testContainer',

  /** Citrus test endpoint catalog, f.i. direct, kafka, http */
  TestEndpoint = 'testEndpoint',

  /** Citrus test function catalog, f.i. randomNumber(), randomString(), currentDate() */
  TestFunction = 'testFunction',

  /** Citrus test validation matcher catalog, f.i. @isNumber()@, @isEmpty()@, @matches()@ */
  TestValidationMatcher = 'testValidationMatcher',
}
