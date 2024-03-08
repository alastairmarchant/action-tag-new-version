import { getInput, setOutput, info, setFailed } from '@actions/core'
import { determineVersion } from './determine-version'
import { validateHistoryDepth, checkout, createTag, refExists } from './git'
import { getEnv, getEnvOrNull } from './utils'

/**
 * The main function for the action.
 * @returns {Promise<void>} Resolves when the action is complete.
 */

const VERSION_PLACEHOLDER = /{VERSION}/g

export async function run(): Promise<void> {
  try {
    await validateHistoryDepth()
    await checkout('HEAD~1')

    const previousVersion = await determineVersion()

    info(`Previous version: ${previousVersion}`)
    setOutput('previous-version', previousVersion)

    const checkoutRef = getEnvOrNull('GITHUB_HEAD_REF') || getEnv('GITHUB_REF')

    await checkout(checkoutRef)

    const currentVersion = await determineVersion()

    info(`Current version: ${currentVersion}`)
    setOutput('current-version', currentVersion)

    if (
      currentVersion !== previousVersion &&
      getInput('create-tag') !== 'false'
    ) {
      const tagTemplate = getInput('tag-template') || 'v{VERSION}'
      const tag = tagTemplate.replace(VERSION_PLACEHOLDER, currentVersion)

      const annotationTemplate =
        getInput('tag-annotation-template') || 'Released version {VERSION}'
      const annotation = annotationTemplate.replace(
        VERSION_PLACEHOLDER,
        currentVersion
      )

      if (await refExists(tag)) {
        info(`Tag ${tag} already exists`)
      } else {
        info(`Creating tag ${tag}`)
        setOutput('tag', tag)

        await createTag(tag, annotation)
      }
    }
  } catch (error: unknown) {
    let errorMessage = 'Unknown error occurred'
    if (error instanceof Error) {
      errorMessage = error.message
    }
    setFailed(errorMessage)
  }
}
