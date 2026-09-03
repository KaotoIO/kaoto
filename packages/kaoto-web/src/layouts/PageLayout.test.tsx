import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { PageLayout } from './PageLayout';

describe('PageLayout', () => {
  it('renders children inside the content body', () => {
    render(
      <PageLayout>
        <p>Body content</p>
      </PageLayout>,
    );
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('renders a PageLayout.Header separately from body children', () => {
    render(
      <PageLayout>
        <PageLayout.Header>
          <h1>Page heading</h1>
        </PageLayout.Header>
        <p>Body content</p>
      </PageLayout>,
    );
    expect(screen.getByText('Page heading')).toBeInTheDocument();
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('applies the className to the outer wrapper', () => {
    const { container } = render(<PageLayout className="my-class">content</PageLayout>);
    expect(container.querySelector('.cs--page-layout.my-class')).toBeInTheDocument();
  });

  it('renders the fallback during Suspense', async () => {
    const LazyChild = () => {
      throw new Promise<void>(() => undefined);
    };
    render(
      <PageLayout fallback={<p>Loading...</p>}>
        <LazyChild />
      </PageLayout>,
    );
    expect(await screen.findByText('Loading...')).toBeInTheDocument();
  });

  it('renders multiple non-header children', () => {
    render(
      <PageLayout>
        <p>First</p>
        <p>Second</p>
      </PageLayout>,
    );
    expect(screen.getByText('First')).toBeInTheDocument();
    expect(screen.getByText('Second')).toBeInTheDocument();
  });
});
