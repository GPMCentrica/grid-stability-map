import type { PortfolioId, WorkbookData } from '../models'

const repository = { owner: 'GPMCentrica', name: 'grid-stability-map', baseBranch: 'main' }
const apiBase = 'https://api.github.com'
const oauthBase = 'https://github.com/login'

interface DeviceAuthorization {
  device_code: string
  user_code: string
  verification_uri: string
  expires_in: number
  interval: number
}

interface TokenResponse {
  access_token?: string
  error?: string
  error_description?: string
}

interface GitHubUser {
  login: string
}

interface GitReference {
  object: { sha: string }
}

interface FileContent {
  sha: string
}

interface PullRequestResponse {
  html_url: string
  number: number
}

const headers = (token?: string) => ({
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2026-03-10',
  ...(token ? { Authorization: `Bearer ${token}` } : {}),
})

async function request<T>(url: string, init: RequestInit, fallbackMessage: string): Promise<T> {
  const response = await fetch(url, init)
  const payload = await response.json().catch(() => ({})) as { message?: string }
  if (!response.ok) throw new Error(payload.message || fallbackMessage)
  return payload as T
}

export async function startDeviceAuthorization(clientId: string): Promise<DeviceAuthorization> {
  return request<DeviceAuthorization>(`${oauthBase}/device/code`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, scope: 'public_repo' }),
  }, 'GitHub could not start sign-in. Check the OAuth client ID and that device flow is enabled.')
}

export async function pollDeviceAuthorization(clientId: string, deviceCode: string): Promise<TokenResponse> {
  return request<TokenResponse>(`${oauthBase}/oauth/access_token`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, device_code: deviceCode, grant_type: 'urn:ietf:params:oauth:grant-type:device_code' }),
  }, 'GitHub could not complete sign-in.')
}

export async function getGitHubUser(token: string): Promise<GitHubUser> {
  return request<GitHubUser>(`${apiBase}/user`, { headers: headers(token) }, 'GitHub could not confirm the signed-in account.')
}

const registerPathFor = (portfolio: PortfolioId) => `src/data/published-${portfolio}-register.json`
const encode = (content: string) => btoa(unescape(encodeURIComponent(content)))

export async function createRegisterPullRequest(token: string, portfolio: PortfolioId, workbook: WorkbookData, author: string): Promise<PullRequestResponse> {
  const branch = `register-update/${portfolio}-${new Date().toISOString().replace(/[:.]/g, '-').toLowerCase()}`
  const baseReference = await request<GitReference>(`${apiBase}/repos/${repository.owner}/${repository.name}/git/ref/heads/${repository.baseBranch}`, { headers: headers(token) }, 'GitHub could not read the current main branch.')
  await request<GitReference>(`${apiBase}/repos/${repository.owner}/${repository.name}/git/refs`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: `refs/heads/${branch}`, sha: baseReference.object.sha }),
  }, 'GitHub could not create a publication branch. You may not have write access to this repository.')

  const path = registerPathFor(portfolio)
  const currentFile = await request<FileContent>(`${apiBase}/repos/${repository.owner}/${repository.name}/contents/${path}?ref=${repository.baseBranch}`, { headers: headers(token) }, 'GitHub could not read the published register file.')
  const publishedWorkbook: WorkbookData = { ...workbook, importedFileName: `Published by ${author} on ${new Date().toISOString()}` }
  await request(`${apiBase}/repos/${repository.owner}/${repository.name}/contents/${path}`, {
    method: 'PUT',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message: `Publish ${portfolio} register update`,
      content: encode(`${JSON.stringify(publishedWorkbook, null, 2)}\n`),
      sha: currentFile.sha,
      branch,
    }),
  }, 'GitHub could not commit the register update.')

  return request<PullRequestResponse>(`${apiBase}/repos/${repository.owner}/${repository.name}/pulls`, {
    method: 'POST',
    headers: { ...headers(token), 'Content-Type': 'application/json' },
    body: JSON.stringify({
      title: `Publish ${portfolio} register update`,
      head: branch,
      base: repository.baseBranch,
      body: `Register update submitted from the Grid Stability Map by @${author}.\n\nRecords: ${workbook.plants.length}.`,
    }),
  }, 'GitHub could not create the pull request.')
}
