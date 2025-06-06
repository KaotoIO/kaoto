import { Component, ComponentClass, HTMLProps, SVGProps } from 'react';

export interface IconDefinition {
  name?: string;
  width: number;
  height: number;
  svgPath: string;
  xOffset?: number;
  yOffset?: number;
  transform?: string;
}

export interface SVGIconProps extends Omit<HTMLProps<SVGElement>, 'ref'> {
  title?: string;
  className?: string;
}

let currentId = 0;

/**
 * Copied from @patternfly/react-icons
 * Factory to create Icon class components for consumers
 */
export function createIcon({
  name,
  xOffset = 0,
  yOffset = 0,
  transform,
  width,
  height,
  svgPath,
}: IconDefinition): ComponentClass<SVGIconProps> {
  return class SVGIcon extends Component<SVGIconProps> {
    static readonly displayName = name;

    id = `icon-title-${currentId++}`;

    render() {
      const { title, className, ...props } = this.props;
      const classes = className ? `pf-v6-svg ${className}` : 'pf-v6-svg';

      const hasTitle = Boolean(title);
      const viewBox = [xOffset, yOffset, width, height].join(' ');

      return (
        <svg
          className={classes}
          viewBox={viewBox}
          fill="currentColor"
          aria-labelledby={hasTitle ? this.id : undefined}
          aria-hidden={hasTitle ? undefined : true}
          transform={transform}
          width="1em"
          height="1em"
          {...(props as Omit<SVGProps<SVGElement>, 'ref'>)} // Lie.
        >
          {hasTitle && <title id={this.id}>{title}</title>}
          <path d={svgPath} />
        </svg>
      );
    }
  };
}
