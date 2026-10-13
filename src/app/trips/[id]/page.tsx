import { Suspense } from 'react';
import TripDetailClient from './trip-detail-client';
import { Skeleton } from '@/components/ui/skeleton';

export default function TripDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen bg-slate-50 items-center justify-center p-8">
          <div className="space-y-4 w-full max-w-xl">
            <Skeleton className="h-12 w-64 rounded-2xl" />
            <Skeleton className="h-48 w-full rounded-2xl" />
          </div>
        </div>
      }
    >
      <TripDetailClient params={params} />
    </Suspense>
  );
}
