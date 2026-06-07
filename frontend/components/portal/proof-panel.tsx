'use client';

export function ProofPanel({ lead }: { lead: any }) {
  const mossRetrievals = lead.moss_retrievals || [];
  const audit = lead.truefoundry_audit;

  return (
    <div className="bg-gray-900 rounded-lg p-4">
      <h3 className="text-sm font-semibold text-gray-400 mb-3">Proof &amp; Observability</h3>

      <div className="mb-3">
        <h4 className="text-xs font-semibold text-gray-500 mb-1">Moss Retrievals</h4>
        {mossRetrievals.length === 0 && <p className="text-xs text-gray-600">No retrievals recorded</p>}
        {mossRetrievals.map((r: any, i: number) => (
          <details key={i} className="mb-1">
            <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-200">
              &quot;{r.query}&quot; — {r.matches?.length || 0} matches, {r.latency_ms?.toFixed(0) || '?'}ms
            </summary>
            <div className="ml-4 mt-1">
              {(r.matches || []).map((m: any, j: number) => (
                <div key={j} className="text-xs text-gray-500 mb-1">
                  Score: {m.score?.toFixed(2)} — {m.text?.slice(0, 100)}...
                </div>
              ))}
            </div>
          </details>
        ))}
      </div>

      <div>
        <h4 className="text-xs font-semibold text-gray-500 mb-1">TrueFoundry Audit</h4>
        {!audit && <p className="text-xs text-gray-600">No audit data yet</p>}
        {audit && (
          <div className="text-xs text-gray-400 space-y-1">
            <div>Turns analyzed: {audit.total_turns}</div>
            <div>Quality score: {(audit.quality_score * 100).toFixed(0)}%</div>
            <div>Violations: {audit.violations?.length || 0}</div>
            <div className="text-green-400">
              {audit.violations?.length === 0 ? '✓ All checks passed' : `⚠ ${audit.violations.length} issues`}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
