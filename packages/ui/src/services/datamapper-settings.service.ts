import {
  DEFAULT_DATAMAPPER_SETTINGS,
  DEFAULT_XSL_OUTPUT_SETTINGS,
  DocumentDefinitionType,
  IDataMapperSettings,
  IXslOutputSettings,
} from '../models/datamapper';
import { DataMapperOutputValidationService } from './datamapper-output-validation.service';

/** The keys of {@link IXslOutputSettings}, i.e. the settings that end up in the generated stylesheet. */
const XSL_OUTPUT_SETTING_KEYS = Object.keys(DEFAULT_XSL_OUTPUT_SETTINGS) as Array<keyof IXslOutputSettings>;

/**
 * Service that owns the relationship between {@link IDataMapperSettings} and the target body
 * document type.
 *
 * Not every setting is universally meaningful (e.g. `omitXmlDeclaration` only applies to an XML target,
 * `isOutputValidationEnabled` only to one `isValidationSupported` accepts), so the UI that offers a setting and
 * the provider that persists it have to agree on when it applies — otherwise a value the user can no longer see
 * stays in the generated stylesheet or the route. Expressing that rule once here keeps the two in step as
 * {@link IDataMapperSettings} grows.
 */
export class DataMapperSettingsService {
  /**
   * Whether `omitXmlDeclaration` is offered for the given target document type. A JSON Schema
   * target is emitted as text through `xml-to-json()`, so it has no XML declaration to omit; the
   * setting is restricted to a schema-backed XML target.
   */
  static isOmitXmlDeclarationSupported(targetDefinitionType: DocumentDefinitionType): boolean {
    return targetDefinitionType === DocumentDefinitionType.XML_SCHEMA;
  }

  /**
   * Resets every setting that does not apply to the given target document type back to its default.
   *
   * Returns the very same object when nothing has to be reset. That is part of the contract: callers
   * tell a real settings change from a plain re-render by reference identity, so handing back a
   * fresh object would trigger a spurious re-serialization of the mapping file.
   */
  static sanitizeForTarget(
    settings: IDataMapperSettings,
    targetDefinitionType: DocumentDefinitionType,
  ): IDataMapperSettings {
    const resetOmitXmlDeclaration =
      !DataMapperSettingsService.isOmitXmlDeclarationSupported(targetDefinitionType) && settings.omitXmlDeclaration;
    const resetOutputValidation =
      !DataMapperOutputValidationService.isValidationSupported(targetDefinitionType) &&
      settings.isOutputValidationEnabled;

    if (!resetOmitXmlDeclaration && !resetOutputValidation) {
      return settings;
    }

    return {
      ...settings,
      ...(resetOmitXmlDeclaration && { omitXmlDeclaration: DEFAULT_DATAMAPPER_SETTINGS.omitXmlDeclaration }),
      ...(resetOutputValidation && {
        isOutputValidationEnabled: DEFAULT_DATAMAPPER_SETTINGS.isOutputValidationEnabled,
      }),
    };
  }

  /**
   * Merges a (partial) settings patch into the settings.
   *
   * Returns the very same object when the patch does not change anything, with the same reference contract as
   * {@link sanitizeForTarget}.
   */
  static applyPatch(settings: IDataMapperSettings, patch: Partial<IDataMapperSettings>): IDataMapperSettings {
    const changed = (Object.keys(patch) as Array<keyof IDataMapperSettings>).some(
      (key) => patch[key] !== settings[key],
    );
    return changed ? { ...settings, ...patch } : settings;
  }

  /**
   * Whether a setting that is part of the generated XSLT stylesheet differs between the two settings.
   * Settings that only live in the Camel route (output variable, output validation) do not count, so changing them
   * does not require serializing the mapping file again.
   */
  static isXslOutputChanged(previous: IDataMapperSettings, next: IDataMapperSettings): boolean {
    return XSL_OUTPUT_SETTING_KEYS.some((key) => previous[key] !== next[key]);
  }
}
