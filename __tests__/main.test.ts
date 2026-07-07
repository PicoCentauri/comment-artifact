/**
 * Unit tests for the action's main functionality in src/main.ts
 */

import { jest } from '@jest/globals'
import * as os from 'os'

// --- @actions/core mocks ---
const mockGetInput: jest.Mock = jest.fn()
const mockSetFailed: jest.Mock = jest.fn()
const mockInfo: jest.Mock = jest.fn()
const mockDebug: jest.Mock = jest.fn()
const mockWarning: jest.Mock = jest.fn()

jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockGetInput,
  setFailed: mockSetFailed,
  info: mockInfo,
  debug: mockDebug,
  warning: mockWarning
}))

// --- @actions/github mocks ---
const mockPullsGet: jest.Mock<() => Promise<unknown>> = jest.fn()
const mockPullsUpdate: jest.Mock<() => Promise<unknown>> = jest.fn()
const mockGetOctokit: jest.Mock = jest.fn()

const mockContext = {
  payload: {} as Record<string, unknown>,
  workflow: 'TestWorkflow',
  runId: 999,
  issue: { number: 42 }
}

jest.unstable_mockModule('@actions/github', () => ({
  context: mockContext,
  getOctokit: mockGetOctokit
}))

// --- @actions/artifact mocks ---
const mockGetArtifact: jest.Mock<() => Promise<unknown>> = jest.fn()

jest.unstable_mockModule('@actions/artifact', () => ({
  DefaultArtifactClient: jest.fn().mockImplementation(() => ({
    getArtifact: mockGetArtifact
  }))
}))

// Dynamic import must come after all unstable_mockModule calls
const { run } = await import('../src/main.js')

// Helper to build getInput mock implementations
function makeInputs(
  overrides: Record<string, string> = {}
): (name: unknown) => string {
  const defaults: Record<string, string> = {
    name: 'test-artifact',
    description: 'Test Artifact',
    path: '',
    'github-token': 'test-token',
    repository: 'owner/repo',
    'run-id': '0',
    ...overrides
  }
  return (name: unknown) => defaults[name as string] ?? ''
}

const ARTIFACT_URL = 'https://nightly.link/owner/repo/actions/artifacts/123.zip'

