import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { CommonHeader } from './CommonHeader';

describe('CommonHeader', () => {
  it('renders the title', () => {
    render(<CommonHeader title="Hello World" paragraphs={[]} />);
    expect(screen.getByRole('heading', { name: 'Hello World' })).toBeInTheDocument();
  });

  it('renders each paragraph', () => {
    const paragraphs = [
      { id: 'p1', content: 'First paragraph' },
      { id: 'p2', content: 'Second paragraph' },
    ];
    render(<CommonHeader title="Title" paragraphs={paragraphs} />);
    expect(screen.getByText('First paragraph')).toBeInTheDocument();
    expect(screen.getByText('Second paragraph')).toBeInTheDocument();
  });

  it('renders a ReactNode paragraph', () => {
    const paragraphs = [{ id: 'rich', content: <strong>Bold text</strong> }];
    render(<CommonHeader title="Title" paragraphs={paragraphs} />);
    expect(screen.getByText('Bold text')).toBeInTheDocument();
  });

  it('renders the logo image with alt text', () => {
    render(<CommonHeader title="Title" paragraphs={[]} />);
    expect(screen.getByAltText('fed-at-ibm logo')).toBeInTheDocument();
  });

  it('renders a header landmark', () => {
    render(<CommonHeader title="Title" paragraphs={[]} />);
    expect(screen.getByRole('banner')).toBeInTheDocument();
  });
});
