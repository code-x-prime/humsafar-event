import { useRef, useState } from 'react'
import { Upload, X, Loader2, AlertTriangle } from 'lucide-react'
import { Link } from 'react-router'
import { api, ApiError } from '@/lib/api'

export interface UploadedImage {
  mediaId: string
  r2Key: string
  url: string
}

interface ImageDropzoneProps {
  label: string
  value: UploadedImage | null
  onChange: (image: UploadedImage | null) => void
  folder: string
  recommendedSize?: string
}

interface MediaAsset {
  id: string
  r2Key: string
  url: string
}

export function ImageDropzone({ label, value, onChange, folder, recommendedSize }: ImageDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notConfigured, setNotConfigured] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  async function uploadFile(file: File) {
    setError(null)
    setNotConfigured(false)
    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', folder)

      // Uploaded through our server (which then PUTs to R2) rather than a
      // presigned direct-to-R2 browser upload — the bucket has no CORS policy
      // for cross-origin PUTs, so a direct upload fails in the browser even
      // though the same request works fine from a server or curl.
      const { data } = await api.upload<MediaAsset>('/admin/media/upload', formData)

      // Replacing an existing image: delete the old R2 object now that the
      // new one has uploaded successfully, so nothing is left orphaned.
      if (value) {
        api.delete(`/admin/media/${value.mediaId}`).catch(() => {
          // Best-effort — the new image is already set either way.
        })
      }

      onChange({ mediaId: data.id, r2Key: data.r2Key, url: data.url })
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
    const file = files?.[0]
    if (file) uploadFile(file)
  }

  function handleRemove() {
    if (value) {
      api.delete(`/admin/media/${value.mediaId}`).catch(() => {
        // Best-effort — the field is cleared from the form regardless.
      })
    }
    onChange(null)
  }

  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{label}</span>

      {value ? (
        <div className="relative w-fit">
          <img src={value.url} alt="" className="h-24 w-40 rounded-md border border-border object-cover" />
          <button
            type="button"
            onClick={handleRemove}
            className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-white"
            aria-label="Remove image"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ) : (
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
          className={`flex h-24 w-40 cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed text-xs text-muted-foreground transition-colors ${
            dragOver ? 'border-primary bg-secondary/50' : 'border-border'
          }`}
        >
          {uploading ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span className="mt-1">Drag or click to upload</span>
              {recommendedSize && <span className="mt-0.5 text-[10px] text-muted-foreground/80">{recommendedSize}</span>}
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
      )}

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
