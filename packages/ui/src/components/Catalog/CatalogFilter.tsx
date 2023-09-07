import { Form, FormGroup, Grid, GridItem, SearchInput, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { FunctionComponent, useEffect, useRef } from 'react';
import { CatalogLayout } from './Catalog.models';
import { CatalogLayoutIcon } from './CatalogLayoutIcon';

interface CatalogFilterProps {
  className?: string;
  searchTerm: string;
  groups: string[];
  layouts: CatalogLayout[];
  activeGroup: string;
  activeLayout: CatalogLayout;
  onChange: (event: unknown, value?: string) => void;
  setActiveGroup: (group: string) => void;
  setActiveLayout: (layout: CatalogLayout) => void;
}

export const CatalogFilter: FunctionComponent<CatalogFilterProps> = (props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Form className={props.className}>
      <Grid hasGutter>
        <GridItem md={5} lg={6}>
          <FormGroup label="Search term" fieldId="search-term">
            <SearchInput
              aria-label="Find by name, description or tag"
              placeholder="Find by name, description or tag"
              value={props.searchTerm}
              onChange={props.onChange}
              onClear={props.onChange}
              ref={inputRef}
            />
          </FormGroup>
        </GridItem>

        <GridItem className="pf-v5-u-text-align-right" md={5}>
          <FormGroup label="Type" fieldId="element-type">
            <ToggleGroup aria-label="Select element type">
              {props.groups.map((key) => (
                <ToggleGroupItem
                  text={key}
                  key={key}
                  data-testid={`${key}-catalog-tab`}
                  buttonId={`toggle-group-button-${key}`}
                  isSelected={props.activeGroup === key}
                  onChange={() => {
                    props.setActiveGroup(key);
                  }}
                />
              ))}
            </ToggleGroup>
          </FormGroup>
        </GridItem>
        <GridItem md={2} lg={1}>
          <FormGroup label="Layout" fieldId="layout">
            <ToggleGroup aria-label="Change layout">
              {props.layouts.map((key) => (
                <ToggleGroupItem
                  icon={<CatalogLayoutIcon key={key} layout={key} />}
                  key={key}
                  data-testid={`toggle-layout-button-${key}`}
                  buttonId={`toggle-layout-button-${key}`}
                  aria-label={`toggle-layout-button-${key}`}
                  isSelected={props.activeLayout === key}
                  onChange={() => {
                    props.setActiveLayout(key);
                  }}
                />
              ))}
            </ToggleGroup>
          </FormGroup>
        </GridItem>
      </Grid>
    </Form>
  );
};
