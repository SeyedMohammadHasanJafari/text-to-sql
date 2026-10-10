import { useState } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Pin, Check, Loader2 } from 'lucide-react';
import { apiFetch } from '../../api/client.js';
import { useTheme } from '../../context/ThemeContext.jsx';

const PALETTE = ['#10b981', '#6366f1', '#f43f5e', '#8b5cf6', '#06b6d4', '#f59e0b', '#ec4899', '#3b82f6'];

export function InteractiveChart({
  chartData,
  sqlQuery = null,
  sourceMessageId = null,
  showPinButton = true,
  isPinned = false,
  onPinSuccess = null,
}) {
  const { theme } = useTheme();
  const [locallyPinned, setLocallyPinned] = useState(false);
  const [pinning, setPinning] = useState(false);
  const pinned = Boolean(isPinned || locallyPinned);

  if (!chartData || !chartData.data || !Array.isArray(chartData.data) || chartData.data.length === 0) {
    return null;
  }

  const { chart_type = 'bar', title = 'Chart Visualization', x_axis, y_axis, data } = chartData;

  const isDark = theme === 'dark';
  const gridColor = isDark ? '#1e293b' : '#f1f5f9';
  const textColor = isDark ? '#94a3b8' : '#64748b';
  const tooltipBg = isDark ? '#0f172a' : '#ffffff';
  const tooltipBorder = isDark ? '#334155' : '#e2e8f0';

  const handlePin = async () => {
    if (pinned || pinning) return;

    try {
      setPinning(true);
      await apiFetch('/api/dashboard/pins', {
        method: 'POST',
        body: {
          title: title || `${chart_type.toUpperCase()} Chart`,
          chartType: chart_type,
          chartData: { chart_type, title, x_axis, y_axis, data },
          sqlQuery,
          sourceMessageId,
        },
      });
      setLocallyPinned(true);
      if (onPinSuccess) onPinSuccess();
    } catch (err) {
      alert(err.message || 'Failed to pin chart to dashboard');
    } finally {
      setPinning(false);
    }
  };

  const isPersian = (text) => /[\u0600-\u06FF]/.test(text || '');

  const formatNumberWithCommas = (val) => {
    if (val === null || val === undefined) return '';
    const num = Number(val);
    return isNaN(num) ? String(val) : num.toLocaleString();
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200/80 dark:border-slate-800 bg-white/90 dark:bg-[#0f172a]/90 p-4 shadow-sm backdrop-blur-sm space-y-4 my-3">
      {/* Chart Header */}
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-3">
        <div className="min-w-0" dir={isPersian(title) ? 'rtl' : 'ltr'}>
          <h4
            className={`font-bold text-xs sm:text-sm text-slate-900 dark:text-white truncate ${
              isPersian(title) ? 'font-persian' : 'font-sans'
            }`}
          >
            {title}
          </h4>
          <p className="text-[10px] text-slate-400 font-medium">
            {chart_type.toUpperCase()} • {data.length} data points
          </p>
        </div>

        {showPinButton && (
          <button
            onClick={handlePin}
            disabled={pinned || pinning}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              pinned
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 cursor-default opacity-90 shadow-xs'
                : 'bg-slate-100 hover:bg-indigo-50 dark:bg-slate-800 dark:hover:bg-indigo-950/50 text-slate-700 hover:text-indigo-600 dark:text-slate-300 dark:hover:text-indigo-400 cursor-pointer'
            }`}
            title={pinned ? 'Already Pinned to Dashboard' : 'Pin to Dashboard'}
          >
            {pinning ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : pinned ? (
              <Check className="h-3.5 w-3.5 text-emerald-500" />
            ) : (
              <Pin className="h-3.5 w-3.5" />
            )}
            <span className="hidden sm:inline">{pinned ? 'Pinned' : 'Pin'}</span>
          </button>
        )}
      </div>

      {/* Chart Canvas */}
      <div className="h-64 sm:h-72 w-full pt-1" dir="ltr">
        <ResponsiveContainer width="100%" height="100%">
          {chart_type === 'line' ? (
            <LineChart data={data} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey={x_axis}
                stroke={textColor}
                fontSize={11}
                tickLine={false}
                dy={8}
              />
              <YAxis
                stroke={textColor}
                fontSize={10}
                tickLine={false}
                dx={-4}
                width={75}
                tickFormatter={formatNumberWithCommas}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatNumberWithCommas(value),
                  name || (y_axis ? String(y_axis).replace(/_/g, ' ') : 'Value'),
                ]}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Line
                type="monotone"
                dataKey={y_axis}
                stroke="#6366f1"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#6366f1', strokeWidth: 0 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          ) : chart_type === 'pie' ? (
            <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
              <Tooltip
                formatter={(value, name) => [
                  formatNumberWithCommas(value),
                  name || (y_axis ? String(y_axis).replace(/_/g, ' ') : 'Value'),
                ]}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '12px',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Pie
                data={data}
                dataKey={y_axis}
                nameKey={x_axis}
                cx="50%"
                cy="50%"
                outerRadius={80}
                innerRadius={35}
                paddingAngle={3}
              >
                {data.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Pie>
            </PieChart>
          ) : (
            /* Default: BarChart */
            <BarChart data={data} margin={{ top: 10, right: 15, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
              <XAxis
                dataKey={x_axis}
                stroke={textColor}
                fontSize={11}
                tickLine={false}
                dy={8}
              />
              <YAxis
                stroke={textColor}
                fontSize={10}
                tickLine={false}
                dx={-4}
                width={75}
                tickFormatter={formatNumberWithCommas}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatNumberWithCommas(value),
                  name || (y_axis ? String(y_axis).replace(/_/g, ' ') : 'Value'),
                ]}
                contentStyle={{
                  backgroundColor: tooltipBg,
                  borderColor: tooltipBorder,
                  borderRadius: '12px',
                  boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                  fontSize: '12px',
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              <Bar
                dataKey={y_axis}
                fill="#10b981"
                radius={[6, 6, 0, 0]}
              >
                {data.map((_, index) => (
                  <Cell key={`bar-${index}`} fill={PALETTE[index % PALETTE.length]} />
                ))}
              </Bar>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  );
}
