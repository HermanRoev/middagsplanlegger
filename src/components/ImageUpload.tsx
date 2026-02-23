"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface ImageUploadProps {
  value?: File | null
  onChange: (file: File | null) => void
  className?: string
  previewUrl?: string
  onGenerate?: (description: string) => Promise<File | null>
  isGenerating?: boolean
}

export function ImageUpload({ value, onChange, className, previewUrl, onGenerate, isGenerating }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(previewUrl || null)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [imageDescription, setImageDescription] = useState("")
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (value) {
      const url = URL.createObjectURL(value)
      setPreview(url)
      return () => URL.revokeObjectURL(url)
    } else if (previewUrl) {
      setPreview(previewUrl)
    } else {
      setPreview(null)
    }
  }, [value, previewUrl])

  // Handle paste events globally when this component is mounted/focused?
  // Better: Handle paste on the container div to avoid global conflicts if multiple inputs exist.
  // Actually, for better UX, window paste is often expected for "upload pages".
  // But let's stick to a ref-based approach or window listener if it's the main action.
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.files.length > 0) {
        const file = e.clipboardData.files[0]
        if (file.type.startsWith('image/')) {
          onChange(file)
          toast.success("Bilde limt inn!")
        }
      }
    }
    window.addEventListener('paste', handlePaste)
    return () => window.removeEventListener('paste', handlePaste)
  }, [onChange])

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0]
      if (file.type.startsWith('image/')) {
        onChange(file)
      } else {
        toast.error("Vennligst last opp en bildefil")
      }
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onChange(e.target.files[0])
    }
  }

  const clearImage = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleGenerateConfirm = async () => {
    if (!onGenerate) return
    setIsDialogOpen(false)
    const file = await onGenerate(imageDescription)
    if (file) onChange(file)
    setImageDescription("")
  }

  return (
    <div
      className={cn(
        "relative border-2 border-dashed rounded-xl transition-all duration-200 ease-in-out cursor-pointer group overflow-hidden bg-white",
        isDragging ? "border-indigo-500 bg-indigo-50/50" : "border-gray-200 hover:border-indigo-300 hover:bg-gray-50",
        className
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => {
        if (!preview) {
          fileInputRef.current?.click()
        } else {
          setIsPreviewOpen(true)
        }
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleFileSelect}
      />

      {preview ? (
        <div className="relative w-full h-64 md:h-80">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview}
            alt="Preview"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <div className="text-white text-sm font-medium flex flex-col items-center gap-2">
              <ImageIcon className="w-8 h-8" />
              <span>Klikk for å forstørre bilde</span>
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2 bg-white/20 hover:bg-red-500 hover:text-white text-white rounded-full backdrop-blur-sm transition-colors"
            onClick={clearImage}
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 md:py-16 text-center px-4">
          <div className={cn(
            "w-16 h-16 rounded-full flex items-center justify-center mb-4 transition-colors",
            isDragging ? "bg-indigo-100 text-indigo-600" : "bg-gray-50 text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500"
          )}>
            {isDragging ? <Upload className="w-8 h-8" /> : <ImageIcon className="w-8 h-8" />}
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            {isDragging ? "Slipp bildet her" : "Last opp bilde"}
          </h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto mb-6">
            Dra og slipp et bilde her, eller klikk for å velge. Du kan også lime inn et bilde direkte.
          </p>

          {onGenerate && (
            <div className="flex gap-2" onClick={(e) => e.stopPropagation()}>
              <Button
                type="button"
                variant="outline"
                className="bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100 font-bold shadow-sm"
                onClick={(e) => {
                  e.stopPropagation()
                  setIsDialogOpen(true)
                }}
                disabled={isGenerating}
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mr-2" />
                    Genererer...
                  </>
                ) : (
                  <>
                    <ImageIcon className="w-4 h-4 mr-2" />
                    Generer med AI
                  </>
                )}
              </Button>
            </div>
          )}

          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogContent onClick={(e) => e.stopPropagation()}>
              <DialogHeader>
                <DialogTitle>Generer bilde med AI</DialogTitle>
                <DialogDescription>
                  AI-en leser navnet på oppskriften, men du kan valgfritt beskrive stilen for å få et enda bedre resultat (f.eks. "Servert i en rustikk porselensskål").
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="description" className="text-right">
                    Beskrivelse
                  </Label>
                  <Input
                    id="description"
                    placeholder="F.eks. Servert på et trebrett..."
                    className="col-span-3"
                    value={imageDescription}
                    onChange={(e) => setImageDescription(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleGenerateConfirm()
                      }
                    }}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Avbryt</Button>
                <Button onClick={handleGenerateConfirm}>Generer Bilde</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      )}

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 border-none bg-transparent shadow-none" onClick={(e) => e.stopPropagation()}>
          {preview && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={preview}
              alt="Full Preview"
              className="w-full h-full object-contain rounded-lg"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
