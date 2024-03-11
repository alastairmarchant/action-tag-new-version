export async function validateHistoryDepth(): Promise<void> {
  try {
    const { execa } = await import('execa')
    await execa('git', ['rev-parse', 'HEAD~1'])
  } catch {
    throw new Error(
      'This appears to be a shallow clone of your project. ' +
        'To determine whether the project version has changed and a new tag needs to be created, ' +
        'you should set a `fetch-depth` of 2 or higher on `@actions/checkout`.'
    )
  }
}

export async function refExists(ref: string): Promise<boolean> {
  try {
    const { execa } = await import('execa')
    await execa('git', ['rev-parse', ref])
    return true
  } catch {
    return false
  }
}

export async function checkout(ref: string): Promise<void> {
  const { execa } = await import('execa')
  await execa('git', ['checkout', ref])
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
  const { execa } = await import('execa')
  await execa('git', tagArgs)
  await execa('git', ['push', '--tags'])
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
  try {
    const { execa } = await import('execa')
    await execa('git', ['config', name])
    return true
  } catch {
    return false
  }
}

export async function setConfig(name: string, value: string): Promise<void> {
  const { execa } = await import('execa')
  await execa('git', ['config', name, value])
}
