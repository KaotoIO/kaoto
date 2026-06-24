import {
  ForEachGroupItem,
  ForEachItem,
  GROUPING_STRATEGY_LABELS,
  IfItem,
  MappingItem,
  UnknownMappingItem,
  VariableItem,
  WhenItem,
} from '../../../models/datamapper';
import { VisualizationService } from '../../../services/visualization/visualization.service';

export interface MappingItemLabelInfo {
  isWarning: boolean;
  labelContent: string;
  titleText?: string;
  popoverHeader?: string;
  warnings?: string[];
  xmlSnippet?: string;
  strategyLabel?: string;
  groupingExpression?: string;
}

export class NodeTitleUtil {
  static getMappingItemLabelInfo(mapping: MappingItem): MappingItemLabelInfo {
    if (mapping instanceof UnknownMappingItem) return NodeTitleUtil.getUnknownMappingLabelInfo(mapping);
    if (mapping instanceof VariableItem) return NodeTitleUtil.getVariableLabelInfo(mapping);
    if (mapping instanceof ForEachGroupItem) return NodeTitleUtil.getForEachGroupLabelInfo(mapping);

    if (mapping instanceof ForEachItem && !mapping.expression) {
      return { isWarning: true, labelContent: mapping.name, popoverHeader: 'Select expression is not configured' };
    }

    if ((mapping instanceof IfItem || mapping instanceof WhenItem) && !mapping.expression) {
      return { isWarning: true, labelContent: mapping.name, popoverHeader: 'Test expression is not configured' };
    }

    return { isWarning: false, labelContent: mapping.name };
  }

  private static getUnknownMappingLabelInfo(mapping: UnknownMappingItem): MappingItemLabelInfo {
    return {
      isWarning: true,
      labelContent: 'unknown',
      popoverHeader: 'Unsupported element detected',
      xmlSnippet: VisualizationService.formatXml(mapping.element),
    };
  }

  private static getVariableLabelInfo(mapping: VariableItem): MappingItemLabelInfo {
    const isWarning = !mapping.expression && mapping.children.length === 0;
    return {
      isWarning,
      labelContent: '$',
      titleText: mapping.name,
      popoverHeader: isWarning ? 'Variable value is not configured' : undefined,
      warnings: isWarning ? ['Provide either a select expression or child content for this variable.'] : undefined,
    };
  }

  private static getForEachGroupLabelInfo(mapping: ForEachGroupItem): MappingItemLabelInfo {
    const missingSelect = !mapping.expression;
    const missingGrouping = !mapping.groupingExpression;
    const isWarning = missingSelect || missingGrouping;
    const strategyLabel = GROUPING_STRATEGY_LABELS[mapping.groupingStrategy];
    const warnings: string[] = [];
    if (missingSelect) warnings.push('Select expression is not configured');
    if (missingGrouping)
      warnings.push('Grouping is not configured. Click "Configure for-each-group" in 3-dots mapping context menu');
    return {
      isWarning,
      labelContent: mapping.name,
      popoverHeader: isWarning ? 'missing configuration' : strategyLabel,
      warnings: isWarning ? warnings : undefined,
      strategyLabel: isWarning ? undefined : strategyLabel,
      groupingExpression: isWarning ? undefined : mapping.groupingExpression,
    };
  }
}
