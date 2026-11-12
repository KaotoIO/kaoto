/**
 * DataMapper settings model — XSLT output settings and Camel step-level settings.
 */

/**
 * Settings that control the XSLT `<xsl:output>` declaration emitted by the DataMapper.
 */
export interface IXslOutputSettings {
  omitXmlDeclaration: boolean;
}

/**
 * Camel-route-level settings for the DataMapper step group (not XSLT output).
 * These are persisted as sibling EIP steps inside the DataMapper group rather than
 * inside the XSLT stylesheet itself.
 */
export interface IStepSettings {
  /** Name of the Camel variable to store the XSLT output in, or undefined if not used. */
  outputVariable: string | undefined;
  /** Whether output validation is enabled for this step. */
  isOutputValidationEnabled: boolean;
}

/**
 * What applying {@link IStepSettings} to the Camel step reports back to the host.
 */
export interface IStepSettingsResult {
  /** What the step really holds after the call; the provider applies it to its settings state. */
  settings: Partial<IStepSettings>;
  /** Problems the user should see (e.g. validating against part of the schema files only). */
  warnings: string[];
  /** Set when a setting could not be applied: the full user-facing sentence. */
  error?: string;
}

/**
 * Full DataMapper settings: XSLT output settings combined with Camel step-level settings.
 */
export type IDataMapperSettings = IXslOutputSettings & IStepSettings;

export const DEFAULT_XSL_OUTPUT_SETTINGS: IXslOutputSettings = {
  omitXmlDeclaration: false,
};

export const DEFAULT_STEP_SETTINGS: IStepSettings = {
  outputVariable: undefined,
  isOutputValidationEnabled: false,
};

export const DEFAULT_DATAMAPPER_SETTINGS: IDataMapperSettings = {
  ...DEFAULT_XSL_OUTPUT_SETTINGS,
  ...DEFAULT_STEP_SETTINGS,
};
