import React, { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  BarChart, Bar, LineChart, Line, AreaChart, Area,
  PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import { ALL_CATEGORIES, CATEGORY_COLORS, type Category, type Expense, type GraphType } from '../types';
import CategoryChip from '../components/CategoryChip';

interface Props {
  expenses: Expense[];
}

type DateRange = '7d' | '30d' | '90d' | 'this_month' | 'last_month' | 'all';

const DATE_RANGES: { value: DateRange; label: string }[] = [
  { value: '7d', label: '7D' },
  { value: '30d', label: '30D' },
  { value: '90d', label: '90D' },
  { value: 'this_month', label: 'Month' },
  { value: 'last_month', label: 'Last Mo' },
  { value: 'all', label: 'All' },
];

const GRAPH_TYPES: { value: GraphType; label: string; icon: React.ReactNode }[] = [
  {
    value: 'bar', label: 'Bar',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="10" width="4" height="12"/><rect x="10" y="5" width="4" height="17"/><rect x="18" y="1" width="4" height="21"/></svg>,
  },
  {
    value: 'line', label: 'Line',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>,
  },
  {
    value: 'area', label: 'Area',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M3 20 L3 10 L8 14 L13 6 L18 11 L21 8 L21 20 Z" fill="currentColor" stroke="none" opacity="0.4"/><polyline points="3 10 8 14 13 6 18 11 21 8"/></svg>,
  },
  {
    value: 'pie', label: 'Pie',
    icon: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v10l8 4A10 10 0 1 1 12 2z"/></svg>,
  },
];

function getDateBounds(range: DateRange): { start: string; end: string } {
  const today = dayjs();
  const end = today.format('YYYY-MM-DD');
  switch (range) {
    case '7d': return { start: today.subtract(6, 'day').format('YYYY-MM-DD'), end };
    case '30d': return { start: today.subtract(29, 'day').format('YYYY-MM-DD'), end };
    case '90d': return { start: today.subtract(89, 'day').format('YYYY-MM-DD'), end };
    case 'this_month': return { start: today.startOf('month').format('YYYY-MM-DD'), end };
    case 'last_month': {
      const lm = today.subtract(1, 'month');
      return { start: lm.startOf('month').format('YYYY-MM-DD'), end: lm.endOf('month').format('YYYY-MM-DD') };
    }
    case 'all': return { start: '2000-01-01', end };
  }
}

const tooltipStyle = {
  backgroundColor: '#ffffff',
  border: '1px solid #e5e7eb',
  borderRadius: 10,
  color: '#111827',
  fontSize: 12,
  boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
};

const AnalyticsPage: React.FC<Props> = ({ expenses }) => {
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([...ALL_CATEGORIES]);
  const [graphType, setGraphType] = useState<GraphType>('bar');

  const toggleCategory = (cat: Category) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const { start, end } = getDateBounds(dateRange);

  const filtered = useMemo(
    () => expenses.filter((e) => e.date >= start && e.date <= end && selectedCategories.includes(e.category)),
    [expenses, start, end, selectedCategories]
  );

  const total = filtered.reduce((s, e) => s + e.amount, 0);
  const count = filtered.length;

  const dailyData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { map[e.date] = (map[e.date] || 0) + e.amount; });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, amount]) => ({ date: dayjs(date + 'T00:00:00').format('DD MMM'), amount: +amount.toFixed(2) }));
  }, [filtered]);

  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { map[e.category] = (map[e.category] || 0) + e.amount; });
    return Object.entries(map)
      .sort(([, a], [, b]) => b - a)
      .map(([name, value]) => ({ name, value: +value.toFixed(2) }));
  }, [filtered]);

  const renderChart = () => {
    if (filtered.length === 0) {
      return (
        <div className="flex items-center justify-center h-48 text-gray-400 text-sm">
          No data for the selected filters.
        </div>
      );
    }

    const commonProps = { data: dailyData, margin: { top: 4, right: 8, left: -16, bottom: 0 } };
    const axisProps = { tick: { fill: '#9ca3af', fontSize: 11 }, tickLine: false, axisLine: false };
    const gridProps = { strokeDasharray: '3 3', stroke: '#f3f4f6', vertical: false };

    if (graphType === 'pie') {
      return (
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie data={categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={95} innerRadius={40}
              label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
              labelLine={false}
            >
              {categoryData.map((entry) => (
                <Cell key={entry.name} fill={CATEGORY_COLORS[entry.name as Category] || '#6366f1'} />
              ))}
            </Pie>
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v}`, '']} />
            <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11, color: '#6b7280' }} />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    if (graphType === 'line') {
      return (
        <ResponsiveContainer width="100%" height={240}>
          <LineChart {...commonProps}>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={(v) => `₹${v}`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v}`, 'Amount']} />
            <Line type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: '#6366f1' }} />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    if (graphType === 'area') {
      return (
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#6366f1" stopOpacity={0.2} />
                <stop offset="100%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid {...gridProps} />
            <XAxis dataKey="date" {...axisProps} />
            <YAxis {...axisProps} tickFormatter={(v) => `₹${v}`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v}`, 'Amount']} />
            <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2.5} fill="url(#areaGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      );
    }

    return (
      <ResponsiveContainer width="100%" height={240}>
        <BarChart {...commonProps}>
          <CartesianGrid {...gridProps} />
          <XAxis dataKey="date" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => `₹${v}`} />
          <Tooltip contentStyle={tooltipStyle} formatter={(v) => [`₹${v}`, 'Amount']} />
          <Bar dataKey="amount" fill="#6366f1" radius={[5, 5, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <div className="px-4 py-5 flex flex-col gap-4 max-w-lg mx-auto">

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Spent', value: `₹${total.toFixed(0)}` },
          { label: 'Transactions', value: count },
          { label: 'Avg / Day', value: `₹${dailyData.length > 0 ? (total / dailyData.length).toFixed(0) : 0}` },
        ].map((s) => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-1 shadow-sm">
            <span className="text-gray-400 text-[10px] font-semibold uppercase tracking-widest leading-tight">{s.label}</span>
            <span className="text-gray-900 font-bold text-lg leading-tight">{s.value}</span>
          </div>
        ))}
      </div>

      {/* Date Range */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Date Range</span>
        <div className="flex gap-2 flex-wrap">
          {DATE_RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => setDateRange(r.value)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                dateRange === r.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Type */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Chart Type</span>
        <div className="grid grid-cols-4 gap-2">
          {GRAPH_TYPES.map((g) => (
            <button
              key={g.value}
              onClick={() => setGraphType(g.value)}
              className={`flex flex-col items-center gap-1.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                graphType === g.value
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200'
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {g.icon}
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
        <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest block mb-4">
          {GRAPH_TYPES.find((g) => g.value === graphType)?.label} Chart
        </span>
        {renderChart()}
      </div>

      {/* Category Filter */}
      <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Categories</span>
          <div className="flex gap-2">
            <button onClick={() => setSelectedCategories([...ALL_CATEGORIES])} className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">All</button>
            <span className="text-gray-300">|</span>
            <button onClick={() => setSelectedCategories([])} className="text-xs text-gray-400 hover:text-gray-600 font-medium">None</button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {ALL_CATEGORIES.map((cat) => (
            <CategoryChip key={cat} category={cat} selected={selectedCategories.includes(cat)} onClick={toggleCategory} multi />
          ))}
        </div>
      </div>

      {/* Category Breakdown */}
      {categoryData.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-2xl p-4 flex flex-col gap-3 shadow-sm">
          <span className="text-xs font-semibold text-gray-500 uppercase tracking-widest">Breakdown</span>
          {categoryData.map((item) => (
            <div key={item.name} className="flex items-center gap-3">
              <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: CATEGORY_COLORS[item.name as Category] }} />
              <span className="text-xs text-gray-600 w-16 flex-shrink-0">{item.name}</span>
              <div className="flex-1 bg-gray-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${((item.value / total) * 100).toFixed(1)}%`, backgroundColor: CATEGORY_COLORS[item.name as Category] }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-900 w-14 text-right">₹{item.value.toFixed(0)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnalyticsPage;
