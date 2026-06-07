'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Lead = {
  packet_id: string;
  caller: { full_name: string | null };
  accident: { type: string | null; location: { city: string | null } };
  routing: { priority: string; subtype: string | null; assigned_firm: string | null };
  status?: string;
  created_at: string;
};

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-900 text-red-200',
  high: 'bg-orange-900 text-orange-200',
  normal: 'bg-gray-800 text-gray-300',
  low: 'bg-gray-900 text-gray-500',
  declined: 'bg-gray-900 text-gray-600',
};

export function QueueTable() {
  const [leads, setLeads] = useState<Lead[]>([]);

  useEffect(() => {
    const firmId = document.cookie
      .split('; ')
      .find((c) => c.startsWith('firm_id='))
      ?.split('=')[1] || 'BayBridge_Auto_Injury';

    const poll = async () => {
      const res = await fetch(`/api/leads?firm_id=${firmId}`);
      if (res.ok) setLeads(await res.json());
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, []);

  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="text-left text-gray-500 border-b border-gray-800">
          <th className="pb-2 pr-4">Status</th>
          <th className="pb-2 pr-4">Caller</th>
          <th className="pb-2 pr-4">Type</th>
          <th className="pb-2 pr-4">Location</th>
          <th className="pb-2 pr-4">Priority</th>
          <th className="pb-2">Time</th>
        </tr>
      </thead>
      <tbody>
        {leads.map((lead) => (
          <tr key={lead.packet_id} className="border-b border-gray-800/50 hover:bg-gray-900/50">
            <td className="py-3 pr-4">
              <span className={`px-2 py-0.5 rounded text-xs ${
                lead.status === 'live_call' ? 'bg-green-900 text-green-300 animate-pulse' :
                lead.status === 'consult_booked' ? 'bg-blue-900 text-blue-300' :
                'bg-gray-800 text-gray-400'
              }`}>
                {lead.status || 'new'}
              </span>
            </td>
            <td className="py-3 pr-4">
              <Link href={`/portal/case/${lead.packet_id}`} className="text-blue-400 hover:underline">
                {lead.caller?.full_name || 'Unknown'}
              </Link>
            </td>
            <td className="py-3 pr-4">{lead.accident?.type || '—'}</td>
            <td className="py-3 pr-4">{lead.accident?.location?.city || '—'}</td>
            <td className="py-3 pr-4">
              <span className={`px-2 py-0.5 rounded text-xs ${priorityColors[lead.routing?.priority] || ''}`}>
                {lead.routing?.priority || 'normal'}
              </span>
            </td>
            <td className="py-3 text-gray-500">
              {new Date(lead.created_at).toLocaleTimeString()}
            </td>
          </tr>
        ))}
        {leads.length === 0 && (
          <tr><td colSpan={6} className="py-8 text-center text-gray-600">No leads yet</td></tr>
        )}
      </tbody>
    </table>
  );
}
