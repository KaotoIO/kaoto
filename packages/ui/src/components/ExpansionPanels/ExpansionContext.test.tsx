import { render, screen } from '@testing-library/react';
import { useContext } from 'react';

import { ExpansionContext } from './ExpansionContext';

describe('ExpansionContext', () => {
  describe('Default Implementation', () => {
    it('should provide a default context value', () => {
      const TestComponent = () => {
        const context = useContext(ExpansionContext);
        return <div data-testid="test">{context ? 'Context exists' : 'No context'}</div>;
      };

      render(<TestComponent />);

      expect(screen.getByTestId('test')).toHaveTextContent('Context exists');
    });

    it('should have register method that does nothing by default', () => {
      const TestComponent = () => {
        const context = useContext(ExpansionContext);
        const mockElement = document.createElement('div');

        // Should not throw
        expect(() => {
          context.register('test-id', 100, 200, mockElement, true);
        }).not.toThrow();

        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it('should have unregister method that does nothing by default', () => {
      const TestComponent = () => {
        const context = useContext(ExpansionContext);

        // Should not throw
        expect(() => {
          context.unregister('test-id');
        }).not.toThrow();

        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it('should have resize method that does nothing by default', () => {
      const TestComponent = () => {
        const context = useContext(ExpansionContext);

        // Should not throw
        expect(() => {
          context.resize('test-id', 300);
        }).not.toThrow();

        // Should not throw with optional isTopHandle parameter
        expect(() => {
          context.resize('test-id', 300, true);
        }).not.toThrow();

        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it('should have setExpanded method that does nothing by default', () => {
      const TestComponent = () => {
        const context = useContext(ExpansionContext);

        // Should not throw
        expect(() => {
          context.setExpanded('test-id', true);
        }).not.toThrow();

        expect(() => {
          context.setExpanded('test-id', false);
        }).not.toThrow();

        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it('should have queueLayoutChange method that does nothing by default', () => {
      const TestComponent = () => {
        const context = useContext(ExpansionContext);
        const mockCallback = jest.fn();

        // Should not throw
        expect(() => {
          context.queueLayoutChange(mockCallback);
        }).not.toThrow();

        // Callback should not be called by default implementation
        expect(mockCallback).not.toHaveBeenCalled();

        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it('should have registerLayoutCallback method that does nothing by default', () => {
      const TestComponent = () => {
        const context = useContext(ExpansionContext);
        const mockCallback = jest.fn();

        // Should not throw
        expect(() => {
          context.registerLayoutCallback('test-id', mockCallback);
        }).not.toThrow();

        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it('should have unregisterLayoutCallback method that does nothing by default', () => {
      const TestComponent = () => {
        const context = useContext(ExpansionContext);

        // Should not throw
        expect(() => {
          context.unregisterLayoutCallback('test-id');
        }).not.toThrow();

        return <div>Test</div>;
      };

      render(<TestComponent />);
    });

    it('should allow multiple method calls without errors', () => {
      const TestComponent = () => {
        const context = useContext(ExpansionContext);
        const mockElement = document.createElement('div');
        const mockCallback = jest.fn();

        // Should not throw when calling multiple methods in sequence
        expect(() => {
          context.register('panel-1', 100, 200, mockElement, true);
          context.setExpanded('panel-1', false);
          context.resize('panel-1', 150);
          context.registerLayoutCallback('panel-1', mockCallback);
          context.queueLayoutChange(mockCallback);
          context.unregisterLayoutCallback('panel-1');
          context.unregister('panel-1');
        }).not.toThrow();

        return <div>Test</div>;
      };

      render(<TestComponent />);
    });
  });

  describe('Context Provider Override', () => {
    it('should allow custom context values to override defaults', () => {
      const mockRegister = jest.fn();
      const mockUnregister = jest.fn();
      const mockResize = jest.fn();
      const mockSetExpanded = jest.fn();
      const mockQueueLayoutChange = jest.fn();
      const mockRegisterLayoutCallback = jest.fn();
      const mockUnregisterLayoutCallback = jest.fn();

      const customContextValue = {
        register: mockRegister,
        unregister: mockUnregister,
        resize: mockResize,
        setExpanded: mockSetExpanded,
        queueLayoutChange: mockQueueLayoutChange,
        registerLayoutCallback: mockRegisterLayoutCallback,
        unregisterLayoutCallback: mockUnregisterLayoutCallback,
      };

      const TestComponent = () => {
        const context = useContext(ExpansionContext);
        const mockElement = document.createElement('div');
        const mockCallback = jest.fn();

        context.register('test-id', 100, 200, mockElement, true);
        context.unregister('test-id');
        context.resize('test-id', 300);
        context.setExpanded('test-id', true);
        context.queueLayoutChange(mockCallback);
        context.registerLayoutCallback('test-id', mockCallback);
        context.unregisterLayoutCallback('test-id');

        return <div>Test</div>;
      };

      render(
        <ExpansionContext.Provider value={customContextValue}>
          <TestComponent />
        </ExpansionContext.Provider>,
      );

      expect(mockRegister).toHaveBeenCalledWith('test-id', 100, 200, expect.any(HTMLDivElement), true);
      expect(mockUnregister).toHaveBeenCalledWith('test-id');
      expect(mockResize).toHaveBeenCalledWith('test-id', 300);
      expect(mockSetExpanded).toHaveBeenCalledWith('test-id', true);
      expect(mockQueueLayoutChange).toHaveBeenCalledWith(expect.any(Function));
      expect(mockRegisterLayoutCallback).toHaveBeenCalledWith('test-id', expect.any(Function));
      expect(mockUnregisterLayoutCallback).toHaveBeenCalledWith('test-id');
    });
  });
});
