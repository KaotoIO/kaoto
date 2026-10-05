/** Kaoto catalog kinds */
export enum CatalogKind {
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

export enum FileTypes {
  Kamelets = 'kamelets',
}

export interface FileTypesResponse {
  filename: string;
  content: string;
}

export enum StepUpdateAction {
  Add = 'add',
  Replace = 'replace',
  Remove = 'remove',
}

export type Suggestion = {
  value: string;
  description?: string;
  group?: string;
};

export type SuggestionRequestContext = {
  propertyName: string;
  inputValue: string | number;
  cursorPosition?: number | null;
};

export enum NodeLabelType {
  Id = 'id',
  Description = 'description',
}

export enum NodeToolbarTrigger {
  onHover = 'onHover',
  onSelection = 'onSelection',
}

export enum ColorScheme {
  Auto = 'auto',
  Light = 'light',
  Dark = 'dark',
}

export enum CanvasLayoutDirection {
  SelectInCanvas = 'SelectInCanvas',
  Horizontal = 'Horizontal',
  Vertical = 'Vertical',
}

export interface ISettingsModel {
  catalogUrl: string;
  runtimeCatalogName: string;
  testingCatalogName: string;
  nodeLabel: NodeLabelType;
  nodeToolbarTrigger: NodeToolbarTrigger;
  colorScheme: ColorScheme;
  rest: {
    apicurioRegistryUrl: string;
    customMediaTypes: string[];
  };
  canvasLayoutDirection: CanvasLayoutDirection;
}

export interface CamelMainMavenInformation {
  runtime: string;
  camelVersion: string;
}

export interface CamelSpringBootMavenInformation extends CamelMainMavenInformation {
  /* Spring Boot specific*/
  camelSpringBootBomArtifactId?: string;
  camelSpringBootBomGroupId?: string;
  camelSpringBootVersion?: string;
  springBootVersion?: string;
}

export interface CamelQuarkusMavenInformation extends CamelMainMavenInformation {
  /* Quarkus specific*/
  camelQuarkusVersion?: string;
  quarkusVersion?: string;
  quarkusBomGroupId?: string;
  quarkusBomArtifactId?: string;
  camelQuarkusBomGroupId?: string;
  camelQuarkusBomArtifactId?: string;
}

export type RuntimeMavenInformation =
  | CamelMainMavenInformation
  | CamelSpringBootMavenInformation
  | CamelQuarkusMavenInformation;
