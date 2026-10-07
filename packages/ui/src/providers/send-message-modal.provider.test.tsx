import { act, renderHook } from '@testing-library/react';
import { PropsWithChildren } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { SendMessageModalProvider, useSendMessageModal } from './send-message-modal.provider';

describe('SendMessageModalProvider & useSendMessageModal', () => {
  const wrapper = ({ children }: PropsWithChildren) => <SendMessageModalProvider>{children}</SendMessageModalProvider>;

  it('returns undefined if useSendMessageModal is used outside of SendMessageModalProvider', () => {
    const { result } = renderHook(() => useSendMessageModal());
    expect(result.current).toBeUndefined();
  });

  it('provides initial state', () => {
    const { result } = renderHook(() => useSendMessageModal(), { wrapper });

    expect(result.current?.isOpen).toBe(false);
    expect(result.current?.options).toBeNull();
    expect(result.current?.isSending).toBe(false);
    expect(result.current?.error).toBeNull();
  });

  it('opens and closes the modal', () => {
    const { result } = renderHook(() => useSendMessageModal(), { wrapper });

    act(() => {
      result.current?.openSendMessageModal({ endpoint: 'direct:start', title: 'Test Title' });
    });

    expect(result.current?.isOpen).toBe(true);
    expect(result.current?.options).toEqual({ endpoint: 'direct:start', title: 'Test Title' });

    act(() => {
      result.current?.closeSendMessageModal();
    });

    expect(result.current?.isOpen).toBe(false);
    expect(result.current?.options).toBeNull();
  });

  it('keeps the three most recently used files across dialogs and promotes reused files', () => {
    const { result } = renderHook(() => useSendMessageModal(), { wrapper });
    const files = ['one.json', 'two.json', 'three.json', 'four.json'].map(
      (name) => new File(['message'], name, { lastModified: 1 }),
    );
    expect(result.current?.recentMessageFiles).toEqual([]);
    act(() => {
      files.forEach((file) => result.current?.rememberMessageFile(file));
      result.current?.openSendMessageModal({ endpoint: 'direct:first' });
      result.current?.closeSendMessageModal();
      result.current?.openSendMessageModal({ endpoint: 'direct:second' });
    });
    expect(result.current?.recentMessageFiles).toEqual([files[3], files[2], files[1]]);
    const reused = new File(['message'], 'two.json', { lastModified: 1 });
    act(() => result.current?.rememberMessageFile(reused));
    expect(result.current?.recentMessageFiles).toEqual([reused, files[3], files[2]]);
  });

  it('does not share recent files between provider sessions', () => {
    const first = renderHook(() => useSendMessageModal(), { wrapper });
    act(() => first.result.current?.rememberMessageFile(new File(['message'], 'one.json')));
    const second = renderHook(() => useSendMessageModal(), { wrapper });
    expect(second.result.current?.recentMessageFiles).toEqual([]);
  });

  it('sends message successfully and closes modal', async () => {
    const mockOnSend = vi.fn().mockResolvedValue(undefined);
    const { result } = renderHook(() => useSendMessageModal(), { wrapper });

    act(() => {
      result.current?.openSendMessageModal({
        endpoint: 'direct:start',
        onSend: mockOnSend,
      });
    });

    await act(async () => {
      await result.current?.sendMessage({
        endpoint: 'direct:start',
        body: 'hello world',
      });
    });

    expect(mockOnSend).toHaveBeenCalledWith({
      endpoint: 'direct:start',
      body: 'hello world',
    });
    expect(result.current?.isOpen).toBe(false);
    expect(result.current?.isSending).toBe(false);
    expect(result.current?.error).toBeNull();
  });

  it('handles send error properly', async () => {
    const mockOnSend = vi.fn().mockRejectedValue(new Error('Network error'));
    const { result } = renderHook(() => useSendMessageModal(), { wrapper });

    act(() => {
      result.current?.openSendMessageModal({
        endpoint: 'direct:start',
        onSend: mockOnSend,
      });
    });

    await act(async () => {
      try {
        await result.current?.sendMessage({
          endpoint: 'direct:start',
          body: 'hello world',
        });
      } catch {
        // Expected error
      }
    });

    expect(result.current?.isOpen).toBe(true);
    expect(result.current?.isSending).toBe(false);
    expect(result.current?.error).toBe('Network error');
  });
});
