'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Client, ClientStatus } from '@/lib/types';
import { colors, font, fontWeight, fontSize, spacing, radius, shadow, transition, styles, letterSpacing } from '@/lib/design-tokens';

const STATUS_MAP: Record<ClientStatus, string> = {
  draft: 'badge-yellow',
  deployed: 'badge-green',
  pitched: 'badge-black',
  signed: 'badge-green',
};

function StatusBadge({ status }: { status: ClientStatus }) {
  return (
    <span className={`badge ${STATUS_MAP[status]}`}>
      {status}
    </span>
  );
}

function KpiCard({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div
      style={{
        background: colors.paper,
        border: `1px solid ${colors.border}`,
        borderRadius: radius.xl,
        padding: spacing[6],
        boxShadow: shadow.card,
      }}
    >
      <div
        style={{
          fontFamily: font.mono,
          fontSize: fontSize.caption,
          fontWeight: fontWeight.semibold,
          textTransform: 'uppercase',
          letterSpacing: letterSpacing.caps,
          color: colors.muted,
          marginBottom: spacing[3],
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontFamily: font.heading,
          fontSize: fontSize['9xl'],
          fontWeight: fontWeight.extrabold,
          letterSpacing: letterSpacing.tight,
          color: accent ? colors.accent : colors.ink,
          lineHeight: 1.05,
        }}
      >
        {value}
      </div>
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
    <div style={{ minHeight: '100vh', background: colors.cream }}>
      {/* Header */}
      <header
        style={{
          background: colors.paper,
          borderBottom: `1px solid ${colors.border}`,
          padding: `${spacing[6]}px ${spacing[8]}px`,
        }}
      >
        <div style={{ maxWidth: 1200, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: spacing[3] }}>
            <h1
              style={{
                fontFamily: font.heading,
                fontWeight: fontWeight.heading,
                fontSize: fontSize['3xl'],
                textTransform: 'uppercase',
                letterSpacing: letterSpacing.wide,
                color: colors.ink,
              }}
            >
              ATTOMIK FACTORY
            </h1>
            <span
              style={{
                fontFamily: font.mono,
                fontSize: fontSize.xs,
                color: colors.muted,
              }}
            >
              v1.0
            </span>
          </div>
          <Link
            href="/clients/new"
            style={{
              ...styles.btnPrimary,
              fontSize: fontSize.sm,
              padding: `8px ${spacing[4]}px`,
            }}
          >
            + NEW CLIENT
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: `${spacing[10]}px ${spacing[8]}px` }}>
        {/* KPI Stats */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: spacing[4],
            marginBottom: spacing[10],
          }}
        >
          <KpiCard label="Total Clients" value={stats.total} accent />
          <KpiCard label="Deployed" value={stats.deployed} />
          <KpiCard label="Pitched" value={stats.pitched} />
          <KpiCard label="Signed" value={stats.signed} />
        </div>

        {/* Client Table */}
        {loading ? (
          <div style={{ padding: `${spacing[20]}px 0`, textAlign: 'center' }}>
            <div className="spinner" style={{ margin: '0 auto', marginBottom: spacing[3], borderColor: colors.border, borderTopColor: colors.ink }} />
            <span style={{ fontFamily: font.mono, fontSize: fontSize.sm, color: colors.muted }}>Loading...</span>
          </div>
        ) : clients.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: spacing[4], padding: `${spacing[20]}px 0` }}>
            <div style={{ fontFamily: font.mono, fontSize: fontSize.body, color: colors.muted }}>
              No clients yet
            </div>
            <p style={{ fontFamily: font.mono, fontSize: fontSize.xs, color: colors.subtle, maxWidth: 400, textAlign: 'center', lineHeight: 1.6 }}>
              Create your first client to generate a branded Shopify store from the Attomik Base Theme.
            </p>
          </div>
        ) : (
          <div
            style={{
              background: colors.paper,
              border: `1px solid ${colors.border}`,
              borderRadius: radius.xl,
              overflow: 'hidden',
            }}
          >
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Brand', 'Store URL', 'Status', 'Created', ''].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: `${spacing[3]}px ${spacing[6]}px`,
                        fontFamily: font.heading,
                        fontSize: fontSize.xs,
                        fontWeight: fontWeight.bold,
                        textTransform: 'uppercase',
                        letterSpacing: letterSpacing.wider,
                        color: colors.muted,
                        textAlign: h === '' ? 'right' : 'left',
                        borderBottom: `1px solid ${colors.border}`,
                        background: colors.cream,
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {clients.map((client) => (
                  <tr
                    key={client.id}
                    style={{ borderBottom: `1px solid ${colors.cream}`, transition: `background ${transition.fast}` }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = colors.gray100; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                  >
                    <td style={{ padding: `${spacing[4]}px ${spacing[6]}px`, fontFamily: font.heading, fontSize: fontSize.body, fontWeight: fontWeight.bold, color: colors.ink }}>
                      {client.brand_name}
                    </td>
                    <td style={{ padding: `${spacing[4]}px ${spacing[6]}px`, fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>
                      {client.store_url || '\u2014'}
                    </td>
                    <td style={{ padding: `${spacing[4]}px ${spacing[6]}px` }}>
                      <StatusBadge status={client.status} />
                    </td>
                    <td style={{ padding: `${spacing[4]}px ${spacing[6]}px`, fontFamily: font.mono, fontSize: fontSize.xs, color: colors.muted }}>
                      {new Date(client.created_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </td>
                    <td style={{ padding: `${spacing[4]}px ${spacing[6]}px`, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: spacing[3] }}>
                        {['Configure', 'Deploy', 'Preview'].map((action) => (
                          <button
                            key={action}
                            style={{
                              background: 'none',
                              border: 'none',
                              fontFamily: font.mono,
                              fontSize: fontSize.xs,
                              color: colors.muted,
                              cursor: 'pointer',
                              transition: `color ${transition.fast}`,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.color = colors.accent; }}
                            onMouseLeave={(e) => { e.currentTarget.style.color = colors.muted; }}
                          >
                            {action}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
