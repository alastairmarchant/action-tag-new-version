import { existsSync } from 'fs'
import { sync as glob } from 'glob'
import { getInput } from '@actions/core'

export async function determineVersion(): Promise<string> {
  const command = determineVersionCommand()
  const { execaCommand } = await import('execa')
  const result = await execaCommand(command, { shell: true })
  return result.stdout.trim()
}

function determineVersionCommand(): string {
  const command = getInput('version-command')
  if (command) {
    return command
  }

  if (existsSync('package.json')) {
    return `node -p 'require("./package.json").version'`
  } else {
    const gemspecs = glob('*.gemspec')
    if (gemspecs.length === 1) {
      return `ruby -e "puts Gem::Specification.load('${gemspecs[0]}').version"`
    }
  }

  throw new Error(
    'No `version-command` specified, and unable to guess from repo contents.'
  )
}
