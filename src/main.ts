import * as os from 'os'
import * as path from 'path'
import * as core from '@actions/core'
import { getOctokit, context } from '@actions/github'
import artifactClient from '@actions/artifact'
import type { FindOptions } from '@actions/artifact'
import { Inputs } from './constants'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  const inputs = {
    name: core.getInput(Inputs.Name, { required: true }),
    description: core.getInput(Inputs.Description, { required: false }),
    path: core.getInput(Inputs.Path, { required: false }),
    token: core.getInput(Inputs.GitHubToken, { required: false }),
    repository: core.getInput(Inputs.Repository, { required: false }),
    runID: parseInt(core.getInput(Inputs.RunID, { required: false })),
    pattern: core.getInput(Inputs.Pattern, { required: false }),
    mergeMultiple: core.getBooleanInput(Inputs.MergeMultiple, {
      required: false
    })
  }

  if (!inputs.path) {
    inputs.path = process.env['GITHUB_WORKSPACE'] || process.cwd()
  }

  if (inputs.path.startsWith(`~`)) {
    inputs.path = inputs.path.replace('~', os.homedir())
  }

  const resolvedPath = path.resolve(inputs.path)
  core.debug(`Resolved path is ${resolvedPath}`)

  const options: FindOptions = {}
  let repositoryOwner: string
  let repositoryName: string
  let workflowName: string = context.workflow

  if (inputs.token) {
    ;[repositoryOwner, repositoryName] = inputs.repository.split('/')
    if (!repositoryOwner || !repositoryName) {
      throw new Error(
        `Invalid repository: '${inputs.repository}'. Must be in format owner/repo`
      )
    }

    options.findBy = {
      token: inputs.token,
      workflowRunId: inputs.runID,
      repositoryName,
      repositoryOwner
    }
  } else {
    repositoryOwner = context.repo.owner
    repositoryName = context.repo.repo
  }

  core.info(
    `Owner: ${repositoryOwner}, Repo: ${repositoryName}, Run ID: ${inputs.runID}`
  )

  const { artifact: targetArtifact } = await artifactClient.getArtifact(
    inputs.name,
    options
  )

  if (!targetArtifact) {
    throw new Error(`Artifact '${inputs.name}' not found`)
  }

  core.debug(
    `Found named artifact '${inputs.name}' (ID: ${targetArtifact.id}, Size: ${targetArtifact.size})`
  )

  const link = `https://nightly.link/${repositoryOwner}/${repositoryName}/actions/artifacts/${targetArtifact.id}.zip`
  let bodyMessage = `[${inputs.description}](${link})\n`
  const horizontalLine = `\r\n\r\n<!-- comment-artifact separator start -->\r\n----\r\n<!-- comment-artifact separator end -->`

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
  const oldBody: string = pullRequest.body || ''
  let newBody = ''

  if (oldBody) {
    if (oldBody.indexOf(horizontalLine) === -1) {
      // First time updating this description -> adding horizontal line
      newBody = oldBody + horizontalLine
    }
  } else {
    // Pull Request description is empty
    newBody = horizontalLine
  }

  const messageSeperatorStart = `\r\n\r\n<!-- download-section ${workflowName} ${inputs.name} start -->\r\n`
  const messageSeperatorEnd = `\r\n<!-- download-section ${workflowName} ${inputs.name} end -->`

  if (oldBody.indexOf(messageSeperatorStart) === -1) {
    // First time updating this description
    newBody =
      oldBody + messageSeperatorStart + bodyMessage + messageSeperatorEnd
  } else {
    // we already updated this description before
    newBody = oldBody.slice(0, oldBody.indexOf(messageSeperatorStart))
    newBody = newBody + messageSeperatorStart + bodyMessage + messageSeperatorEnd
    newBody =
      newBody +
      oldBody.slice(
        oldBody.indexOf(messageSeperatorEnd) + messageSeperatorEnd.length
      )
  }

  // Update the PR body with newBody
  await octokit.rest.pulls.update({
    owner: repositoryOwner,
    repo: repositoryName,
    pull_number: pullRequestNumber,
    body: newBody
  })
}

run().catch(err =>
  core.setFailed(`Unable to download artifact(s): ${err.message}`)
)
