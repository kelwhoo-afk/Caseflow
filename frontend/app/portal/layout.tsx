'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { CapacitySidebar } from '@/components/portal/capacity-sidebar';

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [firmId, setFirmId] = useState<string>('BayBridge_Auto_Injury');

  useEffect(() => {
    const stored = document.cookie
      .split('; ')
      .find((c) => c.startsWith('firm_id='))
      ?.split('=')[1];
    if (stored) setFirmId(stored);
  }, []);

  const handleFirmChange = (id: string) => {
    setFirmId(id);
    document.cookie = `firm_id=${id}; path=/; max-age=31536000`;
  };

  const firms = [
    { id: 'BayBridge_Auto_Injury', name: 'BayBridge Auto Injury' },
    { id: 'Summit_Commercial_Auto', name: 'Summit Commercial Auto' },
    { id: 'Pacific_Complex_Collision', name: 'Pacific Complex Collision' },
    { id: 'Vista_Auto_Justice', name: 'Vista Auto Justice' },
  ];

  return (
    <div className="flex h-screen bg-gray-950 text-gray-100">
      <aside className="w-64 border-r border-gray-800 flex flex-col">
        <div className="p-4 border-b border-gray-800">
          <h1 className="text-lg font-semibold">CaseRouter Auto</h1>
          <select
            value={firmId}
            onChange={(e) => handleFirmChange(e.target.value)}
            className="mt-2 w-full bg-gray-900 border border-gray-700 rounded px-2 py-1 text-sm"
          >
            {firms.map((f) => (
              <option key={f.id} value={f.id}>{f.name}</option>
            ))}
          </select>
        </div>

        <nav className="flex-1 p-4 space-y-1">
          <Link
            href="/portal/queue"
            className={`block px-3 py-2 rounded text-sm ${
              pathname === '/portal/queue' ? 'bg-blue-900 text-blue-200' : 'hover:bg-gray-900'
            }`}
          >
            Intake Queue
          </Link>
          <Link
            href="/portal/referrals"
            className={`block px-3 py-2 rounded text-sm ${
              pathname === '/portal/referrals' ? 'bg-blue-900 text-blue-200' : 'hover:bg-gray-900'
            }`}
          >
            Referrals
          </Link>
        </nav>

        <CapacitySidebar firmId={firmId} />
      </aside>

      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
