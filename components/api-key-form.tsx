'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AlertCircle, CheckCircle, Copy, Eye, EyeOff, Loader2, Trash2 } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface ApiKeyFormProps {
  onApiKeyChange?: () => void
}

type Status = 'idle' | 'validating' | 'success' | 'error'

export function ApiKeyForm({ onApiKeyChange }: ApiKeyFormProps) {
  const [apiKey, setApiKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  const [message, setMessage] = useState('')
  const [isCopied, setIsCopied] = useState(false)

  const handleValidate = async () => {
    if (!apiKey.trim()) {
      setStatus('error')
      setMessage('Please enter an API key')
      return
    }

    setStatus('validating')
    setMessage('')

    try {
      const response = await fetch('/api/keys/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKey.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.success) {
        setStatus('success')
        setMessage('API key validated and saved successfully')
        setApiKey('')
        onApiKeyChange?.()
      } else {
        setStatus('error')
        setMessage(data.message || 'Failed to validate API key')
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(apiKey)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2000)
    } catch (error) {
      setStatus('error')
      setMessage('Failed to copy API key')
    }
  }

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete your API key?')) return

    try {
      const response = await fetch('/api/keys/delete', {
        method: 'POST',
      })

      const data = await response.json()

      if (response.ok) {
        setStatus('success')
        setMessage('API key deleted successfully')
        setApiKey('')
        onApiKeyChange?.()
      } else {
        setStatus('error')
        setMessage(data.message || 'Failed to delete API key')
      }
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'An error occurred')
    }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="api-key" className="text-sm font-medium">
          Kilogateway API Key
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Input
              id="api-key"
              type={showKey ? 'text' : 'password'}
              placeholder="Enter your Kilogateway API key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="pr-10"
              disabled={status === 'validating'}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              aria-label="Toggle API key visibility"
            >
              {showKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
          {apiKey && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={handleCopy}
              title="Copy API key"
            >
              {isCopied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </div>

      <div className="flex gap-2">
        <Button
          onClick={handleValidate}
          disabled={!apiKey || status === 'validating'}
          className="flex-1"
        >
          {status === 'validating' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {status === 'validating' ? 'Validating...' : 'Validate & Save'}
        </Button>
        {apiKey && (
          <Button
            type="button"
            variant="destructive"
            size="icon"
            onClick={handleDelete}
            title="Delete API key"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>

      {status === 'success' && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-500" />
          <AlertDescription className="text-green-800">{message}</AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert className="border-red-500 bg-red-50">
          <AlertCircle className="h-4 w-4 text-red-500" />
          <AlertDescription className="text-red-800">{message}</AlertDescription>
        </Alert>
      )}

      <div className="text-xs text-muted-foreground space-y-1 pt-2 border-t">
        <p>
          Don&apos;t have a Kilogateway API key?{' '}
          <a
            href="https://www.kilo.ai"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Get one from Kilo
          </a>
        </p>
        <p>Your API key is encrypted and never exposed in logs or responses.</p>
      </div>
    </div>
  )
}
