import { act, render, screen, waitFor } from '@testing-library/react';

import { CatalogKind } from '../../models/catalog-kind';
import { IconResolver } from './IconResolver';
import { NodeIconResolver } from './node-icon-resolver';

jest.mock('./node-icon-resolver');

describe('IconResolver', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (NodeIconResolver.getIcon as jest.Mock).mockResolvedValue('mock-icon-url');
    (NodeIconResolver.getDefaultCamelIcon as jest.Mock).mockReturnValue('default-camel-icon-url');
  });

  describe('CatalogKind.Component', () => {
    it('should render component icon with default alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Component} name="kafka" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('component icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'mock-icon-url');
      });

      expect(NodeIconResolver.getIcon).toHaveBeenCalledWith('kafka', CatalogKind.Component);
    });

    it('should render component icon with custom alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Component} name="kafka" alt="Custom Kafka Icon" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('Custom Kafka Icon');
        expect(img).toBeInTheDocument();
      });
    });

    it('should apply custom className', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Component} name="kafka" className="custom-class" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('component icon');
        expect(img).toHaveClass('custom-class');
      });
    });
  });

  describe('CatalogKind.Kamelet', () => {
    it('should render kamelet icon with default alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Kamelet} name="aws-s3-source" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('Kamelet icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'mock-icon-url');
      });

      expect(NodeIconResolver.getIcon).toHaveBeenCalledWith('kamelet:aws-s3-source', CatalogKind.Kamelet);
    });

    it('should render kamelet icon with custom alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Kamelet} name="aws-s3-source" alt="Custom Kamelet Alt" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('Custom Kamelet Alt');
        expect(img).toBeInTheDocument();
      });
    });
  });

  describe('CatalogKind.Processor', () => {
    it('should render processor icon with default alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Processor} name="log" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('processor icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'mock-icon-url');
      });

      expect(NodeIconResolver.getIcon).toHaveBeenCalledWith('log', CatalogKind.Processor);
    });

    it('should render processor icon with custom alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Processor} name="log" alt="Log Processor" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('Log Processor');
        expect(img).toBeInTheDocument();
      });
    });
  });

  describe('CatalogKind.Pattern', () => {
    it('should render pattern icon with default alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Pattern} name="choice" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('pattern icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'mock-icon-url');
      });

      expect(NodeIconResolver.getIcon).toHaveBeenCalledWith('choice', CatalogKind.Pattern);
    });

    it('should render pattern icon with custom alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Pattern} name="choice" alt="Choice Pattern" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('Choice Pattern');
        expect(img).toBeInTheDocument();
      });
    });
  });

  describe('CatalogKind.Entity', () => {
    it('should render entity icon with default alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Entity} name="route" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('Entity icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'mock-icon-url');
      });

      expect(NodeIconResolver.getIcon).toHaveBeenCalledWith('route', CatalogKind.Entity);
    });

    it('should render entity icon with custom alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.Entity} name="route" alt="Route Entity" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('Route Entity');
        expect(img).toBeInTheDocument();
      });
    });
  });

  describe('CatalogKind.TestAction', () => {
    it('should render test action icon with default alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.TestAction} name="print" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('Test Action icon');
        expect(img).toBeInTheDocument();
        expect(img).toHaveAttribute('src', 'mock-icon-url');
      });

      expect(NodeIconResolver.getIcon).toHaveBeenCalledWith('print', CatalogKind.TestAction);
    });

    it('should render test action icon with custom alt text', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={CatalogKind.TestAction} name="delay" alt="Delay Action" />);
      });

      await waitFor(() => {
        const img = screen.getByAltText('Delay Action');
        expect(img).toBeInTheDocument();
      });
    });
  });

  describe('Default/Unknown CatalogKind', () => {
    it('should render default camel icon for unknown catalog kind', async () => {
      await act(async () => {
        render(<IconResolver catalogKind={'unknown' as CatalogKind} name="test" />);
      });

      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', 'default-camel-icon-url');
      expect(img).toBeInTheDocument();
      expect(NodeIconResolver.getDefaultCamelIcon).toHaveBeenCalled();
      expect(NodeIconResolver.getIcon).not.toHaveBeenCalled();
    });
  });
});
