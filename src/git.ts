import { x } from 'tinyexec'

export async function validateHistoryDepth(): Promise<void> {
  const result = await x('git', ['rev-parse', 'HEAD~1'])
  if (result.exitCode !== 0) {
    throw new Error(
      'This appears to be a shallow clone of your project. ' +
        'To determine whether the project version has changed and a new tag needs to be created, ' +
        'you should set a `fetch-depth` of 2 or higher on `@actions/checkout`.'
    )
  }
}

export async function refExists(ref: string): Promise<boolean> {
  const result = await x('git', ['rev-parse', ref])
  return result.exitCode === 0
}

export async function checkout(ref: string): Promise<void> {
  await x('git', ['checkout', ref])
}

export async function createTag(
  name: string,
  annotation: string
): Promise<void> {
  const tagArgs = ['tag', name]
  if (annotation.length) {
    // If we're pushing an annotation, `user.name` and `user.email` must be configured.
    await ensureUserIsConfigured()

    tagArgs.push('-m', annotation)
  }
  await x('git', tagArgs)
  await x('git', ['push', '--tags'])
}

export async function ensureUserIsConfigured(): Promise<void> {
  if (!(await hasConfig('user.name'))) {
    await setConfig('user.name', 'github-actions')
  }

  if (!(await hasConfig('user.email'))) {
    await setConfig('user.email', 'github-actions@user.noreply.github.com')
  }
}

export async function hasConfig(name: string): Promise<boolean> {
  const result = await x('git', ['config', name])
  return result.exitCode === 0
}

export async function setConfig(name: string, value: string): Promise<void> {
  await x('git', ['config', name, value])
}
