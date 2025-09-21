'use client'

import { TextareaHTMLAttributes, useRef, useLayoutEffect } from 'react'

interface TextAreaFieldProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string
  label: string
}

const TextAreaField = ({ id, label, value, ...props }: TextAreaFieldProps) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useLayoutEffect(() => {
    const textarea = textareaRef.current
    if (textarea) {
      // Reset height to recalculate
      textarea.style.height = 'inherit'
      // Get the computed style of the element
      const computed = window.getComputedStyle(textarea)
      // Calculate the height
      const height =
        parseInt(computed.getPropertyValue('border-top-width'), 10) +
        textarea.scrollHeight +
        parseInt(computed.getPropertyValue('border-bottom-width'), 10)
      textarea.style.height = `${height}px`
    }
  }, [value])

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        id={id}
        className="block px-2.5 pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border-1 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer resize-none overflow-hidden"
        placeholder=" "
        rows={1}
        value={value}
        {...props}
      />
      <label
        htmlFor={id}
        className="absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4 rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1"
      >
        {label}
      </label>
    </div>
  )
}

export default TextAreaField
