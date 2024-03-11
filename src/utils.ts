export function getEnvOrNull(name: string): string | null {
  const value = process.env[name]
  if (typeof value === 'string') {
    return value
  }
  return null
}

export function getEnv(name: string): string {
  const value = getEnvOrNull(name)
  if (typeof value === 'string') {
    return value
  }

  throw new Error(`Missing environment variable ${name}`)
}
