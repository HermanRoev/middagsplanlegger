'use client'

import { InputHTMLAttributes } from 'react'
import clsx from 'clsx'

interface InputFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string
  label: string
  icon?: string
}

const InputField = ({ id, label, icon, ...props }: InputFieldProps) => (
  <div className="relative">
    {icon && (
      <div className="absolute inset-y-0 start-0 flex items-center ps-3.5 pointer-events-none">
        <span className="material-icons text-gray-500">{icon}</span>
      </div>
    )}
    <input
      id={id}
      className={clsx(
        'block pb-2.5 pt-4 w-full text-sm text-gray-900 bg-transparent rounded-lg border-1 border-gray-300 appearance-none focus:outline-none focus:ring-0 focus:border-blue-600 peer',
        icon ? 'ps-10' : 'px-2.5'
      )}
      placeholder=" "
      {...props}
    />
    <label
      htmlFor={id}
      className={clsx(
        'absolute text-sm text-gray-500 duration-300 transform -translate-y-4 scale-75 top-2 z-10 origin-[0] bg-white px-2 peer-focus:px-2 peer-focus:text-blue-600 peer-placeholder-shown:scale-100 peer-placeholder-shown:-translate-y-1/2 peer-placeholder-shown:top-1/2 peer-focus:top-2 peer-focus:scale-75 peer-focus:-translate-y-4',
        icon
          ? 'rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-[40px]'
          : 'rtl:peer-focus:translate-x-1/4 rtl:peer-focus:left-auto start-1'
      )}
    >
      {label}
    </label>
  </div>
)

export default InputField
