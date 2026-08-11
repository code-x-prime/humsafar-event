import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet'
import { Pencil, Mail, KeyRound, RotateCcw, UserCheck } from 'lucide-react'

interface User {
  id: string
  name: string | null
  email: string | null
  phone: string | null
  isActive: boolean
  emailVerifiedAt: string | null
  lastLoginAt: string | null
  createdAt: string
}

type VerifyFilter = 'all' | 'verified' | 'unverified'

const EMPTY_FORM = { name: '', email: '' }

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

export function UsersPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [verifyFilter, setVerifyFilter] = useState<VerifyFilter>('all')
  const [editing, setEditing] = useState<User | null>(null)
  const [form, setForm] = useState(EMPTY_FORM)

  const { data, isLoading } = useQuery({
    queryKey: ['users', { search }],
    queryFn: () => api.get<User[]>(`/admin/users?limit=200${search ? `&search=${encodeURIComponent(search)}` : ''}`),
  })

  const allUsers = data?.data ?? []
  const users = allUsers.filter((u) => {
    if (verifyFilter === 'verified') return !!u.emailVerifiedAt
    if (verifyFilter === 'unverified') return !u.emailVerifiedAt
    return true
  })

  function openEdit(user: User) {
    setForm({ name: user.name ?? '', email: user.email ?? '' })
    setEditing(user)
  }

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: typeof EMPTY_FORM }) => api.patch(`/admin/users/${id}`, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setEditing(null)
      toast.success('User updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const toggleMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: boolean }) => api.patch(`/admin/users/${id}/toggle`, { field: 'isActive', value }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User status updated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/users/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User deactivated — they can no longer log in')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const reactivateMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/reactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success('User reactivated')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const resendVerificationMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/resend-verification`),
    onSuccess: () => toast.success('Verification code sent to the user\'s email'),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const resetPasswordMutation = useMutation({
    mutationFn: (id: string) => api.post(`/admin/users/${id}/reset-password`),
    onSuccess: () => toast.success('New password emailed to the user'),
    onError: (err) => toast.error(errorMessage(err)),
  })

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (editing) updateMutation.mutate({ id: editing.id, payload: form })
  }

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold text-primary">Users</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Registered customers — verify status, edit details, reset passwords, or deactivate accounts.
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Input placeholder="Search name, email, phone..." value={search} onChange={(e) => setSearch(e.target.value)} className="max-w-xs" />
        <div className="flex gap-1 rounded-md border border-border p-1">
          {(['all', 'verified', 'unverified'] as VerifyFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setVerifyFilter(f)}
              className={`rounded px-3 py-1 text-xs font-medium capitalize transition-colors ${
                verifyFilter === f ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-secondary'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Verified</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Last Login</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={6}>
                    <Skeleton className="h-6 w-full" />
                  </TableCell>
                </TableRow>
              ))}

            {!isLoading && users.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-muted-foreground">
                  No users found.
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              users.map((user) => (
                <TableRow key={user.id}>
                  <TableCell className="font-medium">{user.name || '—'}</TableCell>
                  <TableCell>{user.email || '—'}</TableCell>
                  <TableCell>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                        user.emailVerifiedAt ? 'bg-green-500/10 text-green-600' : 'bg-amber-500/10 text-amber-600'
                      }`}
                    >
                      {user.emailVerifiedAt ? 'Verified' : 'Unverified'}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Switch checked={user.isActive} onCheckedChange={(value) => toggleMutation.mutate({ id: user.id, value })} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Never'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(user)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      {!user.emailVerifiedAt && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resendVerificationMutation.mutate(user.id)}
                          title="Resend verification code"
                        >
                          <Mail className="h-4 w-4" />
                        </Button>
                      )}
                      <Button variant="ghost" size="sm" onClick={() => resetPasswordMutation.mutate(user.id)} title="Reset password">
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {user.isActive ? (
                        <Button variant="ghost" size="sm" onClick={() => deactivateMutation.mutate(user.id)} title="Deactivate">
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      ) : (
                        <Button variant="ghost" size="sm" onClick={() => reactivateMutation.mutate(user.id)} title="Reactivate">
                          <UserCheck className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Sheet open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Edit User</SheetTitle>
          </SheetHeader>
          <form className="flex flex-col gap-4 px-4" onSubmit={handleSubmit}>
            <div className="space-y-1">
              <Label htmlFor="u-name">Name</Label>
              <Input id="u-name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label htmlFor="u-email">Email</Label>
              <Input id="u-email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </div>
            <SheetFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  )
}
