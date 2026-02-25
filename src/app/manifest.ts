import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Middagsplanlegger',
    short_name: 'Middagsplan',
    description: 'Smartere måltidsplanlegging for hele familien',
    start_url: '/dashboard',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#e0f2fe',
    theme_color: '#e0f2fe',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
      },
    ],
  }
}
