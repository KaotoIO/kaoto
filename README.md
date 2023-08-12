# kaoto-next
Next version of the UI of the Kaoto project

## Building the project
This project leverages `vite`, you can find more information about it [here](https://vitejs.dev/config/).

### Requirements
- NodeJS (>v18.x)
- yarn (>v3.x)

### Steps
1. Clone the repository
2. In the recently cloned folder, run `yarn install` to install all the dependencies
(By default, `@kaoto-next/camel-catalog` will be built as well, using the `mvn` wrapper)

#### Running the web application
Run `yarn workspace @kaoto-next/ui run start` to start the development server. The application will be available at `http://localhost:5173` by default.

#### Building the web application
Run `yarn workspace @kaoto-next/ui run build` to build the web application

#### Building the public components
Run `yarn workspace @kaoto-next/ui run build:lib` to build the public components

#### Building the Camel Catalog and supporting schemas
Run `yarn workspace @kaoto-next/camel-catalog run build` to build them.
Optionally, you could update the Camel version in the `pom.xml` file, and then run `yarn workspace @kaoto-next/camel-catalog run build` again
