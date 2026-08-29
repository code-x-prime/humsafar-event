import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { api, ApiError } from '@/lib/api'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { Pagination } from '@/components/Pagination'
import { Pencil, Search } from 'lucide-react'

const PAGE_SIZE = 30
const ACTIVE_OPTIONS = [
  { value: '', label: 'All' },
  { value: 'true', label: 'Active' },
  { value: 'false', label: 'Inactive' },
]

interface ShopProduct {
  id: string
  title: string
  price: string
  stock: number
  isActive: boolean
  isFeatured: boolean
  categories: { category: { id: string; name: string } }[]
  media: { id: string; url: string }[]
}

function errorMessage(err: unknown) {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

export function ShopProductsPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(1, Number(searchParams.get('page')) || 1)
  const search = searchParams.get('search') || ''
  const isActive = searchParams.get('isActive') || ''
  const isFeatured = searchParams.get('isFeatured') === 'true'

  const [searchDraft, setSearchDraft] = useState(search)
  useEffect(() => setSearchDraft(search), [search])
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft !== search) updateParams({ search: searchDraft, page: null })
    }, 300)
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft])

  const query = new URLSearchParams({ page: String(page), limit: String(PAGE_SIZE) })
  if (search) query.set('search', search)
  if (isActive) query.set('isActive', isActive)
  if (isFeatured) query.set('isFeatured', 'true')

  const { data, isLoading } = useQuery({
    queryKey: ['shop-products', page, search, isActive, isFeatured],
    queryFn: () => api.get<ShopProduct[]>(`/admin/shop-products?${query.toString()}`),
  })
  const products = data?.data ?? []
  const totalPages = (data?.meta as { totalPages?: number } | undefined)?.totalPages ?? 1

  function updateParams(changes: Record<string, string | boolean | null>) {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      for (const [key, value] of Object.entries(changes)) {
        if (value === null || value === '' || value === false) next.delete(key)
        else next.set(key, String(value))
      }
      return next
    })
  }

  function goToPage(nextPage: number) {
    updateParams({ page: nextPage <= 1 ? null : String(nextPage) })
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: string; value: boolean }) =>
      api.patch(`/admin/shop-products/${id}/toggle`, { field, value }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['shop-products'] }),
    onError: (err) => toast.error(errorMessage(err)),
  })

  const removeMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/shop-products/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shop-products'] })
      toast.success('Product deleted')
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-primary">Shop With Us — Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Physical products sold and shipped via Shiprocket — separate from decoration booking packages.
          </p>
        </div>
        <Button onClick={() => navigate('/shop/products/new')}>Add Product</Button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder="Search by title..."
            className="pl-8"
          />
        </div>

        <select
          value={isActive}
          onChange={(e) => updateParams({ isActive: e.target.value, page: null })}
          className="h-8 rounded-md border border-input bg-background px-2.5 text-sm"
        >
          {ACTIVE_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>

        <label className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Switch checked={isFeatured} onCheckedChange={(value) => updateParams({ isFeatured: value, page: null })} />
          Featured only
        </label>

        {data && (
          <p className="ml-auto text-sm text-muted-foreground">
            {(data.meta as { total?: number } | undefined)?.total ?? products.length} product
            {((data.meta as { total?: number } | undefined)?.total ?? products.length) === 1 ? '' : 's'}
          </p>
        )}
      </div>

      <div className="mt-4 overflow-x-auto rounded-md border border-border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead>Active</TableHead>
              <TableHead>Featured</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-10 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-10" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-9 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-9 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="ml-auto h-8 w-24" /></TableCell>
                </TableRow>
              ))}

            {!isLoading && products.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-muted-foreground">
                  {search || isActive || isFeatured ? 'No products match these filters.' : 'No shop products yet.'}
                </TableCell>
              </TableRow>
            )}

            {!isLoading &&
              products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell>
                    {product.media[0] ? (
                      <img src={product.media[0].url} alt="" className="h-10 w-10 rounded object-cover" />
                    ) : (
                      <span className="text-xs text-muted-foreground">No image</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium">{product.title}</TableCell>
                  <TableCell>&#8377;{product.price}</TableCell>
                  <TableCell className={product.stock === 0 ? 'text-destructive' : ''}>{product.stock}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {product.categories.map((c) => c.category.name).join(', ') || '—'}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.isActive}
                      onCheckedChange={(value) => toggleMutation.mutate({ id: product.id, field: 'isActive', value })}
                    />
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={product.isFeatured}
                      onCheckedChange={(value) => toggleMutation.mutate({ id: product.id, field: 'isFeatured', value })}
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="sm" onClick={() => navigate(`/shop/products/${product.id}`)} title="Edit">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => removeMutation.mutate(product.id)} title="Delete">
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={goToPage} />
    </div>
  )
}
