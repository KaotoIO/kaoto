export class EditService {
  protected static instance: EditService | undefined;
  protected hashes: string[] = [];

  static getInstance(): EditService {
    if (!this.instance) {
      this.instance = new EditService();
    }

    return this.instance;
  }

  async registerEdit(content: string) {
    const hash = await this.hash(content);
    this.hashes.push(hash);
  }

  async isStaleEdit(content: string) {
    const hash = await this.hash(content);
    const doesExists = this.hashes.includes(hash);
    const isLastEdit = this.hashes[this.hashes.length - 1] === hash;

    return doesExists && !isLastEdit;
  }

  clearEdits() {
    this.hashes = [];
  }

  protected async hash(message: string) {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));

    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }
}
