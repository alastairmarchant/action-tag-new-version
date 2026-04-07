import fs from 'fs'
// import { setOutput, info, setFailed } from '@actions/core'
import { runTestsInScratchDirectory } from '../__fixtures__/scratch-directory.js'
import {
  initRepository,
  addAndTrackRemote,
  createTag
} from '../__fixtures__/git.js'
import { x } from 'tinyexec'
import * as core from '../__fixtures__/core.js'
import { jest } from '@jest/globals'

runTestsInScratchDirectory()

const originalOutput = process.env.GITHUB_OUTPUT
const originalRef = process.env.GITHUB_REF
const originalHeadRef = process.env.GITHUB_HEAD_REF

jest.unstable_mockModule('@actions/core', () => core)

// The module being tested should be imported dynamically. This ensures that the
// mocks are used in place of any actual dependencies.
const { run } = await import('../src/main.js')

beforeEach(async () => {
  jest.resetModules()
  await initRepository(process.cwd())

  fs.writeFileSync('package.json', JSON.stringify({ version: '1.2.3' }))

  await x('git', ['add', 'package.json'])
  await x('git', ['commit', '-m', 'Add package.json'])

  delete process.env.GITHUB_OUTPUT
  process.env.GITHUB_HEAD_REF = 'main'
  process.env.GITHUB_REF = 'main'
  process.env['INPUT_CREATE-TAG'] = 'true'
})

afterEach(() => {
  delete process.env.GITHUB_OUTPUT
  delete process.env.GITHUB_REF
  delete process.env.GITHUB_HEAD_REF

  jest.resetAllMocks()
})

afterAll(() => {
  process.env.GITHUB_OUTPUT = originalOutput
  process.env.GITHUB_REF = originalRef
  process.env.GITHUB_HEAD_REF = originalHeadRef
  delete process.env['INPUT_CREATE-TAG']
  jest.restoreAllMocks()
})

describe('with a changed version', () => {
  beforeEach(async () => {
    await initRepository('upstream')
    await addAndTrackRemote('origin', 'upstream/.git')

    fs.writeFileSync('package.json', JSON.stringify({ version: '2.0.0' }))

    await x('git', ['commit', '-am', 'Bump version'])
  })

  test('creates a new tag', async () => {
    await run()
    expect(core.setFailed).not.toHaveBeenCalled()
    // Ensure tags exist here and upstream
    await x('git', ['rev-parse', 'v2.0.0'])
    await x('git', ['rev-parse', 'v2.0.0'], {
      nodeOptions: { cwd: 'upstream' }
    })

    expect(core.setOutput).toHaveBeenCalledTimes(3)
    expect(core.info).toHaveBeenCalledWith('Previous version: 1.2.3')
    expect(core.setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    expect(core.info).toHaveBeenCalledWith('Current version: 2.0.0')
    expect(core.setOutput).toHaveBeenCalledWith('current-version', '2.0.0')
    expect(core.info).toHaveBeenCalledWith('Creating tag v2.0.0')
    expect(core.setOutput).toHaveBeenCalledWith('tag', 'v2.0.0')
  })

  test('creates a new tag with GITHUB_HEAD_REF unset', async () => {
    delete process.env.GITHUB_HEAD_REF
    await run()
    expect(core.setFailed).not.toHaveBeenCalled()
    // Ensure tags exist here and upstream
    await x('git', ['rev-parse', 'v2.0.0'])
    await x('git', ['rev-parse', 'v2.0.0'], {
      nodeOptions: { cwd: 'upstream' }
    })

    expect(core.setOutput).toHaveBeenCalledTimes(3)
    expect(core.info).toHaveBeenCalledWith('Previous version: 1.2.3')
    expect(core.setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    expect(core.info).toHaveBeenCalledWith('Current version: 2.0.0')
    expect(core.setOutput).toHaveBeenCalledWith('current-version', '2.0.0')
    expect(core.info).toHaveBeenCalledWith('Creating tag v2.0.0')
    expect(core.setOutput).toHaveBeenCalledWith('tag', 'v2.0.0')
  })

  test('Notifies when tag exists', async () => {
    createTag('v2.0.0')

    await run()

    expect(core.setOutput).toHaveBeenCalledTimes(2)
    expect(core.info).toHaveBeenCalledTimes(3)
    expect(core.info).toHaveBeenCalledWith('Previous version: 1.2.3')
    expect(core.setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    expect(core.info).toHaveBeenCalledWith('Current version: 2.0.0')
    expect(core.setOutput).toHaveBeenCalledWith('current-version', '2.0.0')
    expect(core.info).toHaveBeenCalledWith('Tag v2.0.0 already exists')
  })

  test('skips tag creation when configured to', async () => {
    process.env['INPUT_CREATE-TAG'] = 'false'
    await run()

    expect(core.setOutput).toHaveBeenCalledTimes(2)
    expect(core.info).toHaveBeenCalledWith('Previous version: 1.2.3')
    expect(core.setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    expect(core.info).toHaveBeenCalledWith('Current version: 2.0.0')
    expect(core.setOutput).toHaveBeenCalledWith('current-version', '2.0.0')
  })
})

describe('with no version change', () => {
  test('emits the same previous and current version', async () => {
    fs.writeFileSync(
      'package.json',
      JSON.stringify({ version: '1.2.3', name: 'changed' })
    )
    await x('git', ['commit', '-am', 'Change name'])

    await run()

    expect(core.setOutput).toHaveBeenCalledTimes(2)
    expect(core.info).toHaveBeenCalledWith('Previous version: 1.2.3')
    expect(core.setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    expect(core.info).toHaveBeenCalledWith('Current version: 1.2.3')
    expect(core.setOutput).toHaveBeenCalledWith('current-version', '1.2.3')
  })
})

describe('fails with no GITHUB_REF', () => {
  test('raises error', async () => {
    fs.writeFileSync(
      'package.json',
      JSON.stringify({ version: '1.2.3', name: 'changed' })
    )
    await x('git', ['commit', '-am', 'Change name'])

    delete process.env.GITHUB_REF
    delete process.env.GITHUB_HEAD_REF
    await run()

    expect(core.setFailed).toHaveBeenCalledWith(
      'Missing environment variable GITHUB_REF'
    )
  })
})
