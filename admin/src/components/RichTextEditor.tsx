import { useRef, useState } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import TextAlign from '@tiptap/extension-text-align'
import Image from '@tiptap/extension-image'
import { TextStyle } from '@tiptap/extension-text-style'
import FontFamily from '@tiptap/extension-font-family'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Link as LinkIcon,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  ImageIcon,
  Undo,
  Redo,
  ChevronDown,
  Loader2,
} from 'lucide-react'
import { api, ApiError } from '@/lib/api'

interface RichTextEditorProps {
  label: string
  value: string
  onChange: (html: string) => void
}

const FONTS = [
  { label: 'Default', value: '' },
  { label: 'Serif', value: 'Georgia, serif' },
  { label: 'Monospace', value: '"Courier New", monospace' },
]

interface MediaAsset {
  id: string
  url: string
}

function ToolbarButton({
  active,
  disabled,
  onClick,
  title,
  children,
}: {
  active?: boolean
  disabled?: boolean
  onClick: () => void
  title: string
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`rounded p-1.5 transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
        active ? 'bg-secondary text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'
      }`}
    >
      {children}
    </button>
  )
}

export function RichTextEditor({ label, value, onChange }: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null)
  const [uploadingImage, setUploadingImage] = useState(false)
  const [fontMenuOpen, setFontMenuOpen] = useState(false)

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false, autolink: true }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Image,
      TextStyle,
      FontFamily,
      Placeholder.configure({ placeholder: 'Describe this package...' }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: {
        class: 'prose prose-sm max-w-none min-h-40 px-3 py-2.5 focus:outline-none',
      },
    },
  })

  if (!editor) return null

  function setLink() {
    const previousUrl = editor!.getAttributes('link').href as string | undefined
    const url = window.prompt('Link URL', previousUrl || '')
    if (url === null) return
    if (url === '') {
      editor!.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor!.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
  }

  async function handleImageFile(file: File) {
    setUploadingImage(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('folder', 'products')
      const { data } = await api.upload<MediaAsset>('/admin/media/upload', formData)
      editor!.chain().focus().setImage({ src: data.url }).run()
    } catch (err) {
      window.alert(err instanceof ApiError ? err.message : 'Image upload failed')
    } finally {
      setUploadingImage(false)
    }
  }

  return (
    <div className="space-y-1">
      <span className="text-sm font-medium">{label}</span>
      <div className="rounded-md border border-border">
        <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-secondary/30 p-1.5">
          <ToolbarButton title="Undo" onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()}>
            <Undo className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Redo" onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()}>
            <Redo className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton title="Bold" active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()}>
            <Bold className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Italic" active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()}>
            <Italic className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Underline" active={editor.isActive('underline')} onClick={() => editor.chain().focus().toggleUnderline().run()}>
            <UnderlineIcon className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Link" active={editor.isActive('link')} onClick={setLink}>
            <LinkIcon className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton title="Bullet list" active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()}>
            <List className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Numbered list" active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()}>
            <ListOrdered className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton title="Align left" active={editor.isActive({ textAlign: 'left' })} onClick={() => editor.chain().focus().setTextAlign('left').run()}>
            <AlignLeft className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Align center" active={editor.isActive({ textAlign: 'center' })} onClick={() => editor.chain().focus().setTextAlign('center').run()}>
            <AlignCenter className="h-3.5 w-3.5" />
          </ToolbarButton>
          <ToolbarButton title="Align right" active={editor.isActive({ textAlign: 'right' })} onClick={() => editor.chain().focus().setTextAlign('right').run()}>
            <AlignRight className="h-3.5 w-3.5" />
          </ToolbarButton>

          <div className="mx-1 h-4 w-px bg-border" />

          <ToolbarButton title="Insert image" onClick={() => imageInputRef.current?.click()}>
            {uploadingImage ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
          </ToolbarButton>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/avif"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) handleImageFile(file)
              e.target.value = ''
            }}
          />

          <div className="relative">
            <button
              type="button"
              onClick={() => setFontMenuOpen((v) => !v)}
              className="flex items-center gap-1 rounded px-2 py-1.5 text-xs text-muted-foreground hover:bg-secondary hover:text-foreground"
            >
              Font <ChevronDown className="h-3 w-3" />
            </button>
            {fontMenuOpen && (
              <div className="absolute left-0 top-full z-10 mt-1 w-32 rounded-md border border-border bg-popover py-1 shadow-md">
                {FONTS.map((font) => (
                  <button
                    key={font.label}
                    type="button"
                    onClick={() => {
                      if (font.value) {
                        editor.chain().focus().setFontFamily(font.value).run()
                      } else {
                        editor.chain().focus().unsetFontFamily().run()
                      }
                      setFontMenuOpen(false)
                    }}
                    className="block w-full px-3 py-1.5 text-left text-xs hover:bg-secondary"
                    style={{ fontFamily: font.value || undefined }}
                  >
                    {font.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  )
}
