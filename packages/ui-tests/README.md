# ui-tests

## Running the tests

Running the tests from the root folder

```bash
yarn workspace @kaoto-next/ui-tests e2e
```

Running the tests in headless mode

```bash
yarn workspace @kaoto-next/ui-tests run e2e:headless

# with a specific browser
# options: chrome, chromium, edge, electron, firefox
yarn workspace @kaoto-next/ui-tests run e2e:headless --browser firefox
```

Fake change