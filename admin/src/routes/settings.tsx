import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Phone, Cloud, CreditCard, Mail, Lock, Check, Truck } from 'lucide-react'

type SettingsGroupData = Record<string, string | number | boolean | undefined>

const GROUPS = [
  {
    key: 'contact',
    label: 'Contact',
    icon: Phone,
    description: 'How customers reach you and where booking notifications go.',
    fields: [
      { name: 'whatsappNumber', label: 'WhatsApp Number', hint: 'With country code, no + or spaces — e.g. 919899899150', secret: false },
      { name: 'orderNotifyEmail', label: 'Order Notification Email', hint: 'Receives a copy of every paid booking', secret: false },
    ],
  },
  {
    key: 'storage',
    label: 'Storage',
    icon: Cloud,
    description: 'Cloudflare R2 credentials for product images and uploads.',
    fields: [
      { name: 'accountId', label: 'Account ID', secret: false },
      { name: 'accessKeyId', label: 'Access Key ID', secret: false },
      { name: 'secretAccessKey', label: 'Secret Access Key', secret: true },
      { name: 'bucket', label: 'Bucket', secret: false },
      { name: 'publicUrl', label: 'Public URL', secret: false },
    ],
  },
  {
    key: 'payment',
    label: 'Payment',
    icon: CreditCard,
    description: 'Razorpay keys used to collect payments at checkout.',
    fields: [
      { name: 'keyId', label: 'Key ID', secret: false },
      { name: 'keySecret', label: 'Key Secret', secret: true },
      { name: 'webhookSecret', label: 'Webhook Secret', secret: true },
    ],
  },
  {
    key: 'email',
    label: 'Email',
    icon: Mail,
    description: 'Transactional email provider for OTPs, receipts, and notifications.',
    fields: [
      {
        name: 'provider',
        label: 'Provider',
        secret: false,
        options: [
          { value: 'BREVO', label: 'Brevo' },
          { value: 'SMTP', label: 'SMTP' },
        ],
      },
      { name: 'fromName', label: 'From Name', secret: false },
      { name: 'fromEmail', label: 'From Email', secret: false },
      { name: 'smtpHost', label: 'SMTP Host', secret: false },
      { name: 'smtpPort', label: 'SMTP Port', secret: false },
      { name: 'smtpUser', label: 'SMTP User', secret: false },
      { name: 'smtpPassword', label: 'SMTP Password', secret: true },
      { name: 'brevoApiKey', label: 'Brevo API Key', secret: true },
    ],
  },
  {
    key: 'shipping',
    label: 'Shipping (Shop With Us)',
    icon: Truck,
    description: 'Shiprocket account, pickup warehouse address, and shop tax rate — used only by Shop With Us orders.',
    fields: [
      { name: 'shiprocketEmail', label: 'Shiprocket Email', secret: false },
      { name: 'shiprocketPassword', label: 'Shiprocket Password', secret: true },
      {
        name: 'shipmentMode',
        label: 'Shipment Mode',
        hint: 'Auto: every new paid order is pushed to Shiprocket and assigned a courier automatically. Manual: you ship each order yourself from the order screen.',
        secret: false,
        options: [
          { value: 'AUTO', label: 'Auto — ship automatically' },
          { value: 'MANUAL', label: 'Manual — I’ll assign couriers myself' },
        ],
      },
      { name: 'pickupLocationName', label: 'Shiprocket Pickup Location Nickname', hint: 'Must exactly match a pickup address already added in your Shiprocket dashboard', secret: false },
      { name: 'warehouseName', label: 'Warehouse Contact Name', secret: false },
      { name: 'warehousePhone', label: 'Warehouse Phone', secret: false },
      { name: 'warehouseAddress', label: 'Warehouse Address Line', secret: false },
      { name: 'warehouseCity', label: 'Warehouse City', secret: false },
      { name: 'warehouseState', label: 'Warehouse State', secret: false },
      { name: 'warehousePincode', label: 'Warehouse Pincode', secret: false },
      { name: 'shopTaxPercent', label: 'Tax / GST %', hint: 'A percentage added to every Shop With Us order, e.g. enter 18 for 18% GST', secret: false },
    ],
  },
] as const

function SettingsGroupCard({ group }: { group: (typeof GROUPS)[number] }) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<SettingsGroupData>({})
  const [saved, setSaved] = useState(false)
  const Icon = group.icon

  const { data, isLoading } = useQuery({
    queryKey: ['settings', group.key],
    queryFn: () => api.get<SettingsGroupData>(`/admin/settings/${group.key}`),
  })

  useEffect(() => {
    if (data?.data) setForm(data.data)
  }, [data])

  const saveMutation = useMutation({
    mutationFn: (payload: SettingsGroupData) => api.put(`/admin/settings/${group.key}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings', group.key] })
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  return (
    <Card>
      <CardHeader className="flex-row items-start gap-3 space-y-0">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="h-4.5 w-4.5" />
        </span>
        <div>
          <CardTitle>{group.label}</CardTitle>
          <CardDescription className="mt-0.5">{group.description}</CardDescription>
        </div>
      </CardHeader>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          // Masked secret fields (start with ••••) are left out of the payload
          // so saving without retyping a password doesn't overwrite it with the mask.
          const payload = Object.fromEntries(
            Object.entries(form).filter(([, v]) => typeof v !== 'string' || !v.startsWith('••••'))
          )
          saveMutation.mutate(payload)
        }}
      >
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {isLoading &&
            group.fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-9 w-full" />
              </div>
            ))}

          {!isLoading &&
            group.fields.map((field) => (
              <div key={field.name} className="space-y-1.5">
                <Label htmlFor={field.name} className="flex items-center gap-1.5">
                  {field.label}
                  {field.secret && <Lock className="h-3 w-3 text-muted-foreground" />}
                </Label>
                {'options' in field && field.options ? (
                  <select
                    id={field.name}
                    value={String(form[field.name] ?? field.options[0].value)}
                    onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    {field.options.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                ) : (
                  <Input
                    id={field.name}
                    type={field.secret ? 'password' : 'text'}
                    placeholder={field.secret ? 'Leave blank to keep existing value' : undefined}
                    value={String(form[field.name] ?? '')}
                    onChange={(e) => setForm({ ...form, [field.name]: e.target.value })}
                  />
                )}
                {'hint' in field && field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
              </div>
            ))}
        </CardContent>

        <CardFooter className="justify-end gap-2 bg-transparent px-(--card-spacing) pt-4">
          <Button type="submit" disabled={isLoading || saveMutation.isPending} className="min-w-24">
            {saveMutation.isPending ? (
              'Saving...'
            ) : saved ? (
              <span className="flex items-center gap-1.5">
                <Check className="h-4 w-4" /> Saved
              </span>
            ) : (
              'Save Changes'
            )}
          </Button>
        </CardFooter>
      </form>
    </Card>
  )
}

export function SettingsPage() {
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Stored encrypted in the database — never in environment variables.
      </p>

      <div className="mt-6 flex flex-col gap-6">
        {GROUPS.map((group) => (
          <SettingsGroupCard key={group.key} group={group} />
        ))}
      </div>
    </div>
  )
}
