import { KeyboardEvent } from 'react';

export function handleNodeKeyDown(event: KeyboardEvent, callback: () => void): void {
  if (event.target !== event.currentTarget) return;
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault();
    callback();
    event.stopPropagation();
  }
}
