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
      {items.map((item) => (
        <BreadcrumbItem key={item.href}>
          <Link to={item.href}>{item.label}</Link>
        </BreadcrumbItem>
      ))}
      <BreadcrumbItem isCurrentPage>{current}</BreadcrumbItem>
    </Breadcrumb>
  );
};

// Made with Bob
