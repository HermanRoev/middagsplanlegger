// src/app/layout.tsx
import './globals.css';
import { ToastProvider } from '@/components/ui/ToastProvider';
import { AuthProvider } from '@/contexts/AuthContext';

export const metadata = {
    title: 'Middagsplanlegger',
    description: 'Familiens middagsplanlegger',
};

export default function RootLayout({
                                       children,
                                   }: {
    children: React.ReactNode
}) {
    return (
        <html lang="no">
        <body>
            <AuthProvider>
                <ToastProvider />
                {children}
            </AuthProvider>
        </body>
        </html>
    );
}