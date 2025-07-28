// src/components/ui/ToastProvider.tsx
'use client';

import { Toaster } from 'react-hot-toast';

export function ToastProvider() {
    return (
        <Toaster
            position="top-center"
            reverseOrder={false}
            toastOptions={{
                duration: 3000,
                style: {
                    background: '#333',
                    color: '#fff',
                },
            }}
        />
    );
}