import * as git from '../src/git'
import { runTestsInScratchDirectory } from './helpers/scratch-directory'
import { initRepository, addAndTrackRemote } from './helpers/git'

runTestsInScratchDirectory()

beforeEach(async () => {
  process.env.GIT_CONFIG_GLOBAL = ''
  process.env.GIT_CONFIG_SYSTEM = ''
  await initRepository(process.cwd())
})

describe('validateHistoryDepth', () => {
  test('rejects with only one commit', async () => {
    expect.assertions(1)
    try {
      await git.validateHistoryDepth()
    } catch (error) {
      if (error instanceof Error) {
        // eslint-disable-next-line jest/no-conditional-expect
        expect(error.message).toMatch('shallow clone')
      }
    }
  })

  test('resolves with multiple commits', async () => {
    expect.assertions(0)
    const { execa } = await import('execa')
    await execa('git', ['commit', '--allow-empty', '-m', 'an empty commit'])
    await git.validateHistoryDepth()
  })
})

describe('refExists', () => {
  test('returns true for existing refs', async () => {
    const { execa } = await import('execa')
    await execa('git', ['tag', 'a-tag'])
    expect(await git.refExists('HEAD')).toBe(true)
    expect(await git.refExists('main')).toBe(true)
    expect(await git.refExists('a-tag')).toBe(true)
  })

  test('returns false for non-existing refs', async () => {
    expect(await git.refExists('HEAD~3')).toBe(false)
    expect(await git.refExists('nonexistent-branch')).toBe(false)
    expect(await git.refExists('a-tag')).toBe(false)
  })
})

describe('ensureUserIsConfigured', () => {
  test('configures user.name and user.email', async () => {
    const { execa } = await import('execa')
    await execa('git', ['config', '--unset', 'user.name'])
    await execa('git', ['config', '--unset', 'user.email'])

    await git.ensureUserIsConfigured()

    const name = await execa('git', ['config', 'user.name'])
    const email = await execa('git', ['config', 'user.email'])

    expect(name.stdout.trim()).toBe('github-actions')
    expect(email.stdout.trim()).toBe('github-actions@user.noreply.github.com')
  })
})

describe('createTag', () => {
  test('creates and pushes the given tag', async () => {
    await initRepository('upstream')
    await addAndTrackRemote('foo', 'upstream/.git')

    await git.createTag('foo-bar', 'Here is my commit annotation.')
    const { execa } = await import('execa')
    const localTag = await execa('git', ['tag', '-n1'])
    expect(localTag.stdout.trim()).toMatch(
      /^foo-bar\s+Here is my commit annotation.$/
    )

    const remoteTag = await execa('git', ['tag', '-n1'], { cwd: 'upstream' })
    expect(remoteTag.stdout.trim()).toMatch(
      /^foo-bar\s+Here is my commit annotation.$/
    )
  })
})
