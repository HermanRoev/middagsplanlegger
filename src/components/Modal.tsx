// Fil: src/components/Modal.tsx
'use client'

import React from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  children: React.ReactNode
  title: string
}

export function Modal({ isOpen, onClose, children, title }: ModalProps) {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-40 flex justify-center items-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-5xl flex flex-col border border-gray-100"
        onClick={(e) => e.stopPropagation()} // Forhindrer at klikk inne i modalen lukker den
      >
        {/* Modal Header */}
        <div className="flex justify-between items-center p-4 bg-gray-50 rounded-t-xl">
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-800 text-2xl font-bold"
            aria-label="Lukk"
          >
            &times;
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}
