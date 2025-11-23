"use client"

import { useState, useRef, useEffect } from "react"
import { Upload, X, ImageIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import toast from "react-hot-toast"
import { cn } from "@/lib/utils"

interface ImageUploadProps {
  value?: File | null
  onChange: (file: File | null) => void
  className?: string
  previewUrl?: string
}

export function ImageUpload({ value, onChange, className, previewUrl }: ImageUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(previewUrl || null)
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
          toast.success("Image pasted!")
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
        toast.error("Please upload an image file")
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
      onClick={() => fileInputRef.current?.click()}
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
                <Upload className="w-8 h-8" />
                <span>Click or drop to replace</span>
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
            {isDragging ? "Drop image here" : "Upload Image"}
          </h3>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            Drag and drop an image here, or click to browse. You can also paste an image from your clipboard.
          </p>
        </div>
      )}
    </div>
  )
}
