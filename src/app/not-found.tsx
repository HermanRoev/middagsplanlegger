import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-blue-600">404</h1>
        <p className="text-2xl mt-4 text-gray-800">Siden ble ikke funnet</p>
        <p className="mt-2 text-gray-600">
          Beklager, vi fant ikke siden du lette etter.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Gå til forsiden
        </Link>
      </div>
    </div>
  )
}
