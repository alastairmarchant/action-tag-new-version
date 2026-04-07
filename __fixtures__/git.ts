import fs from 'fs'
import { x } from 'tinyexec'

export async function initRepository(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir)
  }
  await x('git', ['init', '-b', 'main'], { nodeOptions: { cwd: dir } })
  await x('git', ['config', 'user.name', 'Test User'], {
    nodeOptions: { cwd: dir }
  })
  await x('git', ['config', 'user.email', 'test@example.com'], {
    nodeOptions: { cwd: dir }
  })
  await x('git', ['commit', '--allow-empty', '-m', 'initial commit'], {
    nodeOptions: { cwd: dir }
  })
}

export async function addAndTrackRemote(
  name: string,
  url: string
): Promise<void> {
  await x('git', ['remote', 'add', name, url])
  await x('git', ['fetch', '--all'])
  await x('git', ['branch', '--set-upstream-to', `${name}/main`])
}

export async function createTag(name: string): Promise<void> {
  await x('git', ['tag', name])
  await x('git', ['push', '--tags'])
}
