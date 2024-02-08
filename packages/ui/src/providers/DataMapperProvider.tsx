/*
    Copyright (C) 2017 Red Hat, Inc.

    Licensed under the Apache License, Version 2.0 (the "License");
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at

            http://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an "AS IS" BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/
import {
  DataActionPayload,
  dataReducer,
  initDataState,
  initNotificationsState,
  notificationsReducer,
} from '../_bk_atlasmap/impl/reducers';
import { MappingSerializer } from '../_bk_atlasmap/core';
import { createContext, FunctionComponent, PropsWithChildren, useCallback, useEffect, useReducer } from 'react';
import {
  errorInfoToNotification,
  fromDocumentDefinitionToFieldGroup,
  fromFieldToIFieldsNode,
  fromMappingDefinitionToIMappings,
  fromMappingModelToImapping,
  initializationService,
} from '../_bk_atlasmap/impl/utils';

import { debounceTime } from 'rxjs/operators';
import { Loading } from '../components';
import { useDataMapperContext } from '../hooks/useDataMapperContext';
import { IDocument, IDataMapperContext, IField } from '../models';

export const DataMapperContext = createContext<IDataMapperContext | null>(null);

export interface IDataMapperProviderProps extends PropsWithChildren {
  onMappingChange?: (serializedMappings: string) => void;
}
export const DataMapperProvider: FunctionComponent<IDataMapperProviderProps> = ({ onMappingChange, children }) => {
  const [data, dispatchData] = useReducer(dataReducer, {}, initDataState);
  const [notifications, dispatchNotifications] = useReducer(notificationsReducer, {}, initNotificationsState);
  const value = useDataMapperContext();

  const onReset = () => {
    dispatchData({ type: 'reset' });
    dispatchNotifications({
      type: 'reset',
    });
  };

  const onLoading = () => {
    dispatchData({ type: 'loading' });
  };

  const onUpdates = (payload: DataActionPayload) => {
    dispatchData({
      type: 'update',
      payload,
    });
  };

  useEffect(function onInitializationCb() {
    onReset();
    initializationService.resetConfig();
    //const cfg = initializationService.cfg;
    initializationService.initialize();
  }, []);

  const configModel = initializationService.cfg;

  const convertSources = useCallback(
    function convertSourcesCb() {
      return (
        configModel.sourceDocs
          .map(fromDocumentDefinitionToFieldGroup)
          /* eslint-disable  @typescript-eslint/no-explicit-any */
          .filter((d: any) => d) as IDocument[]
      );
    },
    [configModel],
  );

  const convertConstants = useCallback(
    function convertConstantsCb() {
      return fromDocumentDefinitionToFieldGroup(configModel.constantDoc);
    },
    [configModel],
  );

  const convertSourceProperties = useCallback(
    function convertPropertiesCb() {
      return fromDocumentDefinitionToFieldGroup(configModel.sourcePropertyDoc);
    },
    [configModel],
  );

  const convertTargetProperties = useCallback(
    function convertPropertiesCb() {
      return fromDocumentDefinitionToFieldGroup(configModel.targetPropertyDoc);
    },
    [configModel],
  );

  const convertTargets = useCallback(
    function convertTargetsCb() {
      return configModel.targetDocs.map(fromDocumentDefinitionToFieldGroup).filter((d) => d) as IDocument[];
    },
    [configModel],
  );

  const convertMappings = useCallback(
    function convertMappingsCb() {
      return fromMappingDefinitionToIMappings(configModel.mappings);
    },
    [configModel],
  );

  const convertSelectedMapping = useCallback(
    function convertSelectedMappingCb() {
      return fromMappingModelToImapping(configModel.mappings?.activeMapping);
    },
    [configModel],
  );

  const convertSourcesToFlatArray = useCallback(
    function convertSourcesToFlatArrayCb(): IField[] {
      return configModel.sourceDocs.flatMap((s) =>
        s.getAllFields().flatMap((f) => {
          const af = fromFieldToIFieldsNode(f);
          return af ? [af] : [];
        }),
      );
    },
    [configModel],
  );
  const convertTargetsToFlatArray = useCallback(
    function convertTargetsToFlatArrayCb() {
      return configModel.targetDocs.flatMap((t) =>
        t.getAllFields().flatMap((f) => {
          const af = fromFieldToIFieldsNode(f);
          return af ? [af] : [];
        }),
      );
    },
    [configModel],
  );

  const onSubUpdate = useCallback(
    function onSubUpdateCb(_caller: string) {
      onUpdates({
        pending: !configModel.initCfg.initialized,
        error: configModel.initCfg.initializationErrorOccurred,
        sources: convertSources(),
        constants: convertConstants(),
        sourceProperties: convertSourceProperties(),
        targets: convertTargets(),
        targetProperties: convertTargetProperties(),
        mappings: convertMappings(),
        selectedMapping: convertSelectedMapping(),
        flatSources: convertSourcesToFlatArray(),
        flatTargets: convertTargetsToFlatArray(),
      });
      dispatchNotifications({
        type: 'update',
        payload: {
          notifications: configModel.errorService
            .getErrors()
            .reverse()
            .filter((e) => e.level !== 'DEBUG')
            .map(errorInfoToNotification),
        },
      });
    },
    [
      configModel,
      convertConstants,
      convertMappings,
      convertSelectedMapping,
      convertSources,
      convertSourceProperties,
      convertSourcesToFlatArray,
      convertTargets,
      convertTargetProperties,
      convertTargetsToFlatArray,
    ],
  );

  useEffect(
    function subscriptionListener() {
      const debounceTimeWindow = data.pending ? 1000 : 50;
      const initializationObservable = initializationService.systemInitializedSource.pipe(
        debounceTime(debounceTimeWindow),
      );
      const lineRefreshObservable = configModel.mappingService.lineRefreshSource.pipe(debounceTime(debounceTimeWindow));
      const mappingUpdatedSource = configModel.mappingService.mappingUpdatedSource.pipe(
        debounceTime(debounceTimeWindow),
      );
      const mappingPreview = configModel.previewService.mappingPreviewOutput$.pipe(debounceTime(debounceTimeWindow));

      const subscriptions = [
        initializationObservable.subscribe(() => onSubUpdate('initializationObservable')),
        mappingUpdatedSource.subscribe(() => onSubUpdate('mappingUpdatedSource')),
        mappingPreview.subscribe(() => onSubUpdate('mappingPreviewOutput$')),
        lineRefreshObservable.subscribe(() => onSubUpdate('lineRefreshObservable')),
        configModel.errorService.subscribe(() => onSubUpdate('errorService')),
      ];

      return () => {
        subscriptions.forEach((s) => s.unsubscribe());
      };
    },
    [configModel, data.pending, data.selectedMapping, onSubUpdate],
  );

  useEffect(
    function onMappingChangeListenerCb() {
      if (onMappingChange) {
        configModel.mappingService.mappingUpdatedSource.subscribe(function onMappingChangeListenerSubCb() {
          if (configModel.initCfg.initialized) {
            onMappingChange(JSON.stringify(MappingSerializer.serializeMappings(configModel)));
          }
        });
      }
    },
    [configModel, onMappingChange],
  );

  return (
    <DataMapperContext.Provider value={value}>{value.loading ? <Loading /> : children}</DataMapperContext.Provider>
  );
};
