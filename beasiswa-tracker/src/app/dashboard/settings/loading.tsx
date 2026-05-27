export default function Loading() {
  return (
    <div className="space-y-6 pt-14 lg:pt-0 max-w-2xl animate-pulse" aria-busy="true" aria-label="Memuat...">
      <div className="space-y-1">
        <div className="h-7 bg-gray-200 rounded w-32" />
        <div className="h-4 bg-gray-200 rounded w-56" />
      </div>
      <div className="card p-6 space-y-4">
        <div className="h-5 bg-gray-200 rounded w-36" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="h-10 bg-gray-100 rounded" />
        <div className="flex justify-end"><div className="h-9 bg-gray-200 rounded w-28" /></div>
      </div>
      <div className="card p-6 space-y-4">
        <div className="h-5 bg-gray-200 rounded w-40" />
        <div className="h-16 bg-gray-100 rounded" />
        <div className="h-16 bg-gray-100 rounded" />
      </div>
    </div>
  );
}
