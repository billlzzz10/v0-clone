'use client'

import { useEffect, useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { AlertCircle, CheckCircle, Clock, Loader2 } from 'lucide-react'

interface ApiKeyStatus {
  hasKey: boolean
  isValid: boolean
  source: 'kilogateway' | 'manual' | null
  validatedAt: string | null
  rotationDate: string | null
}

interface ApiKeyStatusProps {
  refreshTrigger?: number
}

export function ApiKeyStatus({ refreshTrigger }: ApiKeyStatusProps) {
  const [status, setStatus] = useState<ApiKeyStatus | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchStatus()
  }, [refreshTrigger])

  const fetchStatus = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/keys/status')
      if (response.ok) {
        const data = await response.json()
        setStatus(data)
      }
    } catch (error) {
      console.error('Failed to fetch API key status:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>API Key Status</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    )
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Never'
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          API Key Status
          {status?.hasKey && (
            <Badge variant={status.isValid ? 'default' : 'destructive'}>
              {status.isValid ? 'Valid' : 'Expired'}
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          {status === null
            ? 'Unable to load API key status'
            : status.hasKey
            ? 'Your API key is configured and ready to use'
            : 'No API key configured yet'}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!status?.hasKey ? (
          <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-medium">No API key configured</p>
              <p className="text-xs text-amber-700">
                Add a Kilogateway API key to enable AI-powered features
              </p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium text-muted-foreground">Source</span>
                <Badge variant="outline">
                  {status.source === 'kilogateway' ? 'Kilogateway' : 'Manually Entered'}
                </Badge>
              </div>

              <div className="flex items-start justify-between">
                <span className="text-sm font-medium text-muted-foreground">Status</span>
                <div className="flex items-center gap-1.5">
                  {status.isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500" />
                  )}
                  <span className="text-sm font-medium">
                    {status.isValid ? 'Valid' : 'Expired or Invalid'}
                  </span>
                </div>
              </div>

              <div className="pt-2 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Last Validated</span>
                  <span className="text-right flex items-center gap-1">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(status.validatedAt)}
                  </span>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created/Rotated</span>
                  <span className="text-right">{formatDate(status.rotationDate)}</span>
                </div>
              </div>
            </div>

            {!status.isValid && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-800">
                  Your API key has expired or is no longer valid. Please update it in the settings.
                </p>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
