'use client';

import { useEffect, useState } from 'react';

export function CapacitySidebar({ firmId }: { firmId: string }) {
  const [firm, setFirm] = useState<any>(null);

  useEffect(() => {
    fetch('/api/firms')
      .then((r) => r.json())
      .then((firms) => {
        const match = firms.find((f: any) => f.firm_id === firmId);
        setFirm(match);
      });
  }, [firmId]);

  if (!firm) return null;

  const cap = firm.capacity_today;
  const total = cap.consult_slots_today + cap.urgent_slots_today;
  const used = 0;

  return (
    <div className="p-4 border-t border-gray-800">
      <h3 className="text-xs font-semibold text-gray-500 mb-2">Capacity</h3>
      <div className="text-sm text-gray-300">
        Consult slots: {cap.consult_slots_today}
      </div>
      <div className="text-sm text-gray-300">
        Urgent slots: {cap.urgent_slots_today}
      </div>
      <div className="mt-2 bg-gray-800 rounded-full h-2">
        <div className="bg-blue-600 rounded-full h-2" style={{ width: `${Math.min(100, (used / total) * 100)}%` }} />
      </div>
      <div className="mt-2">
        <h4 className="text-xs text-gray-500">Attorneys</h4>
        {firm.attorneys?.map((a: any) => (
          <div key={a.name} className="text-xs text-gray-400 mt-1">
            {a.name} — {a.slots_today?.join(', ') || 'no slots'}
          </div>
        ))}
      </div>
    </div>
  );
}
