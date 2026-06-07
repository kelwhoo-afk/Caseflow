'use client';

import { QueueTable } from '@/components/portal/queue-table';

export default function QueuePage() {
  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Intake Queue</h2>
      <QueueTable />
    </div>
  );
}
