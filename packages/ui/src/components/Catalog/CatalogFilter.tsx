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
import { TimesCircleIcon } from '@patternfly/react-icons';

interface CatalogFilterProps {
  className?: string;
  searchTerm: string;
  groups: { name: string; count: number }[];
  tags: string[];
  tagsOverflowIndex: number;
  layouts: CatalogLayout[];
  activeGroups: string[];
  activeLayout: CatalogLayout;
  filterTags: string[];
  onChange: (event: unknown, value?: string) => void;
  setActiveGroups: (groups: string[]) => void;
  setActiveLayout: (layout: CatalogLayout) => void;
  setFilterTags: (tags: string[]) => void;
}

export const CatalogFilter: FunctionComponent<CatalogFilterProps> = (props) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const onToggleTag = (tag: string) => {
    const isToggled = props.filterTags.includes(tag);

    props.setFilterTags(
      isToggled ? props.filterTags.filter((savedTag) => savedTag !== tag) : props.filterTags.concat(tag),
    );
  };

  const handleClearFilterTags = () => {
    props.setFilterTags([]);
  };

  const toggleActiveGroup = (selected: boolean, group: string) => {
    if (selected && !props.activeGroups.includes(group)) {
      props.activeGroups.push(group);
      props.setActiveGroups([...props.activeGroups]);
    } else if (!selected && props.activeGroups.includes(group)) {
      props.activeGroups.splice(props.activeGroups.indexOf(group), 1);
      props.setActiveGroups([...props.activeGroups]);
    }
    inputRef.current?.focus();
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
                  isSelected={props.activeGroups.includes(tileGroup.name)}
                  onChange={(_event, selected: boolean) => toggleActiveGroup(selected, tileGroup.name)}
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
      <LabelGroup
        categoryName={'Filter Categories'}
        numLabels={props.filterTags.length > 0 ? props.tagsOverflowIndex + 1 : props.tagsOverflowIndex}
      >
        {props.filterTags.length > 0 && (
          <Label
            key="clear"
            id="clear"
            color="grey"
            variant="filled"
            onClick={handleClearFilterTags}
            icon={<TimesCircleIcon />}
          >
            <b>Clear</b>
          </Label>
        )}
        {props.tags.map((tag, index) => (
          <Label
            key={tag + index}
            id={tag + index}
            data-testid={`button-catalog-tag-${tag}`}
            color={props.filterTags.includes(tag) ? 'blue' : 'grey'}
            onClick={() => onToggleTag(tag)}
            variant={props.filterTags.includes(tag) ? 'filled' : 'outline'}
          >
            {props.filterTags.includes(tag) ? <b>{tag}</b> : <>{tag}</>}
          </Label>
        ))}
      </LabelGroup>
    </Form>
  );
};
