import { useState } from 'react'
import { Check, ExternalLink, Github, KeyRound, LoaderCircle, Send, X } from 'lucide-react'
import { createRegisterPullRequest, getGitHubUser, pollDeviceAuthorization, startDeviceAuthorization } from '../lib/github'
import type { PortfolioId, WorkbookData } from '../models'

interface GitHubPublishDialogProps {
  portfolio: PortfolioId
  registerName: string
  workbook: WorkbookData
  onClose: () => void
}

const portfolioLabel: Record<PortfolioId, string> = {
  retirement: 'Retirement',
  'future-generation': 'Future Generation',
  centrica: 'Centrica',
}

export function GitHubPublishDialog({ portfolio, registerName, workbook, onClose }: GitHubPublishDialogProps) {
  const clientId = import.meta.env.VITE_GITHUB_OAUTH_CLIENT_ID?.trim()
  const [deviceCode, setDeviceCode] = useState<{ userCode: string, verificationUri: string }>()
  const [token, setToken] = useState('')
  const [user, setUser] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [pullRequestUrl, setPullRequestUrl] = useState('')

  const beginSignIn = async () => {
    if (!clientId) return
    setError('')
    setStatus('Requesting a GitHub verification code...')
    try {
      const device = await startDeviceAuthorization(clientId)
      setDeviceCode({ userCode: device.user_code, verificationUri: device.verification_uri })
      setStatus('Waiting for GitHub authorization...')
      const poll = async (interval: number): Promise<void> => {
        await new Promise<void>((resolve) => window.setTimeout(resolve, interval * 1000))
        const response = await pollDeviceAuthorization(clientId, device.device_code)
        if (response.access_token) {
          const account = await getGitHubUser(response.access_token)
          setToken(response.access_token)
          setUser(account.login)
          setStatus(`Signed in as ${account.login}.`)
          return
        }
        if (response.error === 'authorization_pending') return poll(interval)
        if (response.error === 'slow_down') return poll(interval + 5)
        throw new Error(response.error_description || 'GitHub sign-in was not completed.')
      }
      void poll(device.interval).catch((reason: unknown) => {
        setStatus('')
        setError(reason instanceof Error ? reason.message : 'GitHub sign-in was not completed.')
      })
    } catch (reason) {
      setStatus('')
      setError(reason instanceof Error ? reason.message : 'GitHub sign-in could not start.')
    }
  }

  const publish = async () => {
    setError('')
    setStatus('Creating a publication branch and pull request...')
    try {
      const pullRequest = await createRegisterPullRequest(token, portfolio, workbook, user)
      setPullRequestUrl(pullRequest.html_url)
      setStatus(`Pull request #${pullRequest.number} is ready for review.`)
    } catch (reason) {
      setStatus('')
      setError(reason instanceof Error ? reason.message : 'GitHub could not publish this register.')
    }
  }

  return <div className="modal-backdrop" role="presentation" onMouseDown={onClose}><section className="github-publish-dialog" role="dialog" aria-modal="true" aria-label="Publish register to GitHub" onMouseDown={(event) => event.stopPropagation()}>
    <header><div><p>GitHub publication</p><h2>Submit {portfolioLabel[portfolio]} register</h2></div><button className="close-button" type="button" onClick={onClose} aria-label="Close GitHub publication dialog"><X size={18} /></button></header>
    <div className="publish-summary"><Github size={19} /><div><strong>{registerName}</strong><span>{workbook.plants.length} records will be submitted in a pull request to `GPMCentrica/grid-stability-map`.</span></div></div>
    {!clientId && <div className="publish-unavailable"><KeyRound size={18} /><div><strong>Publishing is not enabled yet</strong><span>A site administrator must add the `OAUTH_CLIENT_ID` repository Actions variable, then let GitHub Pages deploy the updated build.</span></div></div>}
    {clientId && !token && <button className="primary-action github-sign-in" type="button" onClick={() => void beginSignIn()} disabled={Boolean(status) && !deviceCode}><KeyRound size={16} />Sign in with GitHub</button>}
    {deviceCode && !token && <div className="device-code"><span>At GitHub, enter this code:</span><strong>{deviceCode.userCode}</strong><a href={deviceCode.verificationUri} target="_blank" rel="noreferrer">Open GitHub verification <ExternalLink size={14} /></a></div>}
    {token && !pullRequestUrl && <button className="primary-action github-publish" type="button" onClick={() => void publish()}><Send size={16} />Create pull request</button>}
    {pullRequestUrl && <a className="primary-action github-pr-link" href={pullRequestUrl} target="_blank" rel="noreferrer"><Check size={16} />Open pull request <ExternalLink size={14} /></a>}
    {status && <p className="publish-status" role="status">{!token && !pullRequestUrl && <LoaderCircle className="spinning" size={15} />}{status}</p>}
    {error && <p className="publish-error">{error}</p>}
    <footer><button className="secondary-action" type="button" onClick={onClose}>Close</button></footer>
  </section></div>
}
