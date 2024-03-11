import fs from 'fs'

export async function initRepository(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  const { execa } = await import('execa')
  await execa('git', ['init', '-b', 'main'], { cwd: dir })
  await execa('git', ['config', 'user.name', 'Test User'], { cwd: dir })
  await execa('git', ['config', 'user.email', 'test@example.com'], { cwd: dir })
  await execa('git', ['commit', '--allow-empty', '-m', 'initial commit'], {
    cwd: dir
  })
}

export async function addAndTrackRemote(
  name: string,
  url: string
): Promise<void> {
  const { execa } = await import('execa')
  await execa('git', ['remote', 'add', name, url])
  await execa('git', ['fetch', '--all'])
  await execa('git', ['branch', '--set-upstream-to', `${name}/main`])
}

export async function createTag(name: string): Promise<void> {
  const { execa } = await import('execa')
  await execa('git', ['tag', name])
  await execa('git', ['push', '--tags'])
}
