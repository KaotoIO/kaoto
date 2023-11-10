import { CamelCatalogService } from '../../../models/visualization/flows';
import { CatalogKind, ICamelLanguageDefinition, ICamelLanguageModel, ICamelLanguageProperty } from '../../../models';
import { CamelComponentSchemaService } from '../../../models/visualization/flows/support/camel-component-schema.service';

export class ExpressionService {
  /**
   * Get the language catalog map from the Camel catalog. Since "language" language is not in the languages Camel
   *  catalog, it is extracted from the YAML DSL schema.
   * @param yamlDslSchema The whole YAML DSL schema. This is used to create the "language" custom language.
   */
  static getLanguageMap(yamlDslSchema: Record<string, unknown>): Record<string, ICamelLanguageDefinition> {
    const catalog = { ...CamelCatalogService.getLanguageMap() };

    // "language" for custom language is not in the Camel catalog. Create from YAML DSL schema and Add here.
    const customDefinition = ExpressionService.createCustomLanguageDefinition(yamlDslSchema);
    if (customDefinition) {
      catalog['language'] = customDefinition;
    }

    // "file" language is merged with "simple" language and it doesn't exist in YAML DSL schema. Remove it here.
    delete catalog['file'];

    return catalog;
  }

  private static createCustomLanguageDefinition(yamlDslSchema: Record<string, unknown>) {
    const definitions = (yamlDslSchema.items as Record<string, unknown>)?.definitions as Record<string, unknown>;
    const customLanguageSchema =
      definitions && (definitions['org.apache.camel.model.language.LanguageExpression'] as Record<string, unknown>);
    if (!customLanguageSchema) return;

    const properties = Object.entries(customLanguageSchema.properties as Record<string, unknown>).reduce(
      (acc, [key, value]) => {
        acc[key] = {
          index: Object.keys(acc).length,
          required: (customLanguageSchema.required as string[]).includes(key),
          ...(value as Record<string, unknown>),
        } as ICamelLanguageProperty;
        return acc;
      },
      {} as Record<string, ICamelLanguageProperty>,
    );
    return {
      language: {
        kind: CatalogKind.Language,
        name: 'language',
        title: customLanguageSchema.title,
        description: customLanguageSchema.description,
        deprecated: false,
        modelName: 'language',
      } as ICamelLanguageModel,
      properties: properties,
    } as ICamelLanguageDefinition;
  }

  /**
   * Get the language schema from the language catalog. ATM it delegates to {@link CamelComponentSchemaService.getSchemaFromCamelCommonProperties}.
   * @TODO The language `xtokenize` has `namespace` property with the type `array`, which causes an error in uniforms. Fix the schema here, or in {@link CamelComponentSchemaService.getSchemaFromCamelCommonProperties} if it could be common.
   * @param languageCatalog The {@link ICamelLanguageDefinition} object represents the language to get the schema.
   */
  static getLanguageSchema(languageCatalog: ICamelLanguageDefinition) {
    return CamelComponentSchemaService.getSchemaFromCamelCommonProperties(languageCatalog.properties);
  }

  /**
   * Parse the expression model from the parent step model object. Since expression has several dialects,
   * this method tries to read all possibility and merge into a single representation. Camel expression has
   * following 4 dialects, where the 2nd and 4th doesn't allow to configure additional properties:
   * <ul>
   *   <li>---
   * ```yaml
   * - setBody:
   *     expression:
   *       simple:
   *         expression: ${body}
   *         trim: true
   * ```
   * </li>
   * <li>---
   * ```yaml
   * - setBody:
   *     expression:
   *       simple: ${body}
   * ```
   * </li>
   * <li>---
   * ```yaml
   * - setBody:
   *     simple:
   *       expression: ${body}
   *       trim: true
   * ```
   * </li>
   * <li>---
   * ```yaml
   * - setBody:
   *     simple: ${body}
   * ```
   * </li>
   * </ul>
   * @param languageCatalogMap The language catalog map to use as a dictionary.
   * @param parentModel The parent step model object which has expression as its parameter. For example `setBody` contents.
   * */
  static parseExpressionModel(
    languageCatalogMap: Record<string, ICamelLanguageDefinition>,
    parentModel: Record<string, unknown>,
  ): {
    language: ICamelLanguageDefinition | undefined;
    model: Record<string, unknown>;
  } {
    let languageModelName = 'simple';
    let model = undefined;
    if (parentModel?.expression && Object.keys(parentModel.expression).length > 0) {
      languageModelName = Object.keys(parentModel.expression)[0];
      model = ExpressionService.parseLanguageModel(
        parentModel.expression as Record<string, unknown>,
        languageModelName,
      );
    } else {
      for (const language of Object.values(languageCatalogMap)) {
        if (parentModel[language.language.modelName]) {
          languageModelName = language.language.modelName;
          model = ExpressionService.parseLanguageModel(parentModel, language.language.modelName);
          break;
        }
      }
      if (!model) {
        parentModel.expression = {};
        model = {};
        (parentModel.expression as Record<string, unknown>)[languageModelName] = model;
      }
    }
    const language = this.getDefinitionFromModelName(languageCatalogMap, languageModelName);
    return { language, model };
  }

  private static parseLanguageModel(model: Record<string, unknown>, langName: string) {
    const lang = model[langName];
    if (typeof lang === 'string') {
      return { expression: lang };
    } else {
      return lang as Record<string, unknown>;
    }
  }

  private static getDefinitionFromModelName(
    languageCatalogMap: Record<string, ICamelLanguageDefinition>,
    modelName: string,
  ): ICamelLanguageDefinition | undefined {
    return Object.values(languageCatalogMap).find((model) => model.language.modelName === modelName);
  }

  /**
   * Set the expression model to the parent step model object. This method uses the most verbose dialect, i.e.
   * ```yaml
   * - setBody:
   *     expression:
   *       simple:
   *         expression: ${body}
   *         trim: true
   * ```
   * @param languageCatalogMap The language catalog map to use as a dictionary.
   * @param parentModel The parent step model object which has expression as its parameter. e.g. `setBody` contents.
   * @param languageModelName The language model name string to set. e.g. `simple`.
   * @param newExpressionModel The new expression model to set, e.g. `/setBody/expression/simple` contents.
   */
  static setExpressionModel(
    languageCatalogMap: Record<string, ICamelLanguageDefinition>,
    parentModel: Record<string, unknown>,
    languageModelName: string,
    newExpressionModel: Record<string, unknown>,
  ): void {
    Object.values(languageCatalogMap).forEach((language) => {
      delete parentModel[language.language.modelName];
    });
    parentModel.expression = {};
    (parentModel.expression as Record<string, unknown>)[languageModelName] = newExpressionModel;
  }
}
