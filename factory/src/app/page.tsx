'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Client, ClientStatus } from '@/lib/types';

const STATUS_STYLES: Record<ClientStatus, string> = {
  draft: 'border-muted text-muted',
  deployed: 'border-accent text-accent',
  pitched: 'border-yellow-500 text-yellow-500',
  signed: 'border-white text-white',
};

function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span
      className={`font-mono text-xs uppercase tracking-wider border px-2 py-0.5 ${STATUS_STYLES[status]}`}
    >
      {status}
    </span>
  );
}

function StatBlock({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-muted text-xs uppercase tracking-wider">{label}</span>
      <span className="font-mono text-2xl text-white">{value}</span>
    </div>
  );
}

export default function Dashboard() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClients() {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('created_at', { ascending: false });

      if (!error && data) {
        setClients(data as Client[]);
      }
      setLoading(false);
    }
    fetchClients();
  }, []);

  const stats = {
    total: clients.length,
    deployed: clients.filter((c) => c.status === 'deployed').length,
    pitched: clients.filter((c) => c.status === 'pitched').length,
    signed: clients.filter((c) => c.status === 'signed').length,
  };

  return (
    <div className="min-h-screen bg-surface">
      {/* Header */}
      <header className="border-b border-surface-border px-8 py-6">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="font-heading text-xl font-bold tracking-tight text-white">
              ATTOMIK FACTORY
            </h1>
            <span className="font-mono text-xs text-muted">v1.0</span>
          </div>
          <Link
            href="/clients/new"
            className="border border-accent px-4 py-2 font-mono text-xs uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-black"
          >
            + New Client
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-8 py-10">
        {/* Stats */}
        <div className="mb-10 grid grid-cols-4 gap-8 border-b border-surface-border pb-10">
          <StatBlock label="Total Clients" value={stats.total} />
          <StatBlock label="Deployed" value={stats.deployed} />
          <StatBlock label="Pitched" value={stats.pitched} />
          <StatBlock label="Signed" value={stats.signed} />
        </div>

        {/* Client Table */}
        {loading ? (
          <div className="py-20 text-center font-mono text-sm text-muted">
            Loading...
          </div>
        ) : clients.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-20">
            <div className="font-mono text-sm text-muted">
              No clients yet
            </div>
            <p className="max-w-sm text-center font-mono text-xs text-muted">
              Create your first client to generate a branded Shopify store from the Attomik Base Theme.
            </p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-surface-border text-left">
                <th className="pb-3 font-mono text-xs uppercase tracking-wider text-muted">
                  Brand
                </th>
                <th className="pb-3 font-mono text-xs uppercase tracking-wider text-muted">
                  Store URL
                </th>
                <th className="pb-3 font-mono text-xs uppercase tracking-wider text-muted">
                  Status
                </th>
                <th className="pb-3 font-mono text-xs uppercase tracking-wider text-muted">
                  Created
                </th>
                <th className="pb-3 text-right font-mono text-xs uppercase tracking-wider text-muted">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {clients.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-surface-border transition-colors hover:bg-surface-raised"
                >
                  <td className="py-4 font-heading text-sm font-semibold text-white">
                    {client.brand_name}
                  </td>
                  <td className="py-4 font-mono text-xs text-muted">
                    {client.store_url || '\u2014'}
                  </td>
                  <td className="py-4">
                    <StatusBadge status={client.status} />
                  </td>
                  <td className="py-4 font-mono text-xs text-muted">
                    {new Date(client.created_at).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </td>
                  <td className="py-4 text-right">
                    <div className="flex items-center justify-end gap-3">
                      <button className="font-mono text-xs text-muted transition-colors hover:text-accent">
                        Configure
                      </button>
                      <button className="font-mono text-xs text-muted transition-colors hover:text-accent">
                        Deploy
                      </button>
                      <button className="font-mono text-xs text-muted transition-colors hover:text-accent">
                        Preview
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </main>
    </div>
  );
}
