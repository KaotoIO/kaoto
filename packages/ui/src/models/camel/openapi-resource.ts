export interface OpenApi {
  openapi: string;
  info: {
    title: string;
    description: string;
    termsOfService: string;
    contact: {
      email: string;
    };
    license: {
      name: string;
      url: string;
    };
  };
  version: string;
  externalDocs: {
    description: string;
    url: string;
  };
  tags: [
    {
      name: string;
      description: string;
    },
  ];
  paths: Path[];
}

export interface Path {
  [path: string]: Method[];
}

export interface Method {
  [method: string]: {
    operationId: string;
  };
}
