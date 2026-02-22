import { useEffect, useState } from 'react'
import { getDefaultAccount } from '@/lib/api'

export interface AccountContextState {
  accountId: string | null
  accountName: string | null
  loading: boolean
  error: string | null
}

export function useDefaultAccountContext(): AccountContextState {
  const [accountId, setAccountId] = useState<string | null>(null)
  const [accountName, setAccountName] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadDefaultAccount() {
      try {
        setLoading(true)
        const account = await getDefaultAccount()
        setAccountId(account.account_id)
        setAccountName(account.name)
        setError(null)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load account context')
      } finally {
        setLoading(false)
      }
    }

    loadDefaultAccount()
  }, [])

  return { accountId, accountName, loading, error }
}
