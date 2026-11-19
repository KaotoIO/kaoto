import { render, screen } from '@testing-library/react';

import { BrokenFileEmptyState } from './BrokenFileEmptyState';

describe('BrokenFileEmptyState', () => {
  it('renders the title and body text', () => {
    const { asFragment } = render(<BrokenFileEmptyState />);
    expect(screen.getByText('This file could not be parsed')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it('renders the parsedError message when provided', () => {
    const { asFragment } = render(<BrokenFileEmptyState parsedError="YAML parse error at line 4" />);
    expect(screen.getByTestId('broken-file-parse-error')).toBeInTheDocument();
    expect(asFragment()).toMatchSnapshot();
  });

  it('keeps the lines and the indentation of a multi-line error, so its caret points at the column', () => {
    const error = 'bad indent at line 2, column 3:\n  key: value\n  ^';
    render(<BrokenFileEmptyState parsedError={error} />);
    expect(screen.getByTestId('broken-file-parse-error').textContent).toBe(error);
  });

  it('announces the title, the explanation and the parser message as a status, with a decorative illustration', () => {
    render(<BrokenFileEmptyState parsedError="YAML parse error at line 4" />);
    const status = screen.getByRole('status');
    expect(status).toHaveTextContent('This file could not be parsed');
    expect(status).toHaveTextContent('Fix the syntax error in the file. The content is preserved.');
    expect(status).toHaveTextContent('YAML parse error at line 4');
    /* An image with an empty alt text has no role, so assistive technologies skip it */
    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });

  it('does not render the error pill when parsedError is not provided', () => {
    render(<BrokenFileEmptyState />);
    expect(screen.queryByTestId('broken-file-parse-error')).not.toBeInTheDocument();
  });
});
