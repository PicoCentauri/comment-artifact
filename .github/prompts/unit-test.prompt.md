# Create Unit Test(s)

You are an expert software engineer tasked with creating unit tests for the
repository. Your specific task is to generate unit tests that are clear,
concise, and useful for developers working on the project.

## Guidelines

Ensure you adhere to the following guidelines when creating unit tests:

- Use a clear and consistent format for the unit tests
- Include a summary of the functionality being tested
- Use descriptive test names that clearly convey their purpose
- Ensure tests cover both the main path of success and edge cases
- Use proper assertions to validate the expected outcomes
- Use `jest` for writing and running tests
- Place unit tests in the `__tests__` directory
- Use `jest.unstable_mockModule` to mock ESM modules before importing the module
  under test

## Example

Use the following as an example of how to structure your unit tests. This action
uses `@actions/core`, `@actions/github`, and `@actions/artifact` — mock these at
the module level before dynamically importing `src/main.js`.

```typescript
/**
 * Unit tests for the action's main functionality, src/main.ts
 */
import { jest } from '@jest/globals'

const mockGetInput = jest.fn()
const mockSetFailed = jest.fn()
const mockInfo = jest.fn()

jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockGetInput,
  setFailed: mockSetFailed,
  info: mockInfo,
  debug: jest.fn()
}))

const mockGetArtifact = jest.fn()
jest.unstable_mockModule('@actions/artifact', () => ({
  DefaultArtifactClient: jest.fn().mockImplementation(() => ({
    getArtifact: mockGetArtifact
  }))
}))

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

describe('main.ts', () => {
  afterEach(() => {
    jest.resetAllMocks()
  })

  it('skips when not a pull request', async () => {
    // getInput is not called when there is no PR context
    mockGetInput.mockReturnValue('')

    await run()

    expect(mockSetFailed).not.toHaveBeenCalled()
  })
})
```