describe('main.ts', () => {
  beforeEach(() => {
    process.env['GITHUB_WORKSPACE'] = '/home/runner/work/repo/repo'
    delete process.env['GITHUB_TOKEN']

    // Default: running in a PR context
    mockContext.payload = { pull_request: { number: 42 } }

    mockGetInput.mockImplementation(makeInputs())
    mockGetArtifact.mockResolvedValue({ artifact: { id: 123, size: 456 } })
    mockPullsGet.mockResolvedValue({ data: { body: 'Existing PR body.' } })
    mockPullsUpdate.mockResolvedValue({ data: {} })
    mockGetOctokit.mockReturnValue({
      rest: { pulls: { get: mockPullsGet, update: mockPullsUpdate } }
    })
  })

  describe('PR context guard', () => {
    it('skips and logs when not a pull request event', async () => {
      mockContext.payload = {}

      await run()

      expect(mockInfo).toHaveBeenCalledWith(
        'Not a pull request. Skipping action.'
      )
      expect(mockSetFailed).not.toHaveBeenCalled()
    })
  })

  describe('input validation', () => {
    it('fails when repository is in an invalid format', async () => {
      mockGetInput.mockImplementation(makeInputs({ repository: 'no-slash' }))

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith(
        expect.stringContaining("Invalid repository: 'no-slash'")
      )
    })

    it('fails when no GitHub token is available at all', async () => {
      mockGetInput.mockImplementation(makeInputs({ 'github-token': '' }))
      delete process.env['GITHUB_TOKEN']

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('GitHub token is required')
    })

    it('proceeds when GITHUB_TOKEN env var is set even without input token', async () => {
      mockGetInput.mockImplementation(makeInputs({ 'github-token': '' }))
      process.env['GITHUB_TOKEN'] = 'env-token'

      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
    })
  })

  describe('path resolution', () => {
    it('defaults to GITHUB_WORKSPACE when path input is empty', async () => {
      await run()

      expect(mockDebug).toHaveBeenCalledWith(
        'Resolved path is /home/runner/work/repo/repo'
      )
    })

    it('falls back to cwd when GITHUB_WORKSPACE is also unset', async () => {
      delete process.env['GITHUB_WORKSPACE']

      await run()

      expect(mockDebug).toHaveBeenCalledWith(
        expect.stringMatching(/^Resolved path is \//)
      )
    })

    it('expands tilde at the start of path input', async () => {
      mockGetInput.mockImplementation(makeInputs({ path: '~/artifacts' }))

      await run()

      expect(mockDebug).toHaveBeenCalledWith(
        `Resolved path is ${os.homedir()}/artifacts`
      )
    })

    it('uses an explicit absolute path input as provided', async () => {
      mockGetInput.mockImplementation(makeInputs({ path: '/custom/path' }))

      await run()

      expect(mockDebug).toHaveBeenCalledWith('Resolved path is /custom/path')
    })
  })

  describe('artifact lookup', () => {
    it('calls getArtifact with the artifact name and correct findBy parameters', async () => {
      await run()

      expect(mockGetArtifact).toHaveBeenCalledWith(
        'test-artifact',
        expect.objectContaining({
          findBy: expect.objectContaining({
            token: 'test-token',
            workflowRunId: 999,
            repositoryOwner: 'owner',
            repositoryName: 'repo'
          })
        })
      )
    })

    it('fails when the requested artifact is not found', async () => {
      mockGetArtifact.mockResolvedValue({ artifact: undefined })

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith(
        "Artifact 'test-artifact' not found"
      )
    })
  })

  describe('PR body update', () => {
    it('calls pulls.get with the correct owner, repo and PR number', async () => {
      await run()

      expect(mockPullsGet).toHaveBeenCalledWith({
        owner: 'owner',
        repo: 'repo',
        pull_number: 42
      })
    })

    it('calls pulls.update with the correct owner, repo and PR number', async () => {
      await run()

      expect(mockPullsUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          owner: 'owner',
          repo: 'repo',
          pull_number: 42
        })
      )
    })

    it('does not call setFailed after a successful update', async () => {
      await run()

      expect(mockSetFailed).not.toHaveBeenCalled()
    })

    it('appends a new section to a non-empty PR body', async () => {
      mockPullsGet.mockResolvedValue({ data: { body: 'Existing PR body.' } })

      await run()

      const { body } = (mockPullsUpdate.mock.calls[0] as [{ body: string }])[0]
      expect(body).toContain('Existing PR body.')
      expect(body).toContain(
        '<!-- download-section TestWorkflow test-artifact start -->'
      )
      expect(body).toContain(`[Test Artifact](${ARTIFACT_URL})`)
      expect(body).toContain(
        '<!-- download-section TestWorkflow test-artifact end -->'
      )
    })

    it('appends section without an extra separator when the body is empty', async () => {
      mockPullsGet.mockResolvedValue({ data: { body: '' } })

      await run()

      const { body } = (mockPullsUpdate.mock.calls[0] as [{ body: string }])[0]
      expect(body).toBe(
        '\n<!-- download-section TestWorkflow test-artifact start -->\n' +
          `[Test Artifact](${ARTIFACT_URL})\n` +
          '<!-- download-section TestWorkflow test-artifact end -->'
      )
    })

    it('treats a null PR body the same as an empty body', async () => {
      mockPullsGet.mockResolvedValue({ data: { body: null } })

      await run()

      const { body } = (mockPullsUpdate.mock.calls[0] as [{ body: string }])[0]
      expect(body).toContain(
        '<!-- download-section TestWorkflow test-artifact start -->'
      )
    })

    it('replaces an existing section while preserving surrounding content', async () => {
      const oldBody =
        'Intro.\n' +
        '\n<!-- download-section TestWorkflow test-artifact start -->\n' +
        '[Old Link](https://old.example.com/123.zip)\n' +
        '<!-- download-section TestWorkflow test-artifact end -->\n' +
        '\nTrailing text.'
      mockPullsGet.mockResolvedValue({ data: { body: oldBody } })

      await run()

      const { body } = (mockPullsUpdate.mock.calls[0] as [{ body: string }])[0]
      expect(body).toContain('Intro.')
      expect(body).toContain('Trailing text.')
      expect(body).toContain(`[Test Artifact](${ARTIFACT_URL})`)
      expect(body).not.toContain('[Old Link]')
    })

    it('normalizes \\r\\n line endings before searching for markers', async () => {
      const crlf =
        'Intro.\r\n' +
        '\r\n<!-- download-section TestWorkflow test-artifact start -->\r\n' +
        '[Old](old-url)\r\n' +
        '<!-- download-section TestWorkflow test-artifact end -->'
      mockPullsGet.mockResolvedValue({ data: { body: crlf } })

      await run()

      const { body } = (mockPullsUpdate.mock.calls[0] as [{ body: string }])[0]
      expect(body).not.toContain('\r\n')
      expect(body).toContain(`[Test Artifact](${ARTIFACT_URL})`)
    })
  })

  describe('error handling', () => {
    it('emits a warning and does not fail on a 403 response', async () => {
      const forbiddenError = Object.assign(
        new Error('Resource not accessible by integration'),
        { status: 403 }
      )
      mockPullsUpdate.mockRejectedValue(forbiddenError)

      await run()

      expect(mockWarning).toHaveBeenCalledWith(
        expect.stringContaining('insufficient permissions')
      )
      expect(mockSetFailed).not.toHaveBeenCalled()
    })

    it('calls setFailed for non-403 API errors', async () => {
      const serverError = Object.assign(new Error('Internal Server Error'), {
        status: 500
      })
      mockPullsUpdate.mockRejectedValue(serverError)

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('Internal Server Error')
      expect(mockWarning).not.toHaveBeenCalled()
    })

    it('calls setFailed when getArtifact throws', async () => {
      mockGetArtifact.mockRejectedValue(new Error('Network failure'))

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('Network failure')
    })

    it('calls setFailed when pulls.get throws a non-403 error', async () => {
      mockPullsGet.mockRejectedValue(new Error('Service unavailable'))

      await run()

      expect(mockSetFailed).toHaveBeenCalledWith('Service unavailable')
    })
  })
})
