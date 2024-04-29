# ui-tests

## Running the tests

Running the tests from the root folder

```bash
yarn workspace @kaoto/kaoto-tests e2e
```

Running the tests in headless mode

```bash
yarn workspace @kaoto/kaoto-tests run e2e:headless

# with a specific browser
# options: chrome, chromium, edge, electron, firefox
yarn workspace @kaoto/kaoto-tests run e2e:headless --browser firefox
```
