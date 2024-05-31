import { CamelCatalogService } from '../../../models/visualization/flows';
import { ICamelDataformatDefinition } from '../../../models';

export class DataFormatService {
  /**
   * Get the dataformat catalog map from the Camel catalog.
   */
  static getDataFormatMap(): Record<string, ICamelDataformatDefinition> {
    return CamelCatalogService.getDataFormatMap();
  }

  /**
   * Get the DataFormat schema from the DataFormat catalog. DataFormat catalog has its properties schema in itself,
   * which is combined in @kaoto/camel-catalog.
   * @param dataFormatCatalog The {@link ICamelDataformatDefinition} object represents the DataFormat to get the schema.
   */
  static getDataFormatSchema(dataFormatCatalog?: ICamelDataformatDefinition) {
    return dataFormatCatalog?.propertiesSchema;
  }

  /**
   * Parse the dataformat model from the parent step model object.
   * @param dataFormatCatalogMap The language catalog map to use as a dictionary.
   * @param parentModel The parent step model object which has expression as its parameter. For example `marshal` contents.
   * */
  static parseDataFormatModel(
    dataFormatCatalogMap: Record<string, ICamelDataformatDefinition>,
    parentModel: Record<string, unknown>,
  ): {
    dataFormat: ICamelDataformatDefinition | undefined;
    model: Record<string, unknown> | undefined;
  } {
    let dataFormatModelName;
    let model = undefined;
    for (const dataFormat of Object.values(dataFormatCatalogMap)) {
      if (parentModel[dataFormat.model.name]) {
        dataFormatModelName = dataFormat.model.name;
        model = DataFormatService.doParseDataFormatModel(parentModel, dataFormat);
        break;
      }
    }
    if (!dataFormatModelName) {
      return { dataFormat: undefined, model };
    }
    if (!model) {
      model = {};
      (parentModel as Record<string, unknown>)[dataFormatModelName] = model;
    }
    const dataFormat = this.getDefinitionFromModelName(dataFormatCatalogMap, dataFormatModelName);
    return { dataFormat: dataFormat, model };
  }

  private static doParseDataFormatModel(model: Record<string, unknown>, dataFormat: ICamelDataformatDefinition) {
    const dataFormatModel = model[dataFormat.model.name];
    if (typeof dataFormatModel === 'object') {
      return dataFormatModel as Record<string, unknown>;
    } else {
      const answer = {} as Record<string, unknown>;
      const firstProperty = Object.entries(dataFormat.properties)
        .sort((a, b) => {
          return a[1].index - b[1].index;
        })
        .find(([name, _prop]) => !['id', 'description'].includes(name));
      if (firstProperty) {
        answer[firstProperty[0]] = dataFormatModel;
      }
      return answer;
    }
  }

  static getDefinitionFromModelName(
    dataFormatCatalogMap: Record<string, ICamelDataformatDefinition>,
    modelName: string,
  ): ICamelDataformatDefinition | undefined {
    return Object.values(dataFormatCatalogMap).find((model) => model.model.name === modelName);
  }

  /**
   * Set the DataFormat model to the parent step model object.
   * @param dataFormatCatalogMap The DataFormat catalog map to use as a dictionary.
   * @param parentModel The parent step model object which has DataFormat as its parameter such as `marshal` and `unmarshal`
   * @param dataFormatModelName The DataFormat model name string to set. e.g. `json`.
   * @param newDataFormatModel The new DataFormat model to set
   */
  static setDataFormatModel(
    dataFormatCatalogMap: Record<string, ICamelDataformatDefinition>,
    parentModel: Record<string, unknown>,
    dataFormatModelName: string,
    newDataFormatModel: Record<string, unknown>,
  ): void {
    Object.values(dataFormatCatalogMap).forEach((dataFormat) => {
      delete parentModel[dataFormat.model.name];
    });
    if (!dataFormatModelName || !dataFormatCatalogMap[dataFormatModelName]) {
      return;
    }
    (parentModel as Record<string, unknown>)[dataFormatModelName] = newDataFormatModel;
  }
}
