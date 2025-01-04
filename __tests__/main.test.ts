/**
 * Unit tests for the action's main functionality in src/main.ts
 *
 * These tests mimic the action environment and test various code paths.
 */

import * as core from '@actions/core'
import * as github from '@actions/github'
import { DefaultArtifactClient } from '@actions/artifact'
import * as main from '../src/main'

// Mock the artifact client
jest.mock('@actions/artifact', () => {
  return {
    DefaultArtifactClient: jest.fn().mockImplementation(() => {
      return {
        getArtifact: jest.fn().mockImplementation((name, { findBy }) => {
          // We can switch behavior in specific tests by re-mocking this method
          return Promise.resolve({ artifact: { id: 123, size: 456 } })
        })
      }
    })
  }
})

// Mock the GitHub Actions core library
let infoMock: jest.SpiedFunction<typeof core.info>
let debugMock: jest.SpiedFunction<typeof core.debug>
let errorMock: jest.SpiedFunction<typeof core.error>
let getInputMock: jest.SpiedFunction<typeof core.getInput>
let setFailedMock: jest.SpiedFunction<typeof core.setFailed>

// Mock the GitHub context and octokit
const mockOctokit = {
  rest: {
    pulls: {
      get: jest.fn(),
      update: jest.fn()
    }
  }
}

jest.mock('@actions/github', () => {
  const mockOctokit = {
    rest: {
      pulls: {
        get: jest.fn(),
        update: jest.fn()
      }
    }
  }

  return {
    context: {
      payload: {},
      workflow: 'TestWorkflow',
      runId: 999,
      issue: {
        number: 42
      }
    },
    getOctokit: jest.fn().mockReturnValue(mockOctokit)
  }
})

describe('main action tests', () => {
  beforeEach(() => {
    jest.clearAllMocks()

    infoMock = jest.spyOn(core, 'info').mockImplementation(() => {})
    debugMock = jest.spyOn(core, 'debug').mockImplementation(() => {})
    errorMock = jest.spyOn(core, 'error').mockImplementation(() => {})
    getInputMock = jest.spyOn(core, 'getInput')
    setFailedMock = jest.spyOn(core, 'setFailed').mockImplementation(() => {})

    // Set default environment and inputs
    process.env['GITHUB_WORKSPACE'] = '/home/runner/work/repo/repo'

    // By default, let's assume it's a PR event
    ;(github.context.payload as any).pull_request = { number: 42 }

    // Default inputs
    getInputMock.mockImplementation((name: string) => {
      switch (name) {
        case 'name':
          return 'test-artifact'
        case 'description':
          return 'Test Artifact Description'
        case 'path':
          return ''
        case 'github-token':
          return 'test-token'
        case 'repository':
          return 'owner/repo'
        case 'run-id':
          return ''
        default:
          return ''
      }
    })

    // Default mock for octokit pulls.get
    mockOctokit.rest.pulls.get.mockResolvedValue({
      data: {
        body: 'This is a pull request body'
      }
    })
    // Default mock for octokit pulls.update
    mockOctokit.rest.pulls.update.mockResolvedValue({
      data: {
        body: 'Updated body'
      }
    })
  })

  it('skips action if not a pull request event', async () => {
    delete (github.context.payload as any).pull_request

    await main.run()

    expect(infoMock).toHaveBeenCalledWith(
      'Not a pull request. Skipping action.'
    )
    expect(setFailedMock).not.toHaveBeenCalled()
  })

  //   it('fails if required "name" input is not provided', async () => {
  //     getInputMock.mockImplementation((name: string) => {
  //       if (name === 'name') return ''
  //       if (name === 'repository') return 'owner/repo'
  //       if (name === 'github-token') return 'test-token'
  //       return ''
  //     })

  //     await main.run()

  //     expect(setFailedMock).toHaveBeenCalledWith(
  //       expect.stringContaining('Input required and not supplied: name')
  //     )
  //   })

  it('fails if repository input is invalid', async () => {
    getInputMock.mockImplementation((name: string) => {
      if (name === 'name') return 'test-artifact'
      if (name === 'repository') return 'invalidformat'
      return ''
    })

    await main.run()
    expect(setFailedMock).toHaveBeenCalledWith(
      expect.stringContaining("Invalid repository: 'invalidformat'")
    )
  })

  it('fails if no GitHub token is provided', async () => {
    getInputMock.mockImplementation((name: string) => {
      if (name === 'name') return 'test-artifact'
      if (name === 'repository') return 'owner/repo'
      if (name === 'github-token') return ''
      return ''
    })
    delete process.env['GITHUB_TOKEN']

    await main.run()
    expect(setFailedMock).toHaveBeenCalledWith('GitHub token is required')
  })

  //   it('updates PR body when artifact is found', async () => {
  //     // Confirm that artifact is found (default mock behavior)
  //     await main.run()

  //     expect(mockOctokit.rest.pulls.get).toHaveBeenCalledWith({
  //       owner: 'owner',
  //       repo: 'repo',
  //       pull_number: 42
  //     })

  //     // The body should be updated with the artifact link
  //     expect(mockOctokit.rest.pulls.update).toHaveBeenCalledWith({
  //       owner: 'owner',
  //       repo: 'repo',
  //       pull_number: 42,
  //       body: expect.stringContaining('Test Artifact Description')
  //     })
  //     expect(setFailedMock).not.toHaveBeenCalled()
  //   })

  it('fails if the artifact is not found', async () => {
    // Remock getArtifact to return no artifact
    ;(DefaultArtifactClient as jest.Mock).mockImplementation(() => {
      return {
        getArtifact: jest.fn().mockResolvedValue({ artifact: undefined })
      }
    })

    await main.run()

    expect(setFailedMock).toHaveBeenCalledWith(
      "Artifact 'test-artifact' not found"
    )
  })

  //   it('replaces existing artifact section in PR body', async () => {
  //     // PR body initially contains an old section
  //     mockOctokit.rest.pulls.get.mockResolvedValue({
  //       data: {
  //         body: `This is a pull request body\n\n<!-- download-section TestWorkflow test-artifact start -->\n[Old Link](old-link)\n<!-- download-section TestWorkflow test-artifact end -->`
  //       }
  //     })

  //     await main.run()

  //     expect(mockOctokit.rest.pulls.update).toHaveBeenCalled()
  //     const updateCall = mockOctokit.rest.pulls.update.mock.calls[0][0]
  //     expect(updateCall.body).toContain('Test Artifact Description')
  //     expect(updateCall.body).not.toContain('[Old Link](old-link)')
  //     expect(updateCall.body).toMatch(
  //       /<!-- download-section TestWorkflow test-artifact start -->/
  //     )
  //     expect(updateCall.body).toMatch(
  //       /<!-- download-section TestWorkflow test-artifact end -->/
  //     )
  //     expect(setFailedMock).not.toHaveBeenCalled()
  //   })

  //   it('adds new artifact section if none exists', async () => {
  //     mockOctokit.rest.pulls.get.mockResolvedValue({
  //       data: {
  //         body: `This is a pull request body without artifact section`
  //       }
  //     })

  //     await main.run()

  //     const updateCall = mockOctokit.rest.pulls.update.mock.calls[0][0]
  //     expect(updateCall.body).toContain('Test Artifact Description')
  //     expect(updateCall.body).toMatch(
  //       /<!-- download-section TestWorkflow test-artifact start -->/
  //     )
  //     expect(updateCall.body).toMatch(
  //       /<!-- download-section TestWorkflow test-artifact end -->/
  //     )
  //     expect(setFailedMock).not.toHaveBeenCalled()
  //   })
})
