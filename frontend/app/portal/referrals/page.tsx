'use client';

import { useEffect, useState } from 'react';

export default function ReferralsPage() {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    fetch('/api/leads')
      .then((r) => r.json())
      .then((all) => setLeads(all.filter((l: any) =>
        l.status === 'placing' || l.status === 'referred' || l.triage?.path === 'referral'
      )));
  }, []);

  return (
    <div className="p-6">
      <h2 className="text-xl font-semibold mb-4">Referral Ledger</h2>
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 border-b border-gray-800">
            <th className="pb-2">Caller</th>
            <th className="pb-2">From Firm</th>
            <th className="pb-2">To Firm</th>
            <th className="pb-2">Consent</th>
            <th className="pb-2">Status</th>
          </tr>
        </thead>
        <tbody>
          {leads.map((lead) => (
            <tr key={lead.packet_id} className="border-b border-gray-800/50">
              <td className="py-3">{lead.caller?.full_name || 'Unknown'}</td>
              <td className="py-3">{lead.firm_id?.replace(/_/g, ' ')}</td>
              <td className="py-3">{lead.routing?.assigned_firm || '—'}</td>
              <td className="py-3">{lead.caller?.consent_to_contact ? '✓ Granted' : '✗ Denied'}</td>
              <td className="py-3">{lead.status || '—'}</td>
            </tr>
          ))}
          {leads.length === 0 && (
            <tr><td colSpan={5} className="py-8 text-center text-gray-600">No referrals yet</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
