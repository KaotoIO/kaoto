import { Layer, Menu, MenuItem, MenuItemGroup, MenuItemSelectable, Search } from '@carbon/react';
import { JSONSchema4 } from 'json-schema';
import {
  ReactNode,
  RefObject,
  useCallback,
  useContext,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  ChangeEvent,
} from 'react';
import { GroupedSuggestions, Suggestion, SuggestionProvider } from '../models/suggestions';
import { SuggestionContext } from '../providers';
import { applySuggestion } from '../utils/apply-suggestion';
import { getCursorWord } from '../utils/get-cursor-word';

type UseSuggestionsProps = {
  propName: string;
  schema: JSONSchema4;
  inputRef: RefObject<HTMLInputElement | HTMLTextAreaElement | null>;
  value: string | number;
  setValue?: (value: string) => void;
};

type UseSuggestionsReturn = {
  suggestionsMenu: ReactNode;
  openSuggestions: () => void;
};

export const useSuggestions = ({
  propName,
  schema,
  inputRef,
  value,
  setValue,
}: UseSuggestionsProps): UseSuggestionsReturn => {
  const menuId = `${propName}-${useId()}`;
  const [searchValue, setSearchValue] = useState('');
  const [groupedSuggestions, setGroupedSuggestions] = useState<GroupedSuggestions>({ root: [] });
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const firstElementRef = useRef<HTMLLIElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const { getProviders, currentOpenMenu, setCurrentOpenMenu } = useContext(SuggestionContext);

  const isVisible = currentOpenMenu === menuId;

  const suggestionProviders: SuggestionProvider[] = useMemo(
    () => getProviders(propName, schema),
    [getProviders, propName, schema],
  );

  const onEscapeKey = useCallback(
    (event: React.KeyboardEvent | KeyboardEvent) => {
      event.preventDefault();
      setCurrentOpenMenu(null);
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    },
    [inputRef, setCurrentOpenMenu],
  );

  const handleInputKeyDown = useCallback(
    (event: Event) => {
      if (!(event instanceof KeyboardEvent)) return;

      if ((event.ctrlKey && event.code === 'Space') || (event.altKey && event.code === 'Escape')) {
        event.preventDefault();
        setSearchValue('');
        setCurrentOpenMenu(menuId);
      } else if (event.key === 'Escape') {
        onEscapeKey(event);
      }
    },
    [onEscapeKey, setCurrentOpenMenu, menuId],
  );

  const getHandleOnClick = useCallback(
    (inputValue: string | number, suggestion: Suggestion) => () => {
      const { newValue, cursorPosition } = applySuggestion(suggestion, inputValue, inputRef.current?.selectionStart);

      setCurrentOpenMenu(null);
      setValue?.(newValue);

      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursorPosition, cursorPosition);
    },
    [inputRef, setValue, setCurrentOpenMenu],
  );

  const getHandleMenuKeyDown = useCallback(
    (inputValue: string | number, suggestion?: Suggestion, isFirst?: boolean) => (event: React.KeyboardEvent) => {
      if (event.key === 'Enter' && suggestion) {
        event.preventDefault();
        getHandleOnClick(inputValue, suggestion)();
      } else if (event.key === 'Escape') {
        onEscapeKey(event);
      }
    },
    [getHandleOnClick, onEscapeKey],
  );

  /** Fetch suggestions from providers */
  useEffect(() => {
    let cancelled = false;
    if (!isVisible) return;

    const fetchSuggestions = async () => {
      const cursorPosition = inputRef.current?.selectionStart;
      const { word } = getCursorWord(value, cursorPosition);

      const results = await Promise.all(
        suggestionProviders.map((provider) =>
          Promise.resolve(
            provider.getSuggestions(word, {
              propertyName: propName,
              inputValue: value,
              cursorPosition,
            }),
          ),
        ),
      );

      if (cancelled) return;

      const lowerCaseSearchValue = searchValue.toLocaleLowerCase();
      const newGroupedSuggestions = results
        .flat()
        .filter((suggestion) => {
          return suggestion.value.toLocaleLowerCase().includes(lowerCaseSearchValue);
        })
        .reduce(
          (acc, suggestion) => {
            const group = suggestion.group ?? 'root';
            acc[group] ??= [];
            acc[group].push(suggestion);
            return acc;
          },
          { root: [] } as GroupedSuggestions,
        );
      setGroupedSuggestions(newGroupedSuggestions);
    };

    fetchSuggestions();
    return () => {
      cancelled = true;
    };
  }, [suggestionProviders, value, propName, inputRef, isVisible, searchValue]);

  const focusOnSearchInput = useCallback(() => {
    searchInputRef.current?.focus();
  }, []);

  const handleOnSearchChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    event.stopPropagation();
    setSearchValue(event.target.value);
  }, []);

  const handleSearchKeyDown = useCallback(
    (event: React.KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        firstElementRef.current?.focus();
        return;
      }

      if (event.key !== 'Escape' && event.key !== 'Enter') {
        event.stopPropagation();
      }
      if (event.key === 'Escape') {
        onEscapeKey(event);
      }
    },
    [onEscapeKey],
  );

  const openSuggestions = useCallback(() => {
    const input = inputRef.current;
    if (input?.disabled || input?.readOnly) return;

    setSearchValue('');
    setCurrentOpenMenu((prev) => (prev === menuId ? null : menuId));
  }, [menuId, setCurrentOpenMenu, inputRef]);

  /** Register keyboard bindings and double-click handler */
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const handleFocus = () => {
      input.addEventListener('keydown', handleInputKeyDown);
    };
    const handleBlur = () => {
      input.removeEventListener('keydown', handleInputKeyDown);
    };

    input.addEventListener('focus', handleFocus);
    input.addEventListener('blur', handleBlur);
    input.addEventListener('dblclick', openSuggestions);

    // If already focused, register immediately
    if (document.activeElement === input) {
      handleFocus();
    }

    return () => {
      input.removeEventListener('focus', handleFocus);
      input.removeEventListener('blur', handleBlur);
      input.removeEventListener('keydown', handleInputKeyDown);
      input.removeEventListener('dblclick', openSuggestions);
    };
  }, [handleInputKeyDown, inputRef, openSuggestions]);

  useEffect(() => {
    if (!isVisible || !inputRef.current) return;

    const inputElement = inputRef.current;
    const rect = inputElement.getBoundingClientRect();

    setMenuPosition({
      top: rect.bottom + window.scrollY,
      left: rect.left + window.scrollX,
    });

    /** Use setTimeout to ensure focus happens after Carbon Menu's initialization */
    const focusTimeout = setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);

    return () => clearTimeout(focusTimeout);
  }, [isVisible, inputRef, groupedSuggestions]);

  const suggestionsMenu = isVisible ? (
    <Layer level={1}>
      <div ref={menuRef} data-testid="suggestions-menu">
        <Menu
          style={{
            position: 'absolute',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
          }}
          x={menuPosition.left}
          y={menuPosition.top}
          open
          label="Suggestions"
        >
          <Search
            data-testid="suggestions-menu-search-input"
            ref={searchInputRef}
            placeholder="Filter suggestions..."
            value={searchValue}
            onChange={handleOnSearchChange}
            onKeyDown={handleSearchKeyDown}
            labelText=""
            size="sm"
            onFocus={focusOnSearchInput}
          />
          {Object.entries(groupedSuggestions).map(([group, suggestions], groupIndex) => {
            if (suggestions.length === 0) return null;

            if (group === 'root') {
              return suggestions.map((suggestion, suggestionIndex) => {
                const isFirst = groupIndex === 0 && suggestionIndex === 0;
                return (
                  <MenuItem
                    ref={isFirst ? firstElementRef : null}
                    key={suggestion.value}
                    label={String(suggestion.value)}
                    aria-label={String(suggestion.value)}
                    onClick={getHandleOnClick(value, suggestion)}
                    onKeyDown={getHandleMenuKeyDown(value, suggestion, isFirst)}
                  />
                );
              });
            } else {
              return (
                <MenuItem label={group} key={group} title={group}>
                  {suggestions.map((suggestion, suggestionIndex) => {
                    const isFirst = groupIndex === 0 && suggestionIndex === 0;
                    return (
                      <MenuItem
                        ref={isFirst ? firstElementRef : null}
                        key={suggestion.value}
                        label={String(suggestion.value)}
                        aria-label={String(suggestion.value)}
                        onClick={getHandleOnClick(value, suggestion)}
                        onKeyDown={getHandleMenuKeyDown(value, suggestion, isFirst)}
                      />
                    );
                  })}
                </MenuItem>
              );
            }
          })}

          {groupedSuggestions.root.length === 0 && Object.keys(groupedSuggestions).length === 1 && (
            <MenuItem label="No suggestions available" disabled />
          )}
        </Menu>
      </div>
    </Layer>
  ) : null;

  return {
    suggestionsMenu,
    openSuggestions,
  };
};
