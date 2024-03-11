import fs from 'fs'
import { setOutput, info, setFailed } from '@actions/core'
import { runTestsInScratchDirectory } from './helpers/scratch-directory'
import { initRepository, addAndTrackRemote, createTag } from './helpers/git'
import { run } from '../src/main'

runTestsInScratchDirectory()

const originalOutput = process.env.GITHUB_OUTPUT
const originalRef = process.env.GITHUB_REF
const originalHeadRef = process.env.GITHUB_HEAD_REF

jest.mock('@actions/core', () => ({
  ...jest.requireActual('@actions/core'),
  // getInput: jest.fn(),
  setOutput: jest.fn(),
  info: jest.fn(),
  setFailed: jest.fn()
}))

beforeEach(async () => {
  jest.resetModules()
  await initRepository(process.cwd())

  fs.writeFileSync('package.json', JSON.stringify({ version: '1.2.3' }))

  const { execa } = await import('execa')

  await execa('git', ['add', 'package.json'])
  await execa('git', ['commit', '-m', 'Add package.json'])

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

    const { execa } = await import('execa')
    await execa('git', ['commit', '-am', 'Bump version'])
  })

  test('creates a new tag', async () => {
    console.error('CREATE-TAG', process.env['INPUT_CREATE-TAG'])
    await run()
    expect(setFailed).not.toHaveBeenCalled()
    // Ensure tags exist here and upstream
    const { execa } = await import('execa')
    await execa('git', ['rev-parse', 'v2.0.0'])
    await execa('git', ['rev-parse', 'v2.0.0'], { cwd: 'upstream' })

    expect(setOutput).toHaveBeenCalledTimes(3)
    expect(info).toHaveBeenCalledWith('Previous version: 1.2.3')
    expect(setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    expect(info).toHaveBeenCalledWith('Current version: 2.0.0')
    expect(setOutput).toHaveBeenCalledWith('current-version', '2.0.0')
    expect(info).toHaveBeenCalledWith('Creating tag v2.0.0')
    expect(setOutput).toHaveBeenCalledWith('tag', 'v2.0.0')
  })

  test('Notifies when tag exists', async () => {
    createTag('v2.0.0')

    await run()

    expect(setOutput).toHaveBeenCalledTimes(2)
    expect(info).toHaveBeenCalledTimes(3)
    expect(info).toHaveBeenCalledWith('Previous version: 1.2.3')
    expect(setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    expect(info).toHaveBeenCalledWith('Current version: 2.0.0')
    expect(setOutput).toHaveBeenCalledWith('current-version', '2.0.0')
    expect(info).toHaveBeenCalledWith('Tag v2.0.0 already exists')
  })

  test('skips tag creation when configured to', async () => {
    process.env['INPUT_CREATE-TAG'] = 'false'
    await run()

    expect(setOutput).toHaveBeenCalledTimes(2)
    expect(info).toHaveBeenCalledWith('Previous version: 1.2.3')
    expect(setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    expect(info).toHaveBeenCalledWith('Current version: 2.0.0')
    expect(setOutput).toHaveBeenCalledWith('current-version', '2.0.0')
  })
})

describe('with no version change', () => {
  test('emits the same previous and current version', async () => {
    fs.writeFileSync(
      'package.json',
      JSON.stringify({ version: '1.2.3', name: 'changed' })
    )
    const { execa } = await import('execa')
    await execa('git', ['commit', '-am', 'Change name'])

    await run()

    expect(setOutput).toHaveBeenCalledTimes(2)
    expect(info).toHaveBeenCalledWith('Previous version: 1.2.3')
    expect(setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    expect(info).toHaveBeenCalledWith('Current version: 1.2.3')
    expect(setOutput).toHaveBeenCalledWith('current-version', '1.2.3')
  })
})

describe('fails with no GITHUB_REF', () => {
  test('raises error', async () => {
    fs.writeFileSync(
      'package.json',
      JSON.stringify({ version: '1.2.3', name: 'changed' })
    )
    const { execa } = await import('execa')
    await execa('git', ['commit', '-am', 'Change name'])

    delete process.env.GITHUB_REF
    await run()

    expect(setFailed).toHaveBeenCalledWith(
      'Missing environment variable GITHUB_REF'
    )
  })
})
