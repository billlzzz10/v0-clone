import { auth } from '@/app/(auth)/auth'
import { redirect } from 'next/navigation'
import { ApiKeyForm } from '@/components/api-key-form'
import { ApiKeyStatus } from '@/components/api-key-status'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'

export const metadata = {
  title: 'Account Settings',
  description: 'Manage your account and API key settings',
}

export default async function SettingsPage() {
  const session = await auth()

  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="container max-w-2xl py-8">
        <div className="space-y-8">
          {/* Header */}
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Account Settings</h1>
            <p className="text-muted-foreground mt-2">
              Manage your account, API keys, and authentication preferences
            </p>
          </div>

          <Separator />

          {/* Profile Section */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Profile</h2>
              <p className="text-sm text-muted-foreground">Your account information</p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Email</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-mono bg-muted p-2 rounded">
                  {session.user.email}
                </p>
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* API Key Status Section */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">API Key Status</h2>
              <p className="text-sm text-muted-foreground">
                View the current status of your Kilogateway API key
              </p>
            </div>

            <ApiKeyStatus refreshTrigger={0} />
          </section>

          <Separator />

          {/* API Key Management Section */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">API Key Management</h2>
              <p className="text-sm text-muted-foreground">
                Add or update your Kilogateway API key to enable AI features
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Add or Update API Key</CardTitle>
                <CardDescription>
                  Paste your Kilogateway API key below. We&apos;ll validate it and encrypt it securely.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ApiKeyForm />
              </CardContent>
            </Card>
          </section>

          <Separator />

          {/* Security Info Section */}
          <section className="space-y-4">
            <div>
              <h2 className="text-xl font-semibold">Security & Privacy</h2>
              <p className="text-sm text-muted-foreground">
                How your API key is protected
              </p>
            </div>

            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Encryption</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>
                    Your API key is encrypted using AES-256-GCM before being stored in the database.
                    Only you can decrypt it with your session.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Validation</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>
                    We validate your API key by making a test request to Kilogateway. Failed validations
                    are logged but the invalid key is not stored.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Usage Tracking</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>
                    We track when your API key was last validated and successfully used. This helps us
                    alert you if your key becomes invalid.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">No Logging</CardTitle>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <p>
                    Your API key is never logged, exposed in error messages, or sent to external services.
                    It&apos;s only used to make requests to Kilogateway on your behalf.
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>
        </div>
      </div>
    </main>
  )
}
