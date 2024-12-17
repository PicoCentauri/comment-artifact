# Create a GitHub Action Using TypeScript

[![GitHub Super-Linter](https://github.com/PicoCentauri/comment-artifact/actions/workflows/linter.yml/badge.svg)](https://github.com/super-linter/super-linter)
![CI](https://github.com/PicoCentauri/comment-artifact/actions/workflows/ci.yml/badge.svg)
[![Check dist/](https://github.com/PicoCentauri/comment-artifact/actions/workflows/check-dist.yml/badge.svg)](https://github.com/PicoCentauri/comment-artifact/actions/workflows/check-dist.yml)
[![CodeQL](https://github.com/PicoCentauri/comment-artifact/actions/workflows/codeql-analysis.yml/badge.svg)](https://github.com/PicoCentauri/comment-artifact/actions/workflows/codeql-analysis.yml)

# Add artifact link to Pull Requests

Comment Actions Artifacts from your Workflow Runs.

The action automatically edits Pull Requests' descriptions with link to download
one or more artifacts. This action is heavily inspired by the
[ReadTheDocs action](https://github.com/readthedocs/actions/tree/main/preview)
and [download-artifact action](https://github.com/actions/download-artifact)

## Example

![Example of a description edited with link to download
artifacts](pull-request-example.png)

# Usage

```yaml
- uses: PicoCentauri/comment-artifact@main
  with:
    # Name of artifact defined using the
    name:

    # Description of link text that should appear in the updated comment of your
    # pull request. Default is 'Download artifact for this pull request'
    description:

    # Destination path. Supports basic tilde expansion.
    # Optional. Default is $GITHUB_WORKSPACE
    path:

    # A glob pattern to the artifacts that should be downloaded.
    # Ignored if name is specified.
    # Optional.
    pattern:

    # The GitHub token used to authenticate with the GitHub API.
    # This is required when downloading artifacts from a different repository or from a different workflow run.
    # Optional. If unspecified, the action will download artifacts from the current repo and the current workflow run.
    github-token:

    # The repository owner and the repository name joined together by "/".
    # If github-token is specified, this is the repository that artifacts will be downloaded from.
    # Optional. Default is ${{ github.repository }}
    repository:

    # The id of the workflow run where the desired download artifact was uploaded from.
    # If github-token is specified, this is the run that artifacts will be downloaded from.
    # Optional. Default is ${{ github.run_id }}
    run-id:
```

To allow the update of the comment change the
[permissions](https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs)
of your Github Action to

```yaml
permissions:
  pull-requests: write
```
