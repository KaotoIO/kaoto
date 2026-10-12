import { Node } from '@patternfly/react-topology';
import { action, makeObservable, observable } from 'mobx';

import { IVisualizationNode, NodeToolbarTrigger } from '../../../../models';
import { CanvasDefaults } from '../canvas.defaults';

export interface CanvasToolbarTarget {
  element: Node;
  vizNode: IVisualizationNode;
  isCollapsed: boolean;
  onCollapseToggle?: () => void;
}

/** One owner and one pair of timers per canvas, shared by nodes and expanded groups. */
export class CanvasToolbarStore {
  target: CanvasToolbarTarget | undefined;
  private pending: CanvasToolbarTarget | undefined;
  private hovered: Node | undefined;
  private toolbarHovered = false;
  private toolbarFocused = false;
  private enterTimer: ReturnType<typeof setTimeout> | undefined;
  private leaveTimer: ReturnType<typeof setTimeout> | undefined;

  constructor(public trigger: NodeToolbarTrigger) {
    makeObservable(this, {
      target: observable.ref,
      trigger: observable,
      update: action,
      remove: action,
      setTrigger: action,
      dispose: action,
    });
  }

  setTrigger(trigger: NodeToolbarTrigger) {
    if (this.trigger !== trigger) {
      this.dispose();
      this.trigger = trigger;
    }
  }

  update(target: CanvasToolbarTarget, selected: boolean) {
    if (this.pending?.element === target.element) this.pending = target;
    if (this.trigger === NodeToolbarTrigger.onSelection) {
      if (selected) this.target = target;
      else if (this.target?.element === target.element) this.target = undefined;
    } else if (this.target?.element === target.element) {
      this.target = target;
    }
  }

  enter(target: CanvasToolbarTarget) {
    if (this.trigger !== NodeToolbarTrigger.onHover) return;
    this.hovered = target.element;
    this.cancelTimers();
    if (this.toolbarHovered || this.toolbarFocused || this.target?.element === target.element) return;
    this.pending = target;
    this.enterTimer = setTimeout(
      action(() => {
        this.target = this.pending;
        this.pending = undefined;
        this.enterTimer = undefined;
      }),
      CanvasDefaults.TOOLBAR_HOVER_DELAY_MS,
    );
  }

  leave(target: CanvasToolbarTarget) {
    // A delayed leave from the previous owner cannot close the new owner's toolbar.
    if (this.hovered !== target.element) return;
    this.hovered = undefined;
    this.cancelTimers();
    this.scheduleDismissal();
  }

  enterToolbar() {
    this.toolbarHovered = true;
    this.cancelTimers();
  }

  leaveToolbar() {
    this.toolbarHovered = false;
    this.scheduleDismissal();
  }

  focusToolbar() {
    this.toolbarFocused = true;
    this.cancelTimers();
  }

  blurToolbar() {
    this.toolbarFocused = false;
    this.scheduleDismissal();
  }

  remove(element: Node) {
    if (this.pending?.element === element) this.cancelTimers();
    if (this.hovered === element) {
      this.hovered = undefined;
      this.scheduleDismissal();
    }
    if (this.target?.element === element) {
      this.target = undefined;
      this.toolbarHovered = false;
      this.toolbarFocused = false;
    }
  }

  dispose() {
    this.cancelTimers();
    this.target = undefined;
    this.hovered = undefined;
    this.toolbarHovered = false;
    this.toolbarFocused = false;
  }

  private cancelTimers() {
    clearTimeout(this.enterTimer);
    clearTimeout(this.leaveTimer);
    this.enterTimer = undefined;
    this.leaveTimer = undefined;
    this.pending = undefined;
  }

  private scheduleDismissal() {
    if (
      this.trigger !== NodeToolbarTrigger.onHover ||
      this.toolbarHovered ||
      this.toolbarFocused ||
      this.hovered === this.target?.element
    )
      return;
    clearTimeout(this.leaveTimer);
    this.leaveTimer = setTimeout(
      action(() => {
        this.target = undefined;
        this.leaveTimer = undefined;
      }),
      CanvasDefaults.TOOLBAR_DISMISS_DELAY_MS,
    );
  }
}
