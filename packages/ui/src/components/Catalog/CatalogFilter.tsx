import { Form, FormGroup, Grid, GridItem, SearchInput, ToggleGroup, ToggleGroupItem } from '@patternfly/react-core';
import { FunctionComponent, useEffect, useRef } from 'react';

interface CatalogFilterProps {
  className?: string;
  searchTerm: string;
  groups: string[];
  activeGroup: string;
  onChange: (event: unknown, value?: string) => void;
  setActiveGroup: (group: string) => void;
}

export const CatalogFilter: FunctionComponent<CatalogFilterProps> = (props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <Form className={props.className}>
      <Grid hasGutter md={6}>
        <GridItem>
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

        <GridItem className="pf-v5-u-text-align-right">
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
      </Grid>
    </Form>
  );
};
