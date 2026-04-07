import { existsSync } from 'fs'
import { sync as glob } from 'glob'
import { getInput } from '@actions/core'
import { x } from 'tinyexec'
import { tokenizeArgs } from 'args-tokenizer'

export async function determineVersion(): Promise<string> {
  const [command, ...args] = determineVersionCommand()
  const result = await x(command, args, { nodeOptions: { shell: true } })
  return result.stdout.trim()
}

function determineVersionCommand(): string[] {
  const command = getInput('version-command')
  if (command) {
    return tokenizeArgs(command)
  }

  if (existsSync('package.json')) {
    return ['jq', '-r', '.version', 'package.json']
  } else {
    const gemspecs = glob('*.gemspec')
    if (gemspecs.length === 1) {
      return [
        'ruby',
        '-e',
        `puts\\ Gem::Specification.load\\(\\'${gemspecs[0]}\\'\\).version`
      ]
    }
  }

  throw new Error(
    'No `version-command` specified, and unable to guess from repo contents.'
  )
}
