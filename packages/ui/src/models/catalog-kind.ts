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

  /** Camel loadbalancer catalog, f.i. round robin, failover, random */
  Loadbalancer = 'loadbalancer',

  /** Camel kamelets catalog, f.i. xj-template-action */
  Kamelet = 'kamelet',
}
