/**
 * CamelKowNodeType - Node types for Camel domain
 */
export enum CamelKowNodeType {
  /** Top-level Camel entities: route, from, intercept, etc. */
  Entity = 'entity',

  /** Enterprise Integration Patterns: choice, filter, to, etc. */
  Eip = 'eip',

  /** Camel components: timer, file, kafka (from URI) */
  Component = 'component',

  /** Expression languages: simple, constant, jq, xpath */
  Language = 'language',

  /** Data formats: json, xml, csv */
  Dataformat = 'dataformat',

  /** Load balancers: roundRobin, failover */
  Loadbalancer = 'loadbalancer',
}
