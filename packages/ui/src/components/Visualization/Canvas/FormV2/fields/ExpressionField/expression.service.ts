import { ExpressionDefinition } from '@kaoto/camel-catalog/types';
import { CamelCatalogService } from '../../../../../../models';
import { isDefined } from '../../../../../../utils';

type StepExpression = { expression: ExpressionDefinition; [key: string]: unknown };

export class ExpressionService {
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
   * @param parentModel The parent step model object which has expression as its parameter. For example `setBody` contents.
   * */
  static parseStepExpressionModel(parentModel?: Record<string, unknown>): StepExpression | undefined {
    if (!isDefined(parentModel)) {
      return undefined;
    }

    if (parentModel.expression && Object.keys(parentModel.expression).length > 0) {
      const [languageModelName] = Object.keys(parentModel.expression);
      const parsedModel = this.parseLanguageModel(parentModel.expression as Record<string, unknown>, languageModelName);

      return { ...parentModel, expression: parsedModel };
    }

    const languageNames = this.getLanguageNames();
    return Object.entries(parentModel).reduce((acc, [key, value]) => {
      if (languageNames.includes(key)) {
        acc['expression'] = this.parseLanguageModel({ [key]: value }, key);
        return acc;
      }

      return { ...acc, [key]: value };
    }, {} as StepExpression);
  }

  /**
   * Parse the property expression model from the parent parameter model object.
   * @param parentModel The parent parameter model object which is an expression type. For example `completionPredicate` parameter contents of `aggregate` EIP.
   */
  static parsePropertyExpressionModel(parentModel?: Record<string, unknown>): ExpressionDefinition | undefined {
    const rootExpression = this.parseStepExpressionModel(parentModel);

    if (!isDefined(rootExpression)) {
      return undefined;
    }

    return rootExpression.expression;
  }

  private static getLanguageNames(): string[] {
    const languageCatalogMap = CamelCatalogService.getLanguageMap();

    if (Object.keys(languageCatalogMap).length === 0) {
      throw new Error('Language catalog is not initialized');
    }

    return Object.values(languageCatalogMap).map((lang) => lang.model.name);
  }

  /**
   * Parse the language model object. i.e `{ simple: '${body}' }` into `{ simple: { expression: '${body}' } }`
   *
   * @param model The language model object. i.e `{ simple: '${body}' }`
   * @param langName The language name. i.e `simple`
   * @returns The parsed language model object. i.e `{ simple: { expression: '${body}' } }`
   */
  private static parseLanguageModel(model: Record<string, unknown>, langName: string): ExpressionDefinition {
    const lang = model[langName];

    if (typeof lang === 'object') {
      return model as ExpressionDefinition;
    } else {
      // expression could be even a number
      return { [langName]: { expression: lang } } as ExpressionDefinition;
    }
  }
}
