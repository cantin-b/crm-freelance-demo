"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  CalendarClock,
  Mail,
  PhoneCall,
  Target,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { ProspectStatusBadge } from "@/components/prospects/ProspectStatusBadge";
import { DEMO_STATE_UPDATED_EVENT } from "@/components/providers/DemoDataProvider";
import { cn } from "@/lib/utils";
import { useT } from "@/components/providers/UiLanguageProvider";

type ActivityPoint = {
  weekStart: string;
  calls: number;
  emails: number;
  total: number;
};

type FunnelPoint = {
  key: string;
  count: number;
  rate: number;
};

type PipelinePoint = {
  status: string;
  count: number;
  rate: number;
};

type FollowUpItem = {
  id: string;
  type: "callback" | "appointment";
  date: string;
  title: string;
  prospectId: number;
  prospectName: string;
  status: string;
};

type DashboardData = {
  summary: {
    callsMade: number;
    emailsSent: number;
    conversionRate: number;
    activeOpportunities: number;
    totalProspects: number;
    convertedClients: number;
  };
  activitySeries: ActivityPoint[];
  funnel: FunnelPoint[];
  pipeline: PipelinePoint[];
  followUps: FollowUpItem[];
};

const EMPTY_DASHBOARD: DashboardData = {
  summary: {
    callsMade: 0,
    emailsSent: 0,
    conversionRate: 0,
    activeOpportunities: 0,
    totalProspects: 0,
    convertedClients: 0,
  },
  activitySeries: [],
  funnel: [],
  pipeline: [],
  followUps: [],
};

const KPI_STYLES = [
  "border-brand-navy/15 bg-brand-navy/[0.03]",
  "border-blue-200/80 bg-blue-50/50",
  "border-emerald-200/80 bg-emerald-50/50",
  "border-violet-200/80 bg-violet-50/50",
];

function formatNumber(value: number) {
  return value.toLocaleString();
}

function formatWeekLabel(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(value));
}

