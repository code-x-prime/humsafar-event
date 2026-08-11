import { useRef, useState } from 'react'
import { Upload, X, Loader2, AlertTriangle, GripVertical, Star } from 'lucide-react'
import { Link } from 'react-router'
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core'
import { SortableContext, useSortable, arrayMove, rectSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { api, ApiError } from '@/lib/api'

export interface UploadedProductImage {
  mediaId: string
  r2Key: string
  url: string
}

interface MultiImageDropzoneProps {
  label: string
  value: UploadedProductImage[]
  onChange: (images: UploadedProductImage[]) => void
  folder: string
  max?: number
}

interface MediaAsset {
  id: string
  r2Key: string
  url: string
}

function SortableThumb({
  image,
  isPrimary,
  onRemove,
}: {
  image: UploadedProductImage
  isPrimary: boolean
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: image.mediaId })
  const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }

  return (
    <div ref={setNodeRef} style={style} className="relative w-32">
      <img src={image.url} alt="" className="h-32 w-32 rounded-lg border border-border object-cover" />
      <div
        {...attributes}
        {...listeners}
        className="absolute inset-x-0 top-0 flex cursor-grab items-center justify-center gap-1 rounded-t-lg bg-black/55 py-1 text-white active:cursor-grabbing"
      >
        <GripVertical className="h-3.5 w-3.5" />
        <span className="text-[10px]">Drag to reorder</span>
      </div>
      {isPrimary && (
        <span className="absolute bottom-1.5 left-1.5 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-[10px] font-medium text-primary-foreground shadow">
          <Star className="h-2.5 w-2.5 fill-current" /> Cover image
        </span>
      )}
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-2 -top-2 rounded-full border-2 border-background bg-destructive p-1 text-white shadow"
        aria-label="Remove image"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

export function MultiImageDropzone({ label, value, onChange, folder, max = 5 }: MultiImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)
  const [dragOver, setDragOver] = useState(false)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const remaining = max - value.length

  async function uploadFiles(files: File[]) {
    const toUpload = files.slice(0, remaining)
    if (toUpload.length === 0) return

    setError(null)
    setNotConfigured(false)
    setUploading(true)

    try {
      const uploaded: UploadedProductImage[] = []
      for (const file of toUpload) {
        const formData = new FormData()
        formData.append('file', file)
        formData.append('folder', folder)
        const { data } = await api.upload<MediaAsset>('/admin/media/upload', formData)
        uploaded.push({ mediaId: data.id, r2Key: data.r2Key, url: data.url })
      }
      onChange([...value, ...uploaded])
    } catch (err) {
      if (err instanceof ApiError && err.code === 'NOT_CONFIGURED') {
        setNotConfigured(true)
      } else {
        setError(err instanceof Error ? err.message : 'Upload failed')
      }
    } finally {
      setUploading(false)
    }
  }

  function handleFiles(files: FileList | null) {
    if (files) uploadFiles(Array.from(files))
  }

  // Only removes the image from this form's in-memory list — the underlying
  // R2 object is cleaned up server-side on save (product.service.js's
  // syncMedia diffs the saved media against what's submitted here). We can't
  // safely call DELETE /admin/media/:id ourselves: mediaId here is a
  // ProductMedia id for images loaded from an existing product, not a
  // MediaAsset id, so that call would just silently 404.
  function handleRemove(mediaId: string) {
    onChange(value.filter((v) => v.mediaId !== mediaId))
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const oldIndex = value.findIndex((v) => v.mediaId === active.id)
    const newIndex = value.findIndex((v) => v.mediaId === over.id)
    onChange(arrayMove(value, oldIndex, newIndex))
  }

  return (
    <div className="space-y-2">
      <div>
        <span className="text-sm font-medium">
          {label} <span className="font-normal text-muted-foreground">({value.length}/{max})</span>
        </span>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Upload up to {max} photos. The first one is used as the cover photo everywhere on the
          site — drag any thumbnail to reorder them.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={value.map((v) => v.mediaId)} strategy={rectSortingStrategy}>
            {value.map((image, i) => (
              <SortableThumb key={image.mediaId} image={image} isPrimary={i === 0} onRemove={() => handleRemove(image.mediaId)} />
            ))}
          </SortableContext>
        </DndContext>

        {remaining > 0 && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault()
              setDragOver(true)
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault()
              setDragOver(false)
              handleFiles(e.dataTransfer.files)
            }}
            className={`flex h-32 w-32 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center text-xs text-muted-foreground transition-colors ${
              dragOver ? 'border-primary bg-secondary/50' : 'border-border hover:border-primary/50 hover:bg-secondary/30'
            }`}
          >
            {uploading ? (
              <>
                <Loader2 className="h-6 w-6 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-6 w-6" />
                <span className="px-2 font-medium">Drag &amp; drop</span>
                <span className="px-2">or click to browse</span>
                <span className="mt-0.5 rounded-full bg-secondary px-2 py-0.5 text-[10px]">{remaining} left</span>
              </>
            )}
            <input
              ref={inputRef}
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/avif"
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </div>
        )}
      </div>

      {notConfigured && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
          Cloudflare R2 is not configured —{' '}
          <Link to="/settings" className="underline">
            add credentials in Settings → Storage
          </Link>
          .
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
