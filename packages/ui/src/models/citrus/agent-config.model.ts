export class AgentConfigModel {
  engine?: string;
  port?: number;
  workDir?: string;
  configClass?: string;

  testSources: TestSource[] = [];
  defaultProperties = new Map<string, string>();

  testJar?: string;
  timeToLive?: number;
  includes: string[] = [];
  packages: string[] = [];
  skipTests: boolean = false;
  systemExit: boolean = false;
  verbose: boolean = true;
  reset: boolean = true;

  constructor(options: Partial<AgentConfigModel> = {}) {
    Object.assign(this, options);
  }
}

export class TestSource {
  type?: string;
  name?: string;
  filePath?: string;
}
