import { DesignPage } from './DesignPage';
import { ReturnToSourceCodeFallback } from './ReturnToSourceCodeFallback';
import { SerializerSelector } from '../../components/Visualization/ContextToolbar/SerializerSelector/SerializerSelector';
import { ToolbarItem } from '@patternfly/react-core';
import { IntegrationTypeSelector } from '../../components/Visualization/ContextToolbar/IntegrationTypeSelector/IntegrationTypeSelector';

const additionalControls = [
  <ToolbarItem key="toolbar-dsl-selector">
    <IntegrationTypeSelector />
  </ToolbarItem>,
  <SerializerSelector key="toolbar-serializer-selector" />,
];
export const element = (
  <DesignPage fallback={<ReturnToSourceCodeFallback />} additionalToolbarControls={additionalControls} />
);
