import { Icon, Tab, TabTitleIcon, TabTitleText, Tabs, TabsProps } from '@patternfly/react-core';
import { CodeIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { useContext, useMemo, useRef, useState } from 'react';
import bean from '../assets/eip/bean.png';
import camelIcon from '../assets/logo-kaoto.svg';
import { SourceSchemaType } from '../models/camel/source-schema-type';
import { BeansPage } from '../pages/Beans/BeansPage';
import { MetadataPage } from '../pages/Metadata/MetadataPage';
import { PipeErrorHandlerPage } from '../pages/PipeErrorHandler/PipeErrorHandlerPage';
import { EntitiesContext } from '../providers/entities.provider';
import './KaotoEditor.scss';
import { DesignTab } from './Tabs/DesignTab';

const enum TabList {
  Design,
  Beans,
  Metadata,
  ErrorHandler,
}

const SCHEMA_TABS: Record<SourceSchemaType, TabList[]> = {
  [SourceSchemaType.Route]: [TabList.Design, TabList.Beans],
  [SourceSchemaType.Kamelet]: [TabList.Design, TabList.Beans, TabList.Metadata],
  [SourceSchemaType.Integration]: [],
  [SourceSchemaType.KameletBinding]: [TabList.Design, TabList.Metadata, TabList.ErrorHandler],
  [SourceSchemaType.Pipe]: [TabList.Design, TabList.Metadata, TabList.ErrorHandler],
};

export const KaotoEditor = () => {
  const [activeTabKey, setActiveTabKey] = useState<TabList>(TabList.Design);
  const handleTabClick = (_event: unknown, tabIndex: TabList) => {
    setActiveTabKey(tabIndex);
  };
  const entitiesContext = useContext(EntitiesContext);
  const resource = entitiesContext?.camelResource;
  const inset = useRef<TabsProps['inset']>({ default: 'insetSm' });

  const availableTabs = useMemo(() => {
    if (!resource) {
      return {
        design: false,
        beans: false,
        metadata: false,
        errorHandler: false,
      };
    }

    return {
      design: SCHEMA_TABS[resource.getType()].indexOf(TabList.Design) >= 0,
      beans: SCHEMA_TABS[resource.getType()].indexOf(TabList.Beans) >= 0,
      metadata: SCHEMA_TABS[resource.getType()].indexOf(TabList.Metadata) >= 0,
      errorHandler: SCHEMA_TABS[resource.getType()].indexOf(TabList.ErrorHandler) >= 0,
    };
  }, [resource]);

  return (
    <div className="shell" data-envelope-context="vscode">
      <Tabs
        inset={inset.current}
        isBox
        unmountOnExit
        activeKey={activeTabKey}
        onSelect={handleTabClick as TabsProps['onSelect']}
        aria-label="Tabs in the Kaoto editor"
        role="region"
      >
        {availableTabs.design && (
          <Tab
            eventKey={TabList.Design}
            className="shell__tab-content_design-canvas"
            title={
              <>
                <TabTitleIcon>
                  <Icon>
                    <img src={camelIcon} alt="Camel icon" />
                  </Icon>
                </TabTitleIcon>
                <TabTitleText>Design</TabTitleText>
              </>
            }
            aria-label="Design canvas"
          >
            <DesignTab />
          </Tab>
        )}

        {availableTabs.beans && (
          <Tab
            eventKey={TabList.Beans}
            className="shell__tab-content"
            title={
              <>
                <TabTitleIcon>
                  <Icon>
                    <img src={bean} />
                  </Icon>
                </TabTitleIcon>
                <TabTitleText>Beans</TabTitleText>
              </>
            }
            aria-label="Beans editor"
          >
            <BeansPage />
          </Tab>
        )}

        {availableTabs.metadata && (
          <Tab
            eventKey={TabList.Metadata}
            className="shell__tab-content"
            title={
              <>
                <TabTitleIcon>
                  <CodeIcon />
                </TabTitleIcon>
                <TabTitleText>Metadata</TabTitleText>
              </>
            }
            aria-label="Metadata editor"
          >
            <MetadataPage />
          </Tab>
        )}

        {availableTabs.errorHandler && (
          <Tab
            eventKey={TabList.ErrorHandler}
            className="shell__tab-content"
            title={
              <>
                <TabTitleIcon>
                  <ExclamationCircleIcon />
                </TabTitleIcon>
                <TabTitleText>Error Handler</TabTitleText>
              </>
            }
            aria-label="Error Handler editor"
          >
            <PipeErrorHandlerPage />
          </Tab>
        )}
      </Tabs>
    </div>
  );
};
