import fs from 'fs'
import { setOutput, info } from '@actions/core'
import { runTestsInScratchDirectory } from './helpers/scratch-directory'
import { initRepository, addAndTrackRemote } from './helpers/git'
import { run } from '../src/main'

runTestsInScratchDirectory()

const originalOutput = process.env.GITHUB_OUTPUT
const originalRef = process.env.GITHUB_REF

jest.mock('@actions/core', () => ({
  ...jest.requireActual('@actions/core'),
  // getInput: jest.fn(),
  setOutput: jest.fn(),
  info: jest.fn(),
  setFailed: jest.fn()
}))

beforeEach(async () => {
  await initRepository(process.cwd())

  fs.writeFileSync('package.json', JSON.stringify({ version: '1.2.3' }))

  const { execa } = await import('execa')

  await execa('git', ['add', 'package.json'])
  await execa('git', ['commit', '-m', 'Add package.json'])

  delete process.env.GITHUB_OUTPUT
  process.env.GITHUB_REF = 'main'
})

afterEach(() => {
  process.env.GITHUB_OUTPUT = originalOutput
  process.env.GITHUB_REF = originalRef
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
    await run()

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
    // expect(result.stdout).toMatchInlineSnapshot(`
    //   "Previous version: 1.2.3

    //   ::set-output name=previous-version::1.2.3
    //   Current version: 2.0.0

    //   ::set-output name=current-version::2.0.0
    //   Creating tag v2.0.0

    //   ::set-output name=tag::v2.0.0"
    // `)
  })

  test('skips tag creation when configured to', async () => {
    process.env['INPUT_CREATE-TAG'] = 'false'
    await run()

    expect(setOutput).toHaveBeenCalledTimes(2)
    expect(info).toHaveBeenCalledWith('Previous version: 1.2.3')
    expect(setOutput).toHaveBeenCalledWith('previous-version', '1.2.3')
    expect(info).toHaveBeenCalledWith('Current version: 2.0.0')
    expect(setOutput).toHaveBeenCalledWith('current-version', '2.0.0')

    // expect(result.stdout).toMatchInlineSnapshot(`
    //   "Previous version: 1.2.3

    //   ::set-output name=previous-version::1.2.3
    //   Current version: 2.0.0

    //   ::set-output name=current-version::2.0.0"
    // `)
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

    // expect(result.stdout).toMatchInlineSnapshot(`
    //   "Previous version: 1.2.3

    //   ::set-output name=previous-version::1.2.3
    //   Current version: 1.2.3

    //   ::set-output name=current-version::1.2.3"
    // `)
  })
})
