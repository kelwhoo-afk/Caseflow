'use client';

export function CaseDetail({ lead }: { lead: any }) {
  const missing = lead.routing?.missing_required_fields || [];

  const Field = ({ label, value, path }: { label: string; value: any; path?: string }) => (
    <div className="flex justify-between py-1 border-b border-gray-800/50">
      <span className="text-gray-500 text-xs">{label}</span>
      <span className={`text-xs ${path && missing.includes(path) ? 'text-yellow-400' : 'text-gray-200'}`}>
        {value ?? '—'}
      </span>
    </div>
  );

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Case Packet</h3>
      <Field label="Name" value={lead.caller?.full_name} path="caller.full_name" />
      <Field label="Phone" value={lead.caller?.phone} path="caller.phone" />
      <Field label="Type" value={lead.accident?.type} path="accident.type" />
      <Field label="Date" value={lead.accident?.date} path="accident.date" />
      <Field label="Location" value={lead.accident?.location?.city} />
      <Field label="Injury" value={lead.injuries?.status} path="injuries.status" />
      <Field label="Description" value={lead.injuries?.description} />
      <Field label="Minor" value={lead.injuries?.passengers_injured ? 'YES ⚠️' : 'No'} />
      <Field label="Police Report" value={lead.legal?.police_report_filed} />
      <Field label="Has Attorney" value={lead.legal?.already_has_attorney ? 'YES ❌' : 'No'} />
      <Field label="Consent" value={lead.caller?.consent_to_contact ? 'Granted' : 'Not granted'} />

      <div className="mt-4 pt-3 border-t border-gray-700">
        <h4 className="text-xs font-semibold text-gray-400 mb-2">Triage Recommendation</h4>
        <Field label="Path" value={lead.routing?.subtype || lead.triage?.path} />
        <Field label="Priority" value={lead.routing?.priority} />
        <Field label="Assigned Firm" value={lead.routing?.assigned_firm} />
        <Field label="Reason" value={lead.triage?.reason} />
      </div>
    </div>
  );
}
