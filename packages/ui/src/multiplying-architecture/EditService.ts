export class EditService {
  protected static instance: EditService | undefined;
  protected hashes: string[] = [];
  protected history: string[] = [];
  protected historyIndex = -1;
  protected performingUndoRedo = false;

  static getInstance(): EditService {
    if (!this.instance) {
      this.instance = new EditService();
    }

    return this.instance;
  }

  async registerEdit(content: string) {
    const hash = await this.hash(content);
    // Maintain hash list for stale detection
    this.hashes.push(hash);

    // Maintain history for undo/redo
    const lastContent = this.history[this.historyIndex];
    if (lastContent === content) {
      return;
    }

    // If we are not at the end of the history, drop everything after the current index
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    this.history.push(content);
    this.historyIndex = this.history.length - 1;
  }

  async isStaleEdit(content: string) {
    const hash = await this.hash(content);
    const doesExists = this.hashes.includes(hash);
    const isLastEdit = this.hashes[this.hashes.length - 1] === hash;

    return doesExists && !isLastEdit;
  }

  clearEdits() {
    this.hashes = [];
    this.history = [];
    this.historyIndex = -1;
    this.performingUndoRedo = false;
  }

  beginUndoRedo() {
    this.performingUndoRedo = true;
  }

  endUndoRedo() {
    this.performingUndoRedo = false;
  }

  isPerformingUndoRedo() {
    return this.performingUndoRedo;
  }

  canUndo(): boolean {
    return this.historyIndex > 0;
  }

  canRedo(): boolean {
    return this.historyIndex >= 0 && this.historyIndex < this.history.length - 1;
  }

  /**
   * Move the history pointer back and return the previous content if possible
   */
  undo(): string | undefined {
    if (this.historyIndex <= 0) {
      return undefined;
    }
    this.historyIndex -= 1;
    return this.history[this.historyIndex];
  }

  /**
   * Move the history pointer forward and return the next content if possible
   */
  redo(): string | undefined {
    if (this.historyIndex < 0 || this.historyIndex >= this.history.length - 1) {
      return undefined;
    }
    this.historyIndex += 1;
    return this.history[this.historyIndex];
  }

  protected async hash(message: string) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
