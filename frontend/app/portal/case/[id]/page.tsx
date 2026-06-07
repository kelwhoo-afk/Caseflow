'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { CaseDetail } from '@/components/portal/case-detail';
import { ProofPanel } from '@/components/portal/proof-panel';

export default function CasePage() {
  const { id } = useParams();
  const [lead, setLead] = useState<any>(null);

  useEffect(() => {
    fetch(`/api/leads/${id}`).then((r) => r.json()).then(setLead);
  }, [id]);

  if (!lead) return <div className="p-6 text-gray-500">Loading...</div>;

  return (
    <div className="p-6 grid grid-cols-2 gap-6 h-full">
      <div className="bg-gray-900 rounded-lg p-4 overflow-auto">
        <h3 className="text-sm font-semibold text-gray-400 mb-3">Transcript</h3>
        {(lead.transcript || []).map((turn: any, i: number) => (
          <div key={i} className={`mb-2 text-sm ${turn.role === 'agent' ? 'text-blue-300' : 'text-gray-200'}`}>
            <span className="text-gray-500 text-xs">{turn.role}: </span>
            {turn.text}
          </div>
        ))}
        {(!lead.transcript || lead.transcript.length === 0) && (
          <p className="text-gray-600 text-sm">No transcript available</p>
        )}
      </div>

      <div className="flex flex-col gap-4 overflow-auto">
        <CaseDetail lead={lead} />
        <ProofPanel lead={lead} />

        <div className="flex gap-2">
          <button
            onClick={() => fetch(`/api/leads/${id}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'accept_schedule', firm: lead.firm_id, attorney: 'TBD', time: 'TBD' }),
            }).then(() => window.location.reload())}
            className="px-4 py-2 bg-green-800 hover:bg-green-700 rounded text-sm"
          >
            Accept &amp; Schedule
          </button>
          <button
            onClick={() => fetch(`/api/leads/${id}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'approve_referral' }),
            }).then(() => window.location.reload())}
            className="px-4 py-2 bg-blue-800 hover:bg-blue-700 rounded text-sm"
          >
            Approve Referral
          </button>
          <button
            onClick={() => fetch(`/api/leads/${id}/action`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'decline', reason: 'staff_declined' }),
            }).then(() => window.location.reload())}
            className="px-4 py-2 bg-red-900 hover:bg-red-800 rounded text-sm"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
}
