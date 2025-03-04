import { DesignPage } from './DesignPage';
import { ReturnToSourceCodeFallback } from './ReturnToSourceCodeFallback';
import { SerializerSelector } from '../../components/Visualization/ContextToolbar/SerializerSelector/SerializerSelector';
import { ToolbarItem } from '@patternfly/react-core';
import { DSLSelector } from '../../components/Visualization/ContextToolbar/DSLSelector/DSLSelector';

const additionalControls = [
  <ToolbarItem key="toolbar-dsl-selector">
    <DSLSelector />
  </ToolbarItem>,
  <SerializerSelector key="toolbar-serializer-selector" />,
];
export const element = (
  <DesignPage fallback={<ReturnToSourceCodeFallback />} additionalToolbarControls={additionalControls} />
);
