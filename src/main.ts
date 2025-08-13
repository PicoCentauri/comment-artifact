import * as os from 'os'
import * as path from 'path'
import * as core from '@actions/core'
import { getOctokit, context } from '@actions/github'
import { DefaultArtifactClient } from '@actions/artifact'

export async function run(): Promise<void> {
  try {
    if (!context.payload.pull_request) {
      core.info('Not a pull request. Skipping action.')
      return
    }

    const inputs = {
      name: core.getInput('name', { required: true }),
      description: core.getInput('description', { required: false }),
      path: core.getInput('path', { required: false }),
      token: core.getInput('github-token', { required: false }),
      repository: core.getInput('repository', { required: false }),
      runID: parseInt(core.getInput('run-id', { required: false }))
    }

    if (!inputs.path) {
      inputs.path = process.env['GITHUB_WORKSPACE'] || process.cwd()
    }

    if (inputs.path.startsWith(`~`)) {
      inputs.path = inputs.path.replace('~', os.homedir())
    }

    const resolvedPath = path.resolve(inputs.path)
    core.debug(`Resolved path is ${resolvedPath}`)

    const workflowName: string = context.workflow
    const workflowRunId: number = context.runId

    const [repositoryOwner, repositoryName] = inputs.repository.split('/')
    if (!repositoryOwner || !repositoryName) {
      throw new Error(
        `Invalid repository: '${inputs.repository}'. Must be in format owner/repo`
      )
    }

    const token = process.env['GITHUB_TOKEN'] || inputs.token
    if (!token) {
      throw new Error('GitHub token is required')
    }

    // Check if this is a PR from a fork
    const prPayload = context.payload.pull_request
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const headRepo = prPayload?.head?.repo?.full_name
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment  
    const baseRepo = prPayload?.base?.repo?.full_name
    const isForkPR = Boolean(headRepo && baseRepo && headRepo !== baseRepo)
    if (isForkPR) {
      core.warning('This appears to be a pull request from a fork. The action may fail due to GitHub security restrictions that limit token permissions for fork PRs.')
    }

    const findBy = {
      token,
      workflowRunId,
      repositoryOwner,
      repositoryName
    }

    core.info(
      `Owner: ${repositoryOwner}, Repo: ${repositoryName}, Run ID: ${inputs.runID}`
    )

    const artifact = new DefaultArtifactClient()

    await artifact.getArtifact(inputs.name, { findBy })

    const { artifact: targetArtifact } = await artifact.getArtifact(
      inputs.name,
      { findBy }
    )

    if (!targetArtifact) {
      throw new Error(`Artifact '${inputs.name}' not found`)
    }

    core.debug(
      `Found named artifact '${inputs.name}' (ID: ${targetArtifact.id}, Size: ${targetArtifact.size})`
    )

    // update PR description
    const messageSeperatorStart = `\n\n<!-- download-section ${workflowName} ${inputs.name} start -->\n`
    const link = `https://nightly.link/${repositoryOwner}/${repositoryName}/actions/artifacts/${targetArtifact.id}.zip`
    const bodyMessage = `[${inputs.description}](${link})\n`
    const messageSeperatorEnd = `\n<!-- download-section ${workflowName} ${inputs.name} end -->`

    // Get the current pull request number
    const pullRequestNumber = context.issue.number

    // Initialize octokit
    const octokit = getOctokit(token)

    let pullRequest
    try {
      // Fetch the current body of the pull request
      const response = await octokit.rest.pulls.get({
        owner: repositoryOwner,
        repo: repositoryName,
        pull_number: pullRequestNumber
      })
      pullRequest = response.data
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 403) {
        throw new Error(
          'Insufficient permissions to access pull request. This often happens with pull requests from forks. ' +
          'Consider using pull_request_target event or providing a token with appropriate permissions.'
        )
      }
      throw error
    }

    const oldBody: string = pullRequest.body || ''
    let newBody = ''

    const startIndex = oldBody.indexOf(messageSeperatorStart)
    const endIndex = oldBody.indexOf(messageSeperatorEnd)

    if (startIndex === -1) {
      // First time updating this description
      newBody =
        oldBody + messageSeperatorStart + bodyMessage + messageSeperatorEnd
    } else {
      // Replace existing section
      newBody =
        oldBody.substring(0, startIndex) +
        messageSeperatorStart +
        bodyMessage +
        messageSeperatorEnd +
        oldBody.substring(endIndex + messageSeperatorEnd.length)
    }

    core.debug(`New body: ${newBody}`)

    try {
      // Update the PR body with newBody
      await octokit.rest.pulls.update({
        owner: repositoryOwner,
        repo: repositoryName,
        pull_number: pullRequestNumber,
        body: newBody
      })
    } catch (error) {
      if (error instanceof Error && 'status' in error && error.status === 403) {
        throw new Error(
          'Insufficient permissions to update pull request. This often happens with pull requests from forks. ' +
          'Consider using pull_request_target event or providing a token with write permissions to pull-requests.'
        )
      }
      throw error
    }
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
