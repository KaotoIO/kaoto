import './ArrayFieldWrapper.scss';

import { Information } from '@carbon/icons-react';
import { Layer, Tile, Toggletip, ToggletipButton, ToggletipContent, useLayer } from '@carbon/react';
import { createContext, FunctionComponent, PropsWithChildren, ReactNode, useContext } from 'react';

import { capitalizeString } from '../../utils/capitalize-string';

/**
 * Carbon only has 3 layers and `<Layer>` clamps at the last one, so nested tiles would end up
 * with the same background as their inputs. This context keeps track of the layer used by the
 * closest wrapper so the next nested one can alternate between layers.
 */
const MAX_LAYER = 2;
const ArrayFieldLayerContext = createContext<number | undefined>(undefined);

interface FieldWrapperProps {
  propName: string;
  type: 'array' | 'object' | 'expression';
  title: string;
  description?: string;
  defaultValue?: unknown;
  actions?: ReactNode;
  required?: boolean;
}

export const ArrayFieldWrapper: FunctionComponent<PropsWithChildren<FieldWrapperProps>> = ({
  propName,
  type,
  title: rawTitle,
  description,
  defaultValue,
  actions,
  children,
  required,
}) => {
  const formatDefaultValue = (value: unknown): string => {
    if (value === undefined || value === null) return 'no default value';
    if (typeof value === 'string') return value;
    if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return String(value);
    return JSON.stringify(value) ?? '';
  };

  const title = capitalizeString(rawTitle);
  const shouldRenderChildren = Array.isArray(children) ? children.length > 0 : !!children;
  const { level } = useLayer();
  const parentLayer = useContext(ArrayFieldLayerContext) ?? level - 1;
  const childLayer = parentLayer >= MAX_LAYER ? MAX_LAYER - 1 : parentLayer + 1;

  return (
    <Tile data-testid={`${propName}__field-wrapper`} className="array-field-wrapper-tile">
      <div
        className={`array-field-wrapper-header ${
          shouldRenderChildren ? 'array-field-wrapper-header--with-children' : ''
        }`}
      >
        <div className="array-field-wrapper-title-section">
          <h4 className="cds--tile-heading array-field-wrapper-heading">
            {required && <span className="array-field-wrapper-required">*</span>}
            {title}
          </h4>
          <Toggletip align="top">
            <ToggletipButton label={`More info for ${title} field`}>
              <Information />
            </ToggletipButton>
            <ToggletipContent>
              <p>
                <strong>
                  {title} {`<${type}>`}
                </strong>
              </p>
              <p>{description}</p>
              <p>Default: {formatDefaultValue(defaultValue)}</p>
            </ToggletipContent>
          </Toggletip>
        </div>
        {actions && <div>{actions}</div>}
      </div>

      {shouldRenderChildren && (
        <Layer level={childLayer as 0 | 1 | 2}>
          <ArrayFieldLayerContext.Provider value={childLayer}>
            <div data-testid={`${propName}__children`} className="kaoto-form kaoto-form__label">
              {children}
            </div>
          </ArrayFieldLayerContext.Provider>
        </Layer>
      )}
    </Tile>
  );
};
