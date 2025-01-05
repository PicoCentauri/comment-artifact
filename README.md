# Add artifact link to Pull Requests

Comment Actions Artifacts from your Workflow Runs.

The action automatically edits Pull Requests' descriptions with link to download
one or more artifacts. This action is heavily inspired by the
[ReadTheDocs action](https://github.com/readthedocs/actions/tree/main/preview)
and [download-artifact action](https://github.com/actions/download-artifact)

## Usage

```yaml
- uses: PicoCentauri/comment-artifact@v1
  with:
    # Name of the artifact to link.
    name:

    # Description of the artifact download link.
    # Default is 'Download artifact for this pull request'
    description:

    # Destination path. Supports basic tilde expansion.
    # Optional. Default is $GITHUB_WORKSPACE
    path:

    # The GitHub token used to authenticate with the GitHub API.
    # This is required when downloading artifacts from a different repository
    # or from a different workflow run.
    # Optional. If unspecified, the action will download artifacts from the
    # current repo and the current workflow run.
    github-token:

    # The repository owner and the repository name joined together by "/".
    # If github-token is specified, this is the repository that artifacts will
    #be downloaded from.
    # Optional. Default is ${{ github.repository }}
    repository:

    # The id of the workflow run where the desired download artifact was
    # uploaded from. If github-token is specified, this is the run that
    # artifacts will be downloaded from.
    # Optional. Default is ${{ github.run_id }}
    run-id:
```

> [!IMPORTANT]
>
> Ensure that your action has the correct _write_ >
> [permissions](https://docs.github.com/en/actions/using-jobs/assigning-permissions-to-jobs).
> You can set these permissions either at the root level of a workflow:
>
> ```yaml
> name: 'My workflow'
>
> on: [push]
> permissions:
>   pull-requests: write
>
> jobs: ...
> ```
>
> or within the specific job where you want to use the `comment-artifact`
> action:
>
> ```yaml
> jobs:
>   stale:
>     runs-on: ubuntu-latest
>
>     permissions:
>       pull-requests: write
> ```
>
> Note that job-level permissions override root-level permissions. If you set
> `pull-requests: write` at the root level and have non-empty permissions at the
> job level without specifying them there, the action will fail.

## Example

![Example of a description edited with link to download
artifacts](pull-request-example.png)

## Contributing

If you want to help improving this action take a look the
[contributing instructions](./CONTRIBUTING.md).
