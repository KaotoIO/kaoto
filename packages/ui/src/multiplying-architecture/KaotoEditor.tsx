import { Icon, Tab, TabTitleIcon, TabTitleText, Tabs, TabsProps } from '@patternfly/react-core';
import { CodeIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import { useContext, useState } from 'react';
import camelIcon from '../assets/logo-kaoto.svg';
import bean from '../assets/eip/bean.png';
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

  if (!resource) {
    return null;
  }

  return (
    <div className="shell" data-envelope-context="vscode">
      <Tabs
        inset={{ default: 'insetSm' }}
        isBox
        unmountOnExit
        activeKey={activeTabKey}
        onSelect={handleTabClick as TabsProps['onSelect']}
        aria-label="Tabs in the Kaoto editor"
        role="region"
      >
        <Tab
          isHidden={SCHEMA_TABS[resource.getType()].indexOf(TabList.Design) === -1}
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
        <Tab
          eventKey={TabList.Beans}
          isHidden={SCHEMA_TABS[resource.getType()].indexOf(TabList.Beans) === -1}
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
        <Tab
          eventKey={TabList.Metadata}
          isHidden={SCHEMA_TABS[resource.getType()].indexOf(TabList.Metadata) === -1}
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
        <Tab
          eventKey={TabList.ErrorHandler}
          isHidden={SCHEMA_TABS[resource.getType()].indexOf(TabList.ErrorHandler) === -1}
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
      </Tabs>
    </div>
  );
};
