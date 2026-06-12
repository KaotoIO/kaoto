import {
  action,
  Controller,
  createTopologyControlButtons,
  defaultControlButtonsOptions,
  TopologyControlButton,
} from '@patternfly/react-topology';
import { useMemo } from 'react';

import { HorizontalLayoutIcon } from '../../components/Icons/HorizontalLayout';
import { VerticalLayoutIcon } from '../../components/Icons/VerticalLayout';
import { LayoutType } from '../../components/Visualization/Canvas/canvas.models';
import { LocalStorageKeys } from '../../models';
import { AbstractSettingsAdapter, CanvasLayoutDirection } from '../../models/settings/settings.model';

const FIT_PADDING = 80;

/**
 * Build the topology control bar: zoom in/out, fit-to-screen, reset and (when
 * the user opted into per-canvas layout selection) horizontal/vertical layout
 * toggles. The chosen layout is persisted in the same localStorage key used
 * by the design canvas so both views stay in sync.
 */
export const useTopologyControlButtons = (
  controller: Controller,
  settingsAdapter: AbstractSettingsAdapter,
): TopologyControlButton[] =>
  useMemo(() => {
    const customButtons: TopologyControlButton[] = [];

    if (settingsAdapter.getSettings().canvasLayoutDirection === CanvasLayoutDirection.SelectInCanvas) {
      customButtons.push(
        {
          id: 'topology-control-bar-h_layout-button',
          icon: <HorizontalLayoutIcon />,
          tooltip: 'Horizontal Layout',
          callback: action(() => {
            localStorage.setItem(LocalStorageKeys.CanvasLayout, LayoutType.DagreHorizontal);
            controller.getGraph().setLayout(LayoutType.DagreHorizontal);
            controller.getGraph().layout();
          }),
        },
        {
          id: 'topology-control-bar-v_layout-button',
          icon: <VerticalLayoutIcon />,
          tooltip: 'Vertical Layout',
          callback: action(() => {
            localStorage.setItem(LocalStorageKeys.CanvasLayout, LayoutType.DagreVertical);
            controller.getGraph().setLayout(LayoutType.DagreVertical);
            controller.getGraph().layout();
          }),
        },
      );
    }

    return createTopologyControlButtons({
      ...defaultControlButtonsOptions,
      zoomInCallback: action(() => {
        controller.getGraph().scaleBy(4 / 3);
      }),
      zoomOutCallback: action(() => {
        controller.getGraph().scaleBy(3 / 4);
      }),
      fitToScreenCallback: action(() => {
        controller.getGraph().fit(FIT_PADDING);
      }),
      resetViewCallback: action(() => {
        controller.getGraph().reset();
        controller.getGraph().layout();
        controller.getGraph().fit(FIT_PADDING);
      }),
      legend: false,
      customButtons,
    });
  }, [controller, settingsAdapter]);
