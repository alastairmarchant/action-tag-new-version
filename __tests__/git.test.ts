import * as git from '../src/git.js'
import { runTestsInScratchDirectory } from '../__fixtures__/scratch-directory.js'
import { initRepository, addAndTrackRemote } from '../__fixtures__/git.js'
import { x } from 'tinyexec'

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
    await x('git', ['commit', '--allow-empty', '-m', 'an empty commit'])
    await git.validateHistoryDepth()
  })
})

describe('refExists', () => {
  test('returns true for existing refs', async () => {
    await x('git', ['tag', 'a-tag'])
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
    await x('git', ['config', '--unset', 'user.name'])
    await x('git', ['config', '--unset', 'user.email'])

    await git.ensureUserIsConfigured()

    const name = await x('git', ['config', 'user.name'])
    const email = await x('git', ['config', 'user.email'])

    expect(name.stdout.trim()).toBe('github-actions')
    expect(email.stdout.trim()).toBe('github-actions@user.noreply.github.com')
  })
})

describe('createTag', () => {
  test('creates and pushes the given tag', async () => {
    await initRepository('upstream')
    await addAndTrackRemote('foo', 'upstream/.git')

    await git.createTag('foo-bar', 'Here is my commit annotation.')
    const localTag = await x('git', ['tag', '-n1'])
    expect(localTag.stdout.trim()).toMatch(
      /^foo-bar\s+Here is my commit annotation.$/
    )

    const remoteTag = await x('git', ['tag', '-n1'], {
      nodeOptions: { cwd: 'upstream' }
    })
    expect(remoteTag.stdout.trim()).toMatch(
      /^foo-bar\s+Here is my commit annotation.$/
    )
  })

  test('creates and pushes the given tag without annotation', async () => {
    await initRepository('upstream')
    await addAndTrackRemote('foo', 'upstream/.git')

    await git.createTag('foo-bar', '')
    const localTag = await x('git', ['tag', '-n1'])
    expect(localTag.stdout.trim()).toMatch(/^foo-bar\s+initial commit$/)

    const remoteTag = await x('git', ['tag', '-n1'], {
      nodeOptions: { cwd: 'upstream' }
    })
    expect(remoteTag.stdout.trim()).toMatch(/^foo-bar\s+initial commit$/)
  })
})
