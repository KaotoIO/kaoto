import { BeansEntity } from '../../models/visualization/metadata';
import { RouteTemplateBeansEntity } from '../../models/visualization/metadata/routeTemplateBeansEntity';
import { ParsedTable } from '../../models/documentation';
import { BeanFactory, BeansDeserializer } from '@kaoto/camel-catalog/types';
import { CommonParser } from './common-parser';

export class BeansParser {
  static readonly HEADERS_BEANS = ['Name', 'Type', 'Property Name', 'Property Value'];

  static parseBeansEntity(entity: BeansEntity | RouteTemplateBeansEntity, label: string): ParsedTable {
    const beansModel: BeansDeserializer | Partial<BeanFactory>[] = entity.parent.beans;
    const parsedTable = new ParsedTable({ title: label, headers: BeansParser.HEADERS_BEANS });
    beansModel.forEach((bean) => {
      if (!bean.properties || Object.keys(bean.properties).length === 0) {
        parsedTable.data.push([bean.name || '', bean.type || '', '', '']);
        return;
      }
      const parsedProperties = CommonParser.parseParameters(bean.properties);
      Object.entries(parsedProperties).forEach(([propKey, propValue], index) => {
        parsedTable.data.push([
          index === 0 && bean.name ? bean.name : '',
          index === 0 && bean.type ? bean.type : '',
          propKey,
          propValue,
        ]);
      });
    });
    return parsedTable;
  }
}
