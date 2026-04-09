import { act, render, screen } from '@testing-library/react';
import { Suspense } from 'react';

import { CatalogKind } from '../../models/catalog-kind';
import { getIconRequest } from './getIconRequest';
import { IconResolver } from './IconResolver';

jest.mock('./getIconRequest');

describe('IconResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the resolved icon and alt text', async () => {
    (getIconRequest as jest.Mock).mockResolvedValue({
      icon: 'mock-icon-url',
      alt: 'component icon',
    });

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <IconResolver catalogKind={CatalogKind.Component} name="kafka" />
        </Suspense>,
      );
    });

    const img = await screen.findByAltText('component icon');
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute('src', 'mock-icon-url');
    expect(getIconRequest).toHaveBeenCalledWith(CatalogKind.Component, 'kafka', undefined);
  });

  it('should render a custom alt text', async () => {
    (getIconRequest as jest.Mock).mockResolvedValue({
      icon: 'mock-icon-url',
      alt: 'Custom Kafka Icon',
    });

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <IconResolver catalogKind={CatalogKind.Component} name="kafka" alt="Custom Kafka Icon" />
        </Suspense>,
      );
    });

    const img = await screen.findByAltText('Custom Kafka Icon');
    expect(img).toBeInTheDocument();
  });

  it('should apply the provided className', async () => {
    (getIconRequest as jest.Mock).mockResolvedValue({
      icon: 'mock-icon-url',
      alt: 'component icon',
    });

    await act(async () => {
      render(
        <Suspense fallback={null}>
          <IconResolver catalogKind={CatalogKind.Component} name="kafka" className="custom-class" />
        </Suspense>,
      );
    });

    const img = await screen.findByAltText('component icon');
    expect(img).toHaveClass('custom-class');
  });

  it('should render the suspense fallback while the icon request is pending', () => {
    (getIconRequest as jest.Mock).mockReturnValue(new Promise(() => undefined));

    render(
      <Suspense fallback={<div>Loading...</div>}>
        <IconResolver catalogKind={CatalogKind.Component} name="kafka" />
      </Suspense>,
    );

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
