// vite.config.js
import react from "file:///C:/Users/LordR/repos/kaoto/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { defineConfig } from "file:///C:/Users/LordR/repos/kaoto/node_modules/vite/dist/node/index.js";
import { viteStaticCopy } from "file:///C:/Users/LordR/repos/kaoto/node_modules/vite-plugin-static-copy/dist/index.js";

// scripts/get-camel-catalog-files.js
import { readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { normalizePath } from "file:///C:/Users/LordR/repos/kaoto/node_modules/vite/dist/node/index.js";
var __vite_injected_original_import_meta_url = "file:///C:/Users/LordR/repos/kaoto/packages/ui/scripts/get-camel-catalog-files.js";
var require2 = createRequire(__vite_injected_original_import_meta_url);
var getCamelCatalogFiles = () => {
  let camelCatalogPath = "";
  try {
    const camelCatalogIndexJsonPath = require2.resolve("@kaoto/camel-catalog/index.json");
    camelCatalogPath = normalizePath(dirname(camelCatalogIndexJsonPath));
  } catch (error) {
    throw new Error(`Could not find '@kaoto/camel-catalog' 

 ${error}`);
  }
  console.info(`Found '@kaoto/camel-catalog' in ${camelCatalogPath}`, "\n");
  try {
    if (readdirSync(camelCatalogPath).length === 0) {
      throw new Error();
    }
  } catch (error) {
    const message = [
      `The '${camelCatalogPath}' folder is empty.`,
      "No files found in the Camel Catalog directory.",
      "Please run `yarn workspace @kaoto/camel-catalog run build`",
      "or `yarn build` in the `@kaoto/camel-catalog` package"
    ];
    throw new Error(message.join("\n\n"));
  }
  const jsonFiles = readdirSync(camelCatalogPath).filter((file) => file.endsWith(".json")).map((file) => normalizePath(join(camelCatalogPath, file)));
  return jsonFiles;
};

// scripts/get-last-commit-info.js
import simpleGit from "file:///C:/Users/LordR/repos/kaoto/node_modules/simple-git/dist/esm/index.js";
async function getLastCommitInfo() {
  return new Promise((resolve, reject) => {
    simpleGit().log({ n: 1 }, (err, status) => {
      if (err || !status.latest || status.latest === null) {
        reject(err);
      } else {
        resolve(status.latest);
      }
    });
  });
}

// package.json
var package_default = {
  name: "@kaoto/kaoto",
  version: "2.0.0-dev",
  type: "module",
  description: "Kaoto UI",
  repository: "https://github.com/KaotoIO/kaoto",
  repositoryDirectory: "packages/ui",
  author: "The Kaoto Team",
  publishConfig: {
    access: "public"
  },
  license: "Apache License v2.0",
  types: "./lib/esm/public-api.d.ts",
  module: "./lib/esm/public-api.js",
  main: "./lib/cjs/public-api.js",
  exports: {
    ".": {
      import: "./lib/esm/public-api.js",
      require: "./lib/cjs/public-api.js"
    },
    "./testing": {
      import: "./lib/esm/testing-api.js",
      require: "./lib/cjs/testing-api.js"
    }
  },
  files: [
    "lib"
  ],
  scripts: {
    start: "vite",
    build: "tsc && vite build --config vite.config.js",
    "build:lib": "yarn rimraf ./lib && yarn copy-catalog && yarn build:esm && yarn build:cjs && yarn write-version",
    "build:esm": "tsc --project tsconfig.esm.json && copyfiles -u 1 './src/**/*.scss' './src/assets/**' ./lib/esm",
    "build:cjs": "tsc --project tsconfig.cjs.json && copyfiles -u 1 './src/**/*.scss' './src/assets/**' ./lib/cjs",
    "write-version": "node ./scripts/write-version-file.js",
    "copy-catalog": "node ./scripts/copy-camel-catalog-files.js ./lib/camel-catalog",
    preview: "vite preview",
    test: "jest",
    "test:watch": "jest --watch",
    lint: 'yarn eslint "src/**/*.{ts,tsx}"',
    "lint:fix": "yarn lint --fix",
    "lint:style": 'yarn stylelint "src/**/*.{css,scss}"',
    "lint:style:fix": "yarn lint:style --fix"
  },
  dependencies: {
    "@kaoto-next/uniforms-patternfly": "^0.6.8",
    "@kie-tools-core/editor": "0.32.0",
    "@kie-tools-core/notifications": "0.32.0",
    "@patternfly/patternfly": "5.2.1",
    "@patternfly/react-code-editor": "5.1.0",
    "@patternfly/react-core": "5.2.2",
    "@patternfly/react-icons": "5.2.1",
    "@patternfly/react-table": "5.2.2",
    "@patternfly/react-topology": "5.2.1",
    "@types/uuid": "^9.0.2",
    ajv: "^8.12.0",
    "ajv-draft-04": "^1.0.0",
    "ajv-formats": "^2.1.1",
    clsx: "^2.1.0",
    "html-to-image": "^1.11.11",
    "lodash.clonedeep": "^4.5.0",
    "lodash.get": "^4.4.2",
    "lodash.isempty": "^4.4.0",
    "lodash.memoize": "^4.1.2",
    "lodash.set": "^4.3.2",
    "monaco-editor": "^0.45.0",
    "monaco-yaml": "^5.1.1",
    react: "^18.2.0",
    "react-dom": "^18.2.0",
    "react-monaco-editor": "^0.55.0",
    "react-router-dom": "^6.14.1",
    "simple-zustand-devtools": "^1.1.0",
    uniforms: "4.0.0-alpha.5",
    "uniforms-bridge-json-schema": "4.0.0-alpha.5",
    "usehooks-ts": "^2.15.1",
    uuid: "^9.0.0",
    yaml: "^2.3.2",
    zustand: "^4.3.9"
  },
  devDependencies: {
    "@babel/core": "^7.23.2",
    "@babel/preset-env": "^7.21.5",
    "@babel/preset-react": "^7.18.6",
    "@babel/preset-typescript": "^7.21.5",
    "@kaoto/camel-catalog": "workspace:*",
    "@testing-library/dom": "^9.3.0",
    "@testing-library/jest-dom": "^6.0.0",
    "@testing-library/react": "^14.0.0",
    "@testing-library/user-event": "^14.4.3",
    "@types/jest": "^29.4.0",
    "@types/json-schema": "^7.0.15",
    "@types/lodash.clonedeep": "^4.5.7",
    "@types/lodash.get": "^4.4.2",
    "@types/lodash.isempty": "^4.4.9",
    "@types/lodash.memoize": "^4.1.9",
    "@types/lodash.set": "^4.3.7",
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.25",
    "@types/react-dom": "^18.2.10",
    "@typescript-eslint/eslint-plugin": "^7.0.0",
    "@typescript-eslint/parser": "^7.0.0",
    "@vitejs/plugin-react": "^4.0.3",
    "babel-jest": "^29.4.2",
    copyfiles: "^2.4.1",
    eslint: "^8.45.0",
    "eslint-config-prettier": "^9.0.0",
    "eslint-plugin-import": "^2.26.0",
    "eslint-plugin-jest": "^27.2.1",
    "eslint-plugin-prettier": "^5.0.0",
    "eslint-plugin-react-hooks": "^4.6.0",
    "eslint-plugin-react-refresh": "^0.4.3",
    jest: "^29.4.2",
    "jest-canvas-mock": "^2.5.2",
    "jest-environment-jsdom": "^29.4.2",
    prettier: "^3.0.0",
    "react-test-renderer": "^18.2.0",
    rimraf: "^5.0.5",
    sass: "^1.63.6",
    "simple-git": "^3.22.0",
    stylelint: "^16.1.0",
    "stylelint-config-standard-scss": "^13.0.0",
    "stylelint-prettier": "^5.0.0",
    "ts-node": "^10.9.1",
    typescript: "^5.4.2",
    vite: "^4.4.5",
    "vite-plugin-dts": "^3.5.1",
    "vite-plugin-static-copy": "^1.0.0"
  }
};

// vite.config.js
var vite_config_default = defineConfig(async () => {
  const lastCommitInfo = await getLastCommitInfo();
  return {
    plugins: [
      react(),
      viteStaticCopy({
        targets: [
          {
            src: getCamelCatalogFiles(),
            dest: "camel-catalog",
            transform: (content, filename) => {
              return JSON.stringify(JSON.parse(content));
            }
          }
        ]
      })
    ],
    define: {
      __GIT_HASH: JSON.stringify(lastCommitInfo.hash),
      __GIT_DATE: JSON.stringify(lastCommitInfo.date),
      __KAOTO_VERSION: JSON.stringify(package_default.version)
    },
    build: {
      outDir: "./dist",
      sourcemap: true,
      emptyOutDir: true
    },
    base: "./"
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcuanMiLCAic2NyaXB0cy9nZXQtY2FtZWwtY2F0YWxvZy1maWxlcy5qcyIsICJzY3JpcHRzL2dldC1sYXN0LWNvbW1pdC1pbmZvLmpzIiwgInBhY2thZ2UuanNvbiJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXExvcmRSXFxcXHJlcG9zXFxcXGthb3RvXFxcXHBhY2thZ2VzXFxcXHVpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxMb3JkUlxcXFxyZXBvc1xcXFxrYW90b1xcXFxwYWNrYWdlc1xcXFx1aVxcXFx2aXRlLmNvbmZpZy5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvTG9yZFIvcmVwb3Mva2FvdG8vcGFja2FnZXMvdWkvdml0ZS5jb25maWcuanNcIjsvLyBAdHMtY2hlY2tcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCB7IHZpdGVTdGF0aWNDb3B5IH0gZnJvbSAndml0ZS1wbHVnaW4tc3RhdGljLWNvcHknO1xuaW1wb3J0IHsgZ2V0Q2FtZWxDYXRhbG9nRmlsZXMgfSBmcm9tICcuL3NjcmlwdHMvZ2V0LWNhbWVsLWNhdGFsb2ctZmlsZXMnO1xuaW1wb3J0IHsgZ2V0TGFzdENvbW1pdEluZm8gfSBmcm9tICcuL3NjcmlwdHMvZ2V0LWxhc3QtY29tbWl0LWluZm8nO1xuaW1wb3J0IHBhY2thZ2VKc29uIGZyb20gJy4vcGFja2FnZS5qc29uJztcblxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyhhc3luYyAoKSA9PiB7XG4gIGNvbnN0IGxhc3RDb21taXRJbmZvID0gYXdhaXQgZ2V0TGFzdENvbW1pdEluZm8oKTtcblxuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICB2aXRlU3RhdGljQ29weSh7XG4gICAgICAgIHRhcmdldHM6IFtcbiAgICAgICAgICB7XG4gICAgICAgICAgICBzcmM6IGdldENhbWVsQ2F0YWxvZ0ZpbGVzKCksXG4gICAgICAgICAgICBkZXN0OiAnY2FtZWwtY2F0YWxvZycsXG4gICAgICAgICAgICB0cmFuc2Zvcm06IChjb250ZW50LCBmaWxlbmFtZSkgPT4ge1xuICAgICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkoSlNPTi5wYXJzZShjb250ZW50KSk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgIH0sXG4gICAgICAgIF0sXG4gICAgICB9KSxcbiAgICBdLFxuICAgIGRlZmluZToge1xuICAgICAgX19HSVRfSEFTSDogSlNPTi5zdHJpbmdpZnkobGFzdENvbW1pdEluZm8uaGFzaCksXG4gICAgICBfX0dJVF9EQVRFOiBKU09OLnN0cmluZ2lmeShsYXN0Q29tbWl0SW5mby5kYXRlKSxcbiAgICAgIF9fS0FPVE9fVkVSU0lPTjogSlNPTi5zdHJpbmdpZnkocGFja2FnZUpzb24udmVyc2lvbiksXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgb3V0RGlyOiAnLi9kaXN0JyxcbiAgICAgIHNvdXJjZW1hcDogdHJ1ZSxcbiAgICAgIGVtcHR5T3V0RGlyOiB0cnVlLFxuICAgIH0sXG4gICAgYmFzZTogJy4vJyxcbiAgfTtcbn0pO1xuIiwgImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxMb3JkUlxcXFxyZXBvc1xcXFxrYW90b1xcXFxwYWNrYWdlc1xcXFx1aVxcXFxzY3JpcHRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxMb3JkUlxcXFxyZXBvc1xcXFxrYW90b1xcXFxwYWNrYWdlc1xcXFx1aVxcXFxzY3JpcHRzXFxcXGdldC1jYW1lbC1jYXRhbG9nLWZpbGVzLmpzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9DOi9Vc2Vycy9Mb3JkUi9yZXBvcy9rYW90by9wYWNrYWdlcy91aS9zY3JpcHRzL2dldC1jYW1lbC1jYXRhbG9nLWZpbGVzLmpzXCI7aW1wb3J0IHsgcmVhZGRpclN5bmMgfSBmcm9tICdub2RlOmZzJztcbmltcG9ydCB7IGNyZWF0ZVJlcXVpcmUgfSBmcm9tICdub2RlOm1vZHVsZSc7XG5pbXBvcnQgeyBkaXJuYW1lLCBqb2luIH0gZnJvbSAnbm9kZTpwYXRoJztcbmltcG9ydCB7IG5vcm1hbGl6ZVBhdGggfSBmcm9tICd2aXRlJztcblxuY29uc3QgcmVxdWlyZSA9IGNyZWF0ZVJlcXVpcmUoaW1wb3J0Lm1ldGEudXJsKTtcbi8qKlxuICogVGVtcG9yYXJ5IGZ1bmN0aW9uIHRvIGNvcHkgdGhlIGJ1aWx0IEthb3RvIENhbWVsIENhdGFsb2cgaW50byB0aGUgYXNzZXRzIGZvbGRlclxuICpcbiAqIFdoZW4gZHluYW1pY2FsbHkgaW1wb3J0aW5nIHRoZSBDYW1lbCBDYXRhbG9nIGlzIHN1cHBvcnRlZCwgdGhpcyBmdW5jdGlvbiBjYW4gYmUgcmVtb3ZlZFxuICogYW5kIHRoaXMgZmlsZSBjYW4gYmUgcmVzdG9yZWQgdG8gYSAudHMgZmlsZS5cbiAqIFJlbGF0ZWQgaXNzdWU6IGh0dHBzOi8vZ2l0aHViLmNvbS9zdmVsdGVqcy92aXRlLXBsdWdpbi1zdmVsdGUvaXNzdWVzLzE0MSNpc3N1ZWNvbW1lbnQtODk4OTAwMjM5XG4gKi9cbmV4cG9ydCBjb25zdCBnZXRDYW1lbENhdGFsb2dGaWxlcyA9ICgpID0+IHtcbiAgbGV0IGNhbWVsQ2F0YWxvZ1BhdGggPSAnJztcblxuICB0cnkge1xuICAgIGNvbnN0IGNhbWVsQ2F0YWxvZ0luZGV4SnNvblBhdGggPSByZXF1aXJlLnJlc29sdmUoJ0BrYW90by9jYW1lbC1jYXRhbG9nL2luZGV4Lmpzb24nKTtcbiAgICBjYW1lbENhdGFsb2dQYXRoID0gbm9ybWFsaXplUGF0aChkaXJuYW1lKGNhbWVsQ2F0YWxvZ0luZGV4SnNvblBhdGgpKTtcbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICB0aHJvdyBuZXcgRXJyb3IoYENvdWxkIG5vdCBmaW5kICdAa2FvdG8vY2FtZWwtY2F0YWxvZycgXFxuXFxuICR7ZXJyb3J9YCk7XG4gIH1cblxuICBjb25zb2xlLmluZm8oYEZvdW5kICdAa2FvdG8vY2FtZWwtY2F0YWxvZycgaW4gJHtjYW1lbENhdGFsb2dQYXRofWAsICdcXG4nKTtcblxuICB0cnkge1xuICAgIGlmIChyZWFkZGlyU3luYyhjYW1lbENhdGFsb2dQYXRoKS5sZW5ndGggPT09IDApIHtcbiAgICAgIHRocm93IG5ldyBFcnJvcigpO1xuICAgIH1cbiAgfSBjYXRjaCAoZXJyb3IpIHtcbiAgICBjb25zdCBtZXNzYWdlID0gW1xuICAgICAgYFRoZSAnJHtjYW1lbENhdGFsb2dQYXRofScgZm9sZGVyIGlzIGVtcHR5LmAsXG4gICAgICAnTm8gZmlsZXMgZm91bmQgaW4gdGhlIENhbWVsIENhdGFsb2cgZGlyZWN0b3J5LicsXG4gICAgICAnUGxlYXNlIHJ1biBgeWFybiB3b3Jrc3BhY2UgQGthb3RvL2NhbWVsLWNhdGFsb2cgcnVuIGJ1aWxkYCcsXG4gICAgICAnb3IgYHlhcm4gYnVpbGRgIGluIHRoZSBgQGthb3RvL2NhbWVsLWNhdGFsb2dgIHBhY2thZ2UnLFxuICAgIF07XG5cbiAgICB0aHJvdyBuZXcgRXJyb3IobWVzc2FnZS5qb2luKCdcXG5cXG4nKSk7XG4gIH1cblxuICAvKiogTGlzdCBhbGwgdGhlIEpTT04gZmlsZXMgaW4gdGhlIENhbWVsIENhdGFsb2cgZm9sZGVyICovXG4gIGNvbnN0IGpzb25GaWxlcyA9IHJlYWRkaXJTeW5jKGNhbWVsQ2F0YWxvZ1BhdGgpXG4gICAgLmZpbHRlcigoZmlsZSkgPT4gZmlsZS5lbmRzV2l0aCgnLmpzb24nKSlcbiAgICAubWFwKChmaWxlKSA9PiBub3JtYWxpemVQYXRoKGpvaW4oY2FtZWxDYXRhbG9nUGF0aCwgZmlsZSkpKTtcblxuICByZXR1cm4ganNvbkZpbGVzO1xufTtcbiIsICJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcTG9yZFJcXFxccmVwb3NcXFxca2FvdG9cXFxccGFja2FnZXNcXFxcdWlcXFxcc2NyaXB0c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiQzpcXFxcVXNlcnNcXFxcTG9yZFJcXFxccmVwb3NcXFxca2FvdG9cXFxccGFja2FnZXNcXFxcdWlcXFxcc2NyaXB0c1xcXFxnZXQtbGFzdC1jb21taXQtaW5mby5qc1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvTG9yZFIvcmVwb3Mva2FvdG8vcGFja2FnZXMvdWkvc2NyaXB0cy9nZXQtbGFzdC1jb21taXQtaW5mby5qc1wiOy8vIEB0cy1jaGVja1xuaW1wb3J0IHNpbXBsZUdpdCBmcm9tICdzaW1wbGUtZ2l0JztcblxuLyoqXG4gKiBHZXQgdGhlIGdpdCBsYXN0IGNvbW1pdCBpbmZvXG4gKlxuICogQHJldHVybnMge1Byb21pc2U8aW1wb3J0KCdzaW1wbGUtZ2l0JykuRGVmYXVsdExvZ0ZpZWxkcz59IFRoZSBsYXN0IGNvbW1pdCBpbmZvXG4gKi9cbmV4cG9ydCBhc3luYyBmdW5jdGlvbiBnZXRMYXN0Q29tbWl0SW5mbygpIHtcbiAgcmV0dXJuIG5ldyBQcm9taXNlKChyZXNvbHZlLCByZWplY3QpID0+IHtcbiAgICBzaW1wbGVHaXQoKS5sb2coeyBuOiAxIH0sIChlcnIsIHN0YXR1cykgPT4ge1xuICAgICAgaWYgKGVyciB8fCAhc3RhdHVzLmxhdGVzdCB8fCBzdGF0dXMubGF0ZXN0ID09PSBudWxsKSB7XG4gICAgICAgIHJlamVjdChlcnIpO1xuICAgICAgfSBlbHNlIHtcbiAgICAgICAgcmVzb2x2ZShzdGF0dXMubGF0ZXN0KTtcbiAgICAgIH1cbiAgICB9KTtcbiAgfSk7XG59XG4iLCAie1xuICBcIm5hbWVcIjogXCJAa2FvdG8va2FvdG9cIixcbiAgXCJ2ZXJzaW9uXCI6IFwiMi4wLjAtZGV2XCIsXG4gIFwidHlwZVwiOiBcIm1vZHVsZVwiLFxuICBcImRlc2NyaXB0aW9uXCI6IFwiS2FvdG8gVUlcIixcbiAgXCJyZXBvc2l0b3J5XCI6IFwiaHR0cHM6Ly9naXRodWIuY29tL0thb3RvSU8va2FvdG9cIixcbiAgXCJyZXBvc2l0b3J5RGlyZWN0b3J5XCI6IFwicGFja2FnZXMvdWlcIixcbiAgXCJhdXRob3JcIjogXCJUaGUgS2FvdG8gVGVhbVwiLFxuICBcInB1Ymxpc2hDb25maWdcIjoge1xuICAgIFwiYWNjZXNzXCI6IFwicHVibGljXCJcbiAgfSxcbiAgXCJsaWNlbnNlXCI6IFwiQXBhY2hlIExpY2Vuc2UgdjIuMFwiLFxuICBcInR5cGVzXCI6IFwiLi9saWIvZXNtL3B1YmxpYy1hcGkuZC50c1wiLFxuICBcIm1vZHVsZVwiOiBcIi4vbGliL2VzbS9wdWJsaWMtYXBpLmpzXCIsXG4gIFwibWFpblwiOiBcIi4vbGliL2Nqcy9wdWJsaWMtYXBpLmpzXCIsXG4gIFwiZXhwb3J0c1wiOiB7XG4gICAgXCIuXCI6IHtcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9saWIvZXNtL3B1YmxpYy1hcGkuanNcIixcbiAgICAgIFwicmVxdWlyZVwiOiBcIi4vbGliL2Nqcy9wdWJsaWMtYXBpLmpzXCJcbiAgICB9LFxuICAgIFwiLi90ZXN0aW5nXCI6IHtcbiAgICAgIFwiaW1wb3J0XCI6IFwiLi9saWIvZXNtL3Rlc3RpbmctYXBpLmpzXCIsXG4gICAgICBcInJlcXVpcmVcIjogXCIuL2xpYi9janMvdGVzdGluZy1hcGkuanNcIlxuICAgIH1cbiAgfSxcbiAgXCJmaWxlc1wiOiBbXG4gICAgXCJsaWJcIlxuICBdLFxuICBcInNjcmlwdHNcIjoge1xuICAgIFwic3RhcnRcIjogXCJ2aXRlXCIsXG4gICAgXCJidWlsZFwiOiBcInRzYyAmJiB2aXRlIGJ1aWxkIC0tY29uZmlnIHZpdGUuY29uZmlnLmpzXCIsXG4gICAgXCJidWlsZDpsaWJcIjogXCJ5YXJuIHJpbXJhZiAuL2xpYiAmJiB5YXJuIGNvcHktY2F0YWxvZyAmJiB5YXJuIGJ1aWxkOmVzbSAmJiB5YXJuIGJ1aWxkOmNqcyAmJiB5YXJuIHdyaXRlLXZlcnNpb25cIixcbiAgICBcImJ1aWxkOmVzbVwiOiBcInRzYyAtLXByb2plY3QgdHNjb25maWcuZXNtLmpzb24gJiYgY29weWZpbGVzIC11IDEgJy4vc3JjLyoqLyouc2NzcycgJy4vc3JjL2Fzc2V0cy8qKicgLi9saWIvZXNtXCIsXG4gICAgXCJidWlsZDpjanNcIjogXCJ0c2MgLS1wcm9qZWN0IHRzY29uZmlnLmNqcy5qc29uICYmIGNvcHlmaWxlcyAtdSAxICcuL3NyYy8qKi8qLnNjc3MnICcuL3NyYy9hc3NldHMvKionIC4vbGliL2Nqc1wiLFxuICAgIFwid3JpdGUtdmVyc2lvblwiOiBcIm5vZGUgLi9zY3JpcHRzL3dyaXRlLXZlcnNpb24tZmlsZS5qc1wiLFxuICAgIFwiY29weS1jYXRhbG9nXCI6IFwibm9kZSAuL3NjcmlwdHMvY29weS1jYW1lbC1jYXRhbG9nLWZpbGVzLmpzIC4vbGliL2NhbWVsLWNhdGFsb2dcIixcbiAgICBcInByZXZpZXdcIjogXCJ2aXRlIHByZXZpZXdcIixcbiAgICBcInRlc3RcIjogXCJqZXN0XCIsXG4gICAgXCJ0ZXN0OndhdGNoXCI6IFwiamVzdCAtLXdhdGNoXCIsXG4gICAgXCJsaW50XCI6IFwieWFybiBlc2xpbnQgXFxcInNyYy8qKi8qLnt0cyx0c3h9XFxcIlwiLFxuICAgIFwibGludDpmaXhcIjogXCJ5YXJuIGxpbnQgLS1maXhcIixcbiAgICBcImxpbnQ6c3R5bGVcIjogXCJ5YXJuIHN0eWxlbGludCBcXFwic3JjLyoqLyoue2NzcyxzY3NzfVxcXCJcIixcbiAgICBcImxpbnQ6c3R5bGU6Zml4XCI6IFwieWFybiBsaW50OnN0eWxlIC0tZml4XCJcbiAgfSxcbiAgXCJkZXBlbmRlbmNpZXNcIjoge1xuICAgIFwiQGthb3RvLW5leHQvdW5pZm9ybXMtcGF0dGVybmZseVwiOiBcIl4wLjYuOFwiLFxuICAgIFwiQGtpZS10b29scy1jb3JlL2VkaXRvclwiOiBcIjAuMzIuMFwiLFxuICAgIFwiQGtpZS10b29scy1jb3JlL25vdGlmaWNhdGlvbnNcIjogXCIwLjMyLjBcIixcbiAgICBcIkBwYXR0ZXJuZmx5L3BhdHRlcm5mbHlcIjogXCI1LjIuMVwiLFxuICAgIFwiQHBhdHRlcm5mbHkvcmVhY3QtY29kZS1lZGl0b3JcIjogXCI1LjEuMFwiLFxuICAgIFwiQHBhdHRlcm5mbHkvcmVhY3QtY29yZVwiOiBcIjUuMi4yXCIsXG4gICAgXCJAcGF0dGVybmZseS9yZWFjdC1pY29uc1wiOiBcIjUuMi4xXCIsXG4gICAgXCJAcGF0dGVybmZseS9yZWFjdC10YWJsZVwiOiBcIjUuMi4yXCIsXG4gICAgXCJAcGF0dGVybmZseS9yZWFjdC10b3BvbG9neVwiOiBcIjUuMi4xXCIsXG4gICAgXCJAdHlwZXMvdXVpZFwiOiBcIl45LjAuMlwiLFxuICAgIFwiYWp2XCI6IFwiXjguMTIuMFwiLFxuICAgIFwiYWp2LWRyYWZ0LTA0XCI6IFwiXjEuMC4wXCIsXG4gICAgXCJhanYtZm9ybWF0c1wiOiBcIl4yLjEuMVwiLFxuICAgIFwiY2xzeFwiOiBcIl4yLjEuMFwiLFxuICAgIFwiaHRtbC10by1pbWFnZVwiOiBcIl4xLjExLjExXCIsXG4gICAgXCJsb2Rhc2guY2xvbmVkZWVwXCI6IFwiXjQuNS4wXCIsXG4gICAgXCJsb2Rhc2guZ2V0XCI6IFwiXjQuNC4yXCIsXG4gICAgXCJsb2Rhc2guaXNlbXB0eVwiOiBcIl40LjQuMFwiLFxuICAgIFwibG9kYXNoLm1lbW9pemVcIjogXCJeNC4xLjJcIixcbiAgICBcImxvZGFzaC5zZXRcIjogXCJeNC4zLjJcIixcbiAgICBcIm1vbmFjby1lZGl0b3JcIjogXCJeMC40NS4wXCIsXG4gICAgXCJtb25hY28teWFtbFwiOiBcIl41LjEuMVwiLFxuICAgIFwicmVhY3RcIjogXCJeMTguMi4wXCIsXG4gICAgXCJyZWFjdC1kb21cIjogXCJeMTguMi4wXCIsXG4gICAgXCJyZWFjdC1tb25hY28tZWRpdG9yXCI6IFwiXjAuNTUuMFwiLFxuICAgIFwicmVhY3Qtcm91dGVyLWRvbVwiOiBcIl42LjE0LjFcIixcbiAgICBcInNpbXBsZS16dXN0YW5kLWRldnRvb2xzXCI6IFwiXjEuMS4wXCIsXG4gICAgXCJ1bmlmb3Jtc1wiOiBcIjQuMC4wLWFscGhhLjVcIixcbiAgICBcInVuaWZvcm1zLWJyaWRnZS1qc29uLXNjaGVtYVwiOiBcIjQuMC4wLWFscGhhLjVcIixcbiAgICBcInVzZWhvb2tzLXRzXCI6IFwiXjIuMTUuMVwiLFxuICAgIFwidXVpZFwiOiBcIl45LjAuMFwiLFxuICAgIFwieWFtbFwiOiBcIl4yLjMuMlwiLFxuICAgIFwienVzdGFuZFwiOiBcIl40LjMuOVwiXG4gIH0sXG4gIFwiZGV2RGVwZW5kZW5jaWVzXCI6IHtcbiAgICBcIkBiYWJlbC9jb3JlXCI6IFwiXjcuMjMuMlwiLFxuICAgIFwiQGJhYmVsL3ByZXNldC1lbnZcIjogXCJeNy4yMS41XCIsXG4gICAgXCJAYmFiZWwvcHJlc2V0LXJlYWN0XCI6IFwiXjcuMTguNlwiLFxuICAgIFwiQGJhYmVsL3ByZXNldC10eXBlc2NyaXB0XCI6IFwiXjcuMjEuNVwiLFxuICAgIFwiQGthb3RvL2NhbWVsLWNhdGFsb2dcIjogXCJ3b3Jrc3BhY2U6KlwiLFxuICAgIFwiQHRlc3RpbmctbGlicmFyeS9kb21cIjogXCJeOS4zLjBcIixcbiAgICBcIkB0ZXN0aW5nLWxpYnJhcnkvamVzdC1kb21cIjogXCJeNi4wLjBcIixcbiAgICBcIkB0ZXN0aW5nLWxpYnJhcnkvcmVhY3RcIjogXCJeMTQuMC4wXCIsXG4gICAgXCJAdGVzdGluZy1saWJyYXJ5L3VzZXItZXZlbnRcIjogXCJeMTQuNC4zXCIsXG4gICAgXCJAdHlwZXMvamVzdFwiOiBcIl4yOS40LjBcIixcbiAgICBcIkB0eXBlcy9qc29uLXNjaGVtYVwiOiBcIl43LjAuMTVcIixcbiAgICBcIkB0eXBlcy9sb2Rhc2guY2xvbmVkZWVwXCI6IFwiXjQuNS43XCIsXG4gICAgXCJAdHlwZXMvbG9kYXNoLmdldFwiOiBcIl40LjQuMlwiLFxuICAgIFwiQHR5cGVzL2xvZGFzaC5pc2VtcHR5XCI6IFwiXjQuNC45XCIsXG4gICAgXCJAdHlwZXMvbG9kYXNoLm1lbW9pemVcIjogXCJeNC4xLjlcIixcbiAgICBcIkB0eXBlcy9sb2Rhc2guc2V0XCI6IFwiXjQuMy43XCIsXG4gICAgXCJAdHlwZXMvbm9kZVwiOiBcIl4yMC4wLjBcIixcbiAgICBcIkB0eXBlcy9yZWFjdFwiOiBcIl4xOC4yLjI1XCIsXG4gICAgXCJAdHlwZXMvcmVhY3QtZG9tXCI6IFwiXjE4LjIuMTBcIixcbiAgICBcIkB0eXBlc2NyaXB0LWVzbGludC9lc2xpbnQtcGx1Z2luXCI6IFwiXjcuMC4wXCIsXG4gICAgXCJAdHlwZXNjcmlwdC1lc2xpbnQvcGFyc2VyXCI6IFwiXjcuMC4wXCIsXG4gICAgXCJAdml0ZWpzL3BsdWdpbi1yZWFjdFwiOiBcIl40LjAuM1wiLFxuICAgIFwiYmFiZWwtamVzdFwiOiBcIl4yOS40LjJcIixcbiAgICBcImNvcHlmaWxlc1wiOiBcIl4yLjQuMVwiLFxuICAgIFwiZXNsaW50XCI6IFwiXjguNDUuMFwiLFxuICAgIFwiZXNsaW50LWNvbmZpZy1wcmV0dGllclwiOiBcIl45LjAuMFwiLFxuICAgIFwiZXNsaW50LXBsdWdpbi1pbXBvcnRcIjogXCJeMi4yNi4wXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLWplc3RcIjogXCJeMjcuMi4xXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLXByZXR0aWVyXCI6IFwiXjUuMC4wXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLXJlYWN0LWhvb2tzXCI6IFwiXjQuNi4wXCIsXG4gICAgXCJlc2xpbnQtcGx1Z2luLXJlYWN0LXJlZnJlc2hcIjogXCJeMC40LjNcIixcbiAgICBcImplc3RcIjogXCJeMjkuNC4yXCIsXG4gICAgXCJqZXN0LWNhbnZhcy1tb2NrXCI6IFwiXjIuNS4yXCIsXG4gICAgXCJqZXN0LWVudmlyb25tZW50LWpzZG9tXCI6IFwiXjI5LjQuMlwiLFxuICAgIFwicHJldHRpZXJcIjogXCJeMy4wLjBcIixcbiAgICBcInJlYWN0LXRlc3QtcmVuZGVyZXJcIjogXCJeMTguMi4wXCIsXG4gICAgXCJyaW1yYWZcIjogXCJeNS4wLjVcIixcbiAgICBcInNhc3NcIjogXCJeMS42My42XCIsXG4gICAgXCJzaW1wbGUtZ2l0XCI6IFwiXjMuMjIuMFwiLFxuICAgIFwic3R5bGVsaW50XCI6IFwiXjE2LjEuMFwiLFxuICAgIFwic3R5bGVsaW50LWNvbmZpZy1zdGFuZGFyZC1zY3NzXCI6IFwiXjEzLjAuMFwiLFxuICAgIFwic3R5bGVsaW50LXByZXR0aWVyXCI6IFwiXjUuMC4wXCIsXG4gICAgXCJ0cy1ub2RlXCI6IFwiXjEwLjkuMVwiLFxuICAgIFwidHlwZXNjcmlwdFwiOiBcIl41LjQuMlwiLFxuICAgIFwidml0ZVwiOiBcIl40LjQuNVwiLFxuICAgIFwidml0ZS1wbHVnaW4tZHRzXCI6IFwiXjMuNS4xXCIsXG4gICAgXCJ2aXRlLXBsdWdpbi1zdGF0aWMtY29weVwiOiBcIl4xLjAuMFwiXG4gIH1cbn1cbiJdLAogICJtYXBwaW5ncyI6ICI7QUFDQSxPQUFPLFdBQVc7QUFDbEIsU0FBUyxvQkFBb0I7QUFDN0IsU0FBUyxzQkFBc0I7OztBQ0hxVSxTQUFTLG1CQUFtQjtBQUNoWSxTQUFTLHFCQUFxQjtBQUM5QixTQUFTLFNBQVMsWUFBWTtBQUM5QixTQUFTLHFCQUFxQjtBQUhpTSxJQUFNLDJDQUEyQztBQUtoUixJQUFNQSxXQUFVLGNBQWMsd0NBQWU7QUFRdEMsSUFBTSx1QkFBdUIsTUFBTTtBQUN4QyxNQUFJLG1CQUFtQjtBQUV2QixNQUFJO0FBQ0YsVUFBTSw0QkFBNEJBLFNBQVEsUUFBUSxpQ0FBaUM7QUFDbkYsdUJBQW1CLGNB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
