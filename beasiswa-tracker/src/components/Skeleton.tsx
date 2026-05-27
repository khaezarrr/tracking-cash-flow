export function SkeletonCard() {
  return (
    <div className="card p-5 animate-pulse" aria-hidden="true">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-9 h-9 bg-gray-200 rounded-lg" />
        <div className="h-4 bg-gray-200 rounded w-24" />
      </div>
      <div className="h-6 bg-gray-200 rounded w-32" />
    </div>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center justify-between gap-4 p-4 animate-pulse" aria-hidden="true">
      <div className="flex items-center gap-3 flex-1">
        <div className="w-3 h-3 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="space-y-2 flex-1">
          <div className="h-4 bg-gray-200 rounded w-40" />
          <div className="h-3 bg-gray-200 rounded w-24" />
        </div>
      </div>
      <div className="h-4 bg-gray-200 rounded w-20" />
    </div>
  );
}

export function SkeletonDashboard() {
  return (
    <div className="space-y-6 pt-14 lg:pt-0" aria-label="Memuat dashboard..." aria-busy="true">
      <div className="space-y-1">
        <div className="h-7 bg-gray-200 rounded w-32 animate-pulse" />
        <div className="h-4 bg-gray-200 rounded w-48 animate-pulse" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card p-5 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-40 mb-4" />
          <div className="space-y-3">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="flex justify-between">
                  <div className="h-3 bg-gray-200 rounded w-28" />
                  <div className="h-3 bg-gray-200 rounded w-20" />
                </div>
                <div className="h-2 bg-gray-100 rounded-full w-full" />
              </div>
            ))}
          </div>
        </div>
        <div className="card p-5 animate-pulse">
          <div className="h-5 bg-gray-200 rounded w-36 mb-4" />
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SkeletonExpenses() {
  return (
    <div className="space-y-6 pt-14 lg:pt-0" aria-label="Memuat data..." aria-busy="true">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="h-7 bg-gray-200 rounded w-32 animate-pulse" />
          <div className="h-4 bg-gray-200 rounded w-24 animate-pulse" />
        </div>
        <div className="h-9 bg-gray-200 rounded-lg w-24 animate-pulse" />
      </div>
      <div className="card p-4 space-y-3 animate-pulse">
        <div className="h-9 bg-gray-100 rounded-lg w-full" />
        <div className="flex gap-2">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-6 bg-gray-100 rounded-full w-20" />
          ))}
        </div>
      </div>
      <div className="card divide-y divide-gray-50">
        {[...Array(8)].map((_, i) => <SkeletonRow key={i} />)}
      </div>
    </div>
  );
}
