// File: src/components/MainLayout.tsx
import React from 'react';

// Define the props for the layout component
// 'children' will be the content we place inside the layout
interface MainLayoutProps {
    children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-white shadow-md z-10">
                <div className="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8">
                    <h1 className="text-2xl font-bold text-gray-900">
                        Middagsplanlegger
                    </h1>
                </div>
            </header>

            <div className="flex flex-1 overflow-hidden">
                {/* Sidebar for saved meals */}
                <aside className="w-64 bg-white border-r border-gray-200 p-6 overflow-y-auto">
                    <h2 className="text-lg font-semibold mb-4">Lagrede Middager</h2>
                    <div className="space-y-2">
                        {/* Placeholder for saved meals - we will make this dynamic later */}
                        <div className="p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                            Taco Tirsdag
                        </div>
                        <div className="p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                            Kjøttkaker i brun saus
                        </div>
                        <div className="p-3 bg-gray-100 rounded-lg cursor-pointer hover:bg-gray-200">
                            Fiskegrateng
                        </div>
                    </div>
                </aside>

                {/* Main Content Area */}
                <main className="flex-1 p-6 overflow-y-auto">
                    {/* The actual page content will be rendered here */}
                    {children}
                </main>
            </div>
        </div>
    );
}