function formatDateTime(value: string, locale: string) {
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function KpiCard({
  icon: Icon,
  label,
  value,
  caption,
  className,
}: {
  icon: typeof PhoneCall;
  label: string;
  value: string;
  caption: string;
  className: string;
}) {
  return (
    <div className={cn("rounded-xl border p-4 shadow-control", className)}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase text-zinc-500">{label}</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-950">{value}</p>
        </div>
        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/80 text-brand-navy shadow-control">
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="mt-3 text-sm text-zinc-500">{caption}</p>
    </div>
  );
}

function ActivityChart({ points, locale }: { points: ActivityPoint[]; locale: string }) {
  const maxValue = Math.max(1, ...points.map(point => point.total));
  const width = 640;
  const height = 230;
  const chartTop = 26;
  const chartBottom = 178;
  const slot = points.length ? width / points.length : width;
  const barWidth = Math.min(30, Math.max(16, slot * 0.42));

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="h-72 w-full" role="img" aria-hidden="true">
      {[0, 1, 2, 3].map(index => {
        const y = chartTop + ((chartBottom - chartTop) / 3) * index;
        return <line key={index} x1="0" x2={width} y1={y} y2={y} stroke="#e4e4e7" strokeDasharray="4 6" />;
      })}
      {points.map((point, index) => {
        const x = index * slot + slot / 2 - barWidth / 2;
        const callsHeight = ((chartBottom - chartTop) * point.calls) / maxValue;
        const emailsHeight = ((chartBottom - chartTop) * point.emails) / maxValue;
        const emailsY = chartBottom - callsHeight - emailsHeight;
        const callsY = chartBottom - callsHeight;
        return (
          <g key={point.weekStart}>
            <rect
              x={x}
              y={emailsY}
              width={barWidth}
              height={Math.max(0, emailsHeight)}
              rx="5"
              fill="#2563eb"
              opacity="0.88"
            />
            <rect
              x={x}
              y={callsY}
              width={barWidth}
              height={Math.max(0, callsHeight)}
              rx="5"
              fill="#1c2b78"
            />
            <text x={x + barWidth / 2} y={210} textAnchor="middle" className="fill-zinc-500 text-[11px]">
              {formatWeekLabel(point.weekStart, locale)}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function MiniLegend({ label, className }: { label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500">
      <span className={cn("h-2 w-2 rounded-full", className)} />
      {label}
    </span>
  );
}

export function DashboardView() {
  const t = useT();
  const locale = t.ui_language === "fr" ? "fr-BE" : "en-US";
  const [data, setData] = useState<DashboardData>(EMPTY_DASHBOARD);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/dashboard");
        const nextData = await res.json() as DashboardData;
        if (!cancelled) setData(nextData);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    window.addEventListener(DEMO_STATE_UPDATED_EVENT, load);
    return () => {
      cancelled = true;
      window.removeEventListener(DEMO_STATE_UPDATED_EVENT, load);
    };
  }, []);

  const kpis = useMemo(() => [
    {
      icon: PhoneCall,
      label: t.dashboard_calls_made,
      value: formatNumber(data.summary.callsMade),
      caption: t.dashboard_calls_caption,
    },
    {
      icon: Mail,
      label: t.dashboard_emails_sent,
      value: formatNumber(data.summary.emailsSent),
      caption: t.dashboard_emails_caption,
    },
    {
      icon: TrendingUp,
      label: t.dashboard_client_conversion,
      value: `${data.summary.conversionRate}%`,
      caption: t.dashboard_conversion_caption(data.summary.convertedClients, data.summary.totalProspects),
    },
    {
      icon: Target,
      label: t.dashboard_active_opportunities,
      value: formatNumber(data.summary.activeOpportunities),
      caption: t.dashboard_opportunities_caption,
    },
  ], [data, t]);

  return (
    <div className="pb-20 md:pb-8">
      <div className="mx-auto max-w-7xl p-4 md:p-8">
        <PageHeader
          className="mb-6"
          title={t.page_dashboard}
          description={t.dashboard_description}
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi, index) => (
            <KpiCard
              key={kpi.label}
              icon={kpi.icon}
              label={kpi.label}
              value={loading ? "…" : kpi.value}
              caption={kpi.caption}
              className={KPI_STYLES[index]}
            />
          ))}
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(22rem,0.85fr)]">
          <section className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-surface md:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4 text-brand-navy" />
                  <h2 className="text-base font-semibold text-zinc-950">{t.dashboard_activity_title}</h2>
                </div>
                <p className="mt-1 text-sm text-zinc-500">{t.dashboard_activity_description}</p>
              </div>
              <div className="flex items-center gap-3">
                <MiniLegend label={t.dashboard_calls_made} className="bg-brand-navy" />
                <MiniLegend label={t.dashboard_emails_sent} className="bg-blue-600" />
              </div>
            </div>
            <div className="mt-5 overflow-hidden rounded-lg border border-zinc-100 bg-zinc-50/60 px-3 pt-3">
              <ActivityChart points={data.activitySeries} locale={locale} />
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-surface md:p-5">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-brand-navy" />
              <h2 className="text-base font-semibold text-zinc-950">{t.dashboard_funnel_title}</h2>
            </div>
            <div className="mt-5 space-y-3">
              {data.funnel.map(item => (
                <div key={item.key}>
                  <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                    <span className="font-medium text-zinc-700">{t.dashboard_funnel_step(item.key)}</span>
                    <span className="text-zinc-500">{formatNumber(item.count)} · {item.rate}%</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className="h-full rounded-full bg-brand-navy"
                      style={{ width: `${Math.max(4, item.rate)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
          <section className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-surface md:p-5">
            <div className="flex items-center gap-2">
              <Target className="h-4 w-4 text-brand-navy" />
              <h2 className="text-base font-semibold text-zinc-950">{t.dashboard_pipeline_title}</h2>
            </div>
            <div className="mt-5 space-y-3">
              {data.pipeline.map(item => (
                <div key={item.status} className="grid grid-cols-[8.5rem_minmax(0,1fr)_3rem] items-center gap-3">
                  <ProspectStatusBadge status={item.status} />
                  <div className="h-2 overflow-hidden rounded-full bg-zinc-100">
                    <div className="h-full rounded-full bg-brand-red" style={{ width: `${Math.max(3, item.rate)}%` }} />
                  </div>
                  <span className="text-right text-sm font-medium text-zinc-600">{item.count}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl border border-zinc-200/90 bg-white p-4 shadow-surface md:p-5">
            <div className="flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-brand-navy" />
              <h2 className="text-base font-semibold text-zinc-950">{t.dashboard_followups_title}</h2>
            </div>
            <div className="mt-4 divide-y divide-zinc-100">
              {data.followUps.length === 0 && (
                <p className="py-6 text-sm text-zinc-500">{t.dashboard_no_followups}</p>
              )}
              {data.followUps.map(item => (
                <Link
                  key={item.id}
                  href={`/prospects/${item.prospectId}`}
                  className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-zinc-50/70"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-zinc-900">{item.prospectName}</p>
                    <p className="mt-0.5 truncate text-xs text-zinc-500">
                      {item.type === "appointment" ? t.dashboard_appointment : t.dashboard_callback} · {item.title}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-medium text-zinc-700">{formatDateTime(item.date, locale)}</p>
                    {item.status && <p className="mt-0.5 text-xs text-zinc-400">{t.status(item.status)}</p>}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
