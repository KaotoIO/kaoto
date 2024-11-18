import { Icon, Tab, TabTitleIcon, TabTitleText, Tabs, TabsProps } from '@patternfly/react-core';
import { CodeIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import clsx from 'clsx';
import { useContext, useMemo, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import icon_component_datamapper from '../assets/components/datamapper.png';
import bean from '../assets/eip/bean.png';
import camelIcon from '../assets/logo-kaoto.svg';
import { SourceSchemaType } from '../models/camel/source-schema-type';
import { EntitiesContext } from '../providers/entities.provider';
import { Links } from '../router/links.models';
import './KaotoEditor.scss';

const enum TabList {
  Design,
  Beans,
  Metadata,
  ErrorHandler,
  KaotoDataMapper,
}

const SCHEMA_TABS: Record<SourceSchemaType, TabList[]> = {
  [SourceSchemaType.Route]: [TabList.Design, TabList.Beans, TabList.KaotoDataMapper],
  [SourceSchemaType.Kamelet]: [TabList.Design, TabList.Beans, TabList.Metadata, TabList.KaotoDataMapper],
  [SourceSchemaType.Integration]: [],
  [SourceSchemaType.KameletBinding]: [TabList.Design, TabList.Metadata, TabList.ErrorHandler],
  [SourceSchemaType.Pipe]: [TabList.Design, TabList.Metadata, TabList.ErrorHandler],
};

export const KaotoEditor = () => {
  const entitiesContext = useContext(EntitiesContext);
  const resource = entitiesContext?.camelResource;
  const inset = useRef<TabsProps['inset']>({ default: 'insetSm' });
  const currentLocation = useLocation();
  const secondSlashIndex = currentLocation.pathname.indexOf('/', 1);
  const currentPath = currentLocation.pathname.substring(0, secondSlashIndex !== -1 ? secondSlashIndex : undefined);
  const dataMapperLink = currentLocation.pathname.startsWith(Links.DataMapper)
    ? currentLocation.pathname
    : Links.DataMapper;

  const availableTabs = useMemo(() => {
    if (!resource) {
      return {
        design: false,
        beans: false,
        metadata: false,
        errorHandler: false,
        kaotoDataMapper: false,
      };
    }

    return {
      design: SCHEMA_TABS[resource.getType()].indexOf(TabList.Design) >= 0,
      beans: SCHEMA_TABS[resource.getType()].indexOf(TabList.Beans) >= 0,
      metadata: SCHEMA_TABS[resource.getType()].indexOf(TabList.Metadata) >= 0,
      errorHandler: SCHEMA_TABS[resource.getType()].indexOf(TabList.ErrorHandler) >= 0,
      kaotoDataMapper: SCHEMA_TABS[resource.getType()].indexOf(TabList.KaotoDataMapper) >= 0,
    };
  }, [resource]);

  return (
    <div className="shell" data-envelope-context="vscode">
      <Tabs
        inset={inset.current}
        isBox
        unmountOnExit
        activeKey={currentPath}
        aria-label="Tabs in the Kaoto editor"
        role="region"
      >
        {availableTabs.design && (
          <Link data-testid="design-tab" to={Links.Home}>
            <Tab
              id="design-tab"
              eventKey={Links.Home}
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
            />
          </Link>
        )}

        {availableTabs.beans && (
          <Link data-testid="beans-tab" to={Links.Beans}>
            <Tab
              id="beans-tab"
              eventKey={Links.Beans}
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
            />
          </Link>
        )}

        {availableTabs.metadata && (
          <Link data-testid="metadata-tab" to={Links.Metadata}>
            <Tab
              id="metadata-tab"
              eventKey={Links.Metadata}
              title={
                <>
                  <TabTitleIcon>
                    <CodeIcon />
                  </TabTitleIcon>
                  <TabTitleText>Metadata</TabTitleText>
                </>
              }
              aria-label="Metadata editor"
            />
          </Link>
        )}

        {availableTabs.errorHandler && (
          <Link data-testid="error-handler-tab" to={Links.PipeErrorHandler}>
            <Tab
              id="error-handler-tab"
              eventKey={Links.PipeErrorHandler}
              title={
                <>
                  <TabTitleIcon>
                    <ExclamationCircleIcon />
                  </TabTitleIcon>
                  <TabTitleText>Error Handler</TabTitleText>
                </>
              }
              aria-label="Error Handler editor"
            />
          </Link>
        )}

        {availableTabs.kaotoDataMapper && (
          <Link data-testid="datamapper-tab" to={dataMapperLink}>
            <Tab
              id="datamapper-tab"
              eventKey={Links.DataMapper}
              title={
                <>
                  <TabTitleIcon>
                    <Icon>
                      <img src={icon_component_datamapper} alt="DataMapper icon" />
                    </Icon>
                  </TabTitleIcon>
                  <TabTitleText>DataMapper</TabTitleText>
                </>
              }
              aria-label="DataMapper"
            />
          </Link>
        )}
      </Tabs>

      <div
        className={clsx({
          'shell__tab-content': true,
          'shell__tab-content--scrollable': currentLocation.pathname !== Links.Home,
        })}
      >
        <Outlet />
      </div>
    </div>
  );
};
