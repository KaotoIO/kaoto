import { CanvasView, IDataMapperContext, IMapping, INotification } from '../models';
import { useMemo, useState } from 'react';
import { useToggle } from './useToggle';

export const useDataMapperContext = (): IDataMapperContext => {
  const [loading, setLoading] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<CanvasView>('SourceTarget');
  const [notifications, setNotifications] = useState<INotification[]>([]);
  const { state: isPreviewEnabled, toggle: togglePreview } = useToggle(false);
  const { state: showTypes, toggle: toggleShowTypes } = useToggle(true);
  const { state: showMappedFields, toggle: toggleShowMappedFields } = useToggle(true);
  const { state: showUnmappedFields, toggle: toggleShowUnmappedFields } = useToggle(true);
  const [selectedMapping, setSelectedMapping] = useState<IMapping | null>(null);
  const [mappings, setMappings] = useState<IMapping[]>([]);

  return useMemo(() => {
    return {
      loading,
      activeView,
      setActiveView,
      notifications,
      constants: {
        id: 'constants',
        name: 'Constants',
        type: 'constants',
        fields: [],
      },
      sourceProperties: {
        id: 'sourceProperties',
        name: 'Source Properties',
        type: 'source',
        fields: [],
      },
      targetProperties: {
        id: 'targetProperties',
        name: 'Target Properties',
        type: 'target',
        fields: [],
      },
      sources: [],
      targets: [],
      mappings,
      setMappings,
      selectedMapping,
      setSelectedMapping,
      isPreviewEnabled,
      togglePreview,
      showTypes,
      toggleShowTypes,
      showMappedFields,
      toggleShowMappedFields,
      showUnmappedFields,
      toggleShowUnmappedFields,
    };
  }, [
    activeView,
    isPreviewEnabled,
    loading,
    mappings,
    notifications,
    selectedMapping,
    showMappedFields,
    showTypes,
    showUnmappedFields,
    togglePreview,
    toggleShowMappedFields,
    toggleShowTypes,
    toggleShowUnmappedFields,
  ]);
};
