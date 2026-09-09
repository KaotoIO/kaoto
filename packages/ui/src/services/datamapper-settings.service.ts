import { DEFAULT_DATAMAPPER_SETTINGS, DocumentDefinitionType, IDataMapperSettings } from '../models/datamapper';

/**
 * Service that owns the relationship between {@link IDataMapperSettings} and the target body
 * document type.
 *
 * XSLT output settings are not universally meaningful, so the UI that offers a setting and the
 * provider that persists it have to agree on when it applies — otherwise a value the user can no
 * longer see stays in the generated stylesheet. Expressing that rule once here keeps the two in
 * step as {@link IDataMapperSettings} grows.
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
    if (DataMapperSettingsService.isOmitXmlDeclarationSupported(targetDefinitionType) || !settings.omitXmlDeclaration) {
      return settings;
    }

    return { ...settings, omitXmlDeclaration: DEFAULT_DATAMAPPER_SETTINGS.omitXmlDeclaration };
  }
}
