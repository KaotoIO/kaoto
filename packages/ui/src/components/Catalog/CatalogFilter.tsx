import {
  Badge,
  Form,
  FormGroup,
  Grid,
  GridItem,
  Label,
  LabelGroup,
  SearchInput,
  ToggleGroup,
  ToggleGroupItem,
  capitalize,
} from '@patternfly/react-core';
import { FunctionComponent, useEffect, useRef } from 'react';
import { CatalogLayout } from './Catalog.models';
import { CatalogLayoutIcon } from './CatalogLayoutIcon';

interface CatalogFilterProps {
  className?: string;
  searchTerm: string;
  groups: { name: string; count: number }[];
  layouts: CatalogLayout[];
  activeGroup: string;
  activeLayout: CatalogLayout;
  filterTags: string[];
  onChange: (event: unknown, value?: string) => void;
  setActiveGroup: (group: string) => void;
  setActiveLayout: (layout: CatalogLayout) => void;
  setFilterTags: (tags: string[]) => void;
}

export const CatalogFilter: FunctionComponent<CatalogFilterProps> = (props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onClose = (tag: string) => {
    props.setFilterTags(props.filterTags.filter((savedTag) => savedTag !== tag));
  };

  return (
    <Form className={props.className}>
      <Grid hasGutter>
        <GridItem md={5} lg={6}>
          <FormGroup label="Filter" fieldId="search-term">
            <SearchInput
              aria-label="Filter by name, description or tag"
              placeholder="Filter by name, description or tag"
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
              {props.groups.map((tileGroup) => (
                <ToggleGroupItem
                  text={
                    <>
                      <span>{capitalize(tileGroup.name)}</span> <Badge isRead>{tileGroup.count}</Badge>
                    </>
                  }
                  key={tileGroup.name}
                  data-testid={`${tileGroup.name}-catalog-tab`}
                  buttonId={`toggle-group-button-${tileGroup.name}`}
                  isSelected={props.activeGroup === tileGroup.name}
                  onChange={() => {
                    props.setActiveGroup(tileGroup.name);
                    inputRef.current?.focus();
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
      <LabelGroup categoryName="Filtered tags" numLabels={10}>
        {props.filterTags.map((tag, index) => (
          <Label key={tag + index} id={tag + index} color="blue" onClose={() => onClose(tag)} isCompact>
            {tag}
          </Label>
        ))}
      </LabelGroup>
    </Form>
  );
};
