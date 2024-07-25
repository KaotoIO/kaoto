import { CamelCatalogService } from '../../../models/visualization/flows';
import { ICamelLanguageDefinition } from '../../../models';
import { isDefined } from '../../../utils';

export class ExpressionService {
  /**
   * Get the language catalog map from the Camel catalog. Since "language" language is not in the languages Camel
   *  catalog, it is extracted from the YAML DSL schema.
   */
  static getLanguageMap(): Record<string, ICamelLanguageDefinition> {
    return CamelCatalogService.getLanguageMap();
  }

  /**
   * Get the language schema from the language catalog. Language catalog has its properties schema in itself,
   * which is combined in @kaoto/camel-catalog.
   * @param languageCatalog The {@link ICamelLanguageDefinition} object represents the language to get the schema.
   */
  static getLanguageSchema(languageCatalog: ICamelLanguageDefinition) {
    return languageCatalog.propertiesSchema;
  }

  static getDefinitionFromModelName(
    languageCatalogMap: Record<string, ICamelLanguageDefinition>,
    modelName: string,
  ): ICamelLanguageDefinition | undefined {
    return Object.values(languageCatalogMap).find((model) => model.model.name === modelName);
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
  static parseStepExpressionModel(
    languageCatalogMap: Record<string, ICamelLanguageDefinition>,
    parentModel: Record<string, unknown>,
  ): {
    language: ICamelLanguageDefinition | undefined;
    model: Record<string, unknown> | undefined;
  } {
    if (!isDefined(parentModel)) return { language: undefined, model: undefined };
    let languageModelName;
    let model = undefined;
    if (parentModel.expression && Object.keys(parentModel.expression).length > 0) {
      languageModelName = Object.keys(parentModel.expression)[0];
      model = ExpressionService.parseLanguageModel(
        parentModel.expression as Record<string, unknown>,
        languageModelName,
      );
    } else {
      for (const language of Object.values(languageCatalogMap)) {
        if (parentModel[language.model.name]) {
          languageModelName = language.model.name;
          model = ExpressionService.parseLanguageModel(parentModel, language.model.name);
          break;
        }
      }
      if (!languageModelName) {
        return { language: undefined, model };
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
    if (typeof lang === 'object') {
      return lang as Record<string, unknown>;
    } else {
      // expression could be even a number
      return { expression: lang };
    }
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
  static setStepExpressionModel(
    languageCatalogMap: Record<string, ICamelLanguageDefinition>,
    parentModel: Record<string, unknown>,
    languageModelName: string,
    newExpressionModel: Record<string, unknown>,
  ): void {
    Object.values(languageCatalogMap).forEach((language) => {
      delete parentModel[language.model.name];
    });
    if (!languageModelName || !languageCatalogMap[languageModelName]) {
      delete parentModel.expression;
      return;
    }
    parentModel.expression = {};
    (parentModel.expression as Record<string, unknown>)[languageModelName] = newExpressionModel;
  }

  static deleteStepExpressionModel(parentModel: Record<string, unknown>): void {
    if (parentModel.expression) {
      delete parentModel.expression;
    }
  }

  /**
   * Set the result type property to enum of common result types.
   *
   * @param language
   * @returns
   */
  static setStepExpressionResultType(language: ICamelLanguageDefinition): ICamelLanguageDefinition {
    if (language.propertiesSchema?.properties?.resultType) {
      language.propertiesSchema.properties.resultType = {
        ...language.propertiesSchema.properties.resultType,
        enum: ['java.lang.String', 'java.lang.Boolean', 'java.lang.Integer', 'java.lang.Double', 'java.lang.Float'],
      };
    }
    return language;
  }

  /**
   * Parse the property expression model from the parent parameter model object.
   * @param languageCatalogMap The language catalog map to use as a dictionary.
   * @param parentModel The parent parameter model object which is an expression type. For example `completionPredicate` parameter contents of `aggregate` EIP.
   */
  static parsePropertyExpressionModel(
    languageCatalogMap: Record<string, ICamelLanguageDefinition>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    parentModel: any,
  ): {
    language: ICamelLanguageDefinition | undefined;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any;
  } {
    let languageModelName;
    let model = undefined;
    for (const language of Object.values(languageCatalogMap)) {
      if (parentModel && parentModel[language.model.name]) {
        languageModelName = language.model.name;
        model = ExpressionService.parseLanguageModel(parentModel, language.model.name);
        break;
      }
    }
    if (!languageModelName) {
      return { language: undefined, model };
    }
    if (!model) {
      model = {};
      parentModel[languageModelName] = model;
    }
    const language = this.getDefinitionFromModelName(languageCatalogMap, languageModelName);
    return { language, model };
  }

  /**
   * Set the property expression model to the parent parameter model object.
   * @param languageCatalogMap The language catalog map to use as a dictionary.
   * @param parentModel The parent parameter model object which is an expression type. For example `completionPredicate` parameter contents of `aggregate` EIP.
   * @param languageName The language model name string to set. e.g. `simple`.
   * @param newExpressionModel The new expression model to set, e.g. `/aggregate/completionPredicate/simple` contents.
   */
  static setPropertyExpressionModel(
    languageCatalogMap: Record<string, ICamelLanguageDefinition>,
    parentModel: Record<string, unknown>,
    languageName: string,
    newExpressionModel: Record<string, unknown>,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any {
    Object.values(languageCatalogMap).forEach((language) => {
      delete parentModel[language.model.name];
    });
    parentModel[languageName] = newExpressionModel;
  }
}
