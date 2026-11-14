import './Breadcrumbs.scss';

import { Breadcrumb, BreadcrumbItem } from '@carbon/react';
import { Link } from 'react-router';

export interface BreadcrumbLink {
  label: string;
  href: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbLink[];
  current: string;
}

export const Breadcrumbs = ({ items, current }: BreadcrumbsProps) => {
  return (
    <Breadcrumb className="cs--breadcrumbs" noTrailingSlash>
      {/* Keyed by the trail up to the item: several items can link to the same page, e.g. the folders of a file */}
      {items.map((item, index) => (
        <BreadcrumbItem
          key={items
            .slice(0, index + 1)
            .map((trailItem) => trailItem.label)
            .join('/')}
        >
          <Link to={item.href}>{item.label}</Link>
        </BreadcrumbItem>
      ))}
      <BreadcrumbItem isCurrentPage>{current}</BreadcrumbItem>
    </Breadcrumb>
  );
};

// Made with Bob
