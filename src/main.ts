import * as core from '@actions/core'
import { determineVersion } from './determine-version.js'
import { validateHistoryDepth, checkout, createTag, refExists } from './git.js'
import { getEnv, getEnvOrNull } from './utils.js'

const VERSION_PLACEHOLDER = /{VERSION}/g

/**
 * The main function for the action.
 *
 * @returns Resolves when the action is complete.
 */
export async function run(): Promise<void> {
  try {
    await validateHistoryDepth()
    await checkout('HEAD~1')

    const previousVersion = await determineVersion()

    core.info(`Previous version: ${previousVersion}`)
    core.setOutput('previous-version', previousVersion)

    const checkoutRef = getEnvOrNull('GITHUB_HEAD_REF') || getEnv('GITHUB_REF')

    await checkout(checkoutRef)

    const currentVersion = await determineVersion()

    core.info(`Current version: ${currentVersion}`)
    core.setOutput('current-version', currentVersion)

    if (
      currentVersion !== previousVersion &&
      core.getInput('create-tag') !== 'false'
    ) {
      const tagTemplate = core.getInput('tag-template') || 'v{VERSION}'
      const tag = tagTemplate.replace(VERSION_PLACEHOLDER, currentVersion)

      const annotationTemplate =
        core.getInput('tag-annotation-template') || 'Released version {VERSION}'
      const annotation = annotationTemplate.replace(
        VERSION_PLACEHOLDER,
        currentVersion
      )

      if (await refExists(tag)) {
        core.info(`Tag ${tag} already exists`)
      } else {
        core.info(`Creating tag ${tag}`)
        core.setOutput('tag', tag)

        await createTag(tag, annotation)
      }
    }
  } catch (error: unknown) {
    let errorMessage = 'Unknown error occurred'
    /* istanbul ignore if */
    if (error instanceof Error) {
      errorMessage = error.message
    }
    core.setFailed(errorMessage)
  }
}
