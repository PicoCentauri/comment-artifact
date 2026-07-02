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
    const startMarker = `<!-- download-section ${workflowName} ${inputs.name} start -->`
    const endMarker = `<!-- download-section ${workflowName} ${inputs.name} end -->`
    const link = `https://nightly.link/${repositoryOwner}/${repositoryName}/actions/artifacts/${targetArtifact.id}.zip`
    const bodyLine = `[${inputs.description}](${link})`

    // Get the current pull request number
    const pullRequestNumber = context.issue.number

    // Initialize octokit
    const octokit = getOctokit(inputs.token)

    // Fetch the current body of the pull request
    const { data: pullRequest } = await octokit.rest.pulls.get({
      owner: repositoryOwner,
      repo: repositoryName,
      pull_number: pullRequestNumber
    })

    // Normalize line endings to avoid \r\n vs \n mismatches
    const oldBody: string = (pullRequest.body || '').replace(/\r\n/g, '\n')
    let newBody = ''

    // Search for the marker without relying on leading newlines,
    // since the body may have been edited or normalized between runs
    const startIndex = oldBody.indexOf(`\n${startMarker}\n`)
    const endIndex = oldBody.indexOf(`\n${endMarker}`)

    if (startIndex === -1) {
      // First time — append new section
      const separator = oldBody === '' ? '' : '\n\n'
      newBody = `${oldBody}${separator}\n${startMarker}\n${bodyLine}\n${endMarker}`
    } else {
      // Replace existing section in place
      newBody =
        oldBody.substring(0, startIndex) +
        `\n${startMarker}\n${bodyLine}\n${endMarker}` +
        oldBody.substring(endIndex + `\n${endMarker}`.length)
    }

    core.debug(`New body: ${newBody}`)

    // Update the PR body with newBody
    await octokit.rest.pulls.update({
      owner: repositoryOwner,
      repo: repositoryName,
      pull_number: pullRequestNumber,
      body: newBody
    })
  } catch (error) {
    // Fail the workflow run if an error occurs
    if (error instanceof Error) core.setFailed(error.message)
  }
}
