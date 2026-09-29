import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingUp, Users, Clock, ShieldCheck, X, RefreshCw } from 'lucide-react';
import { AnalyticsData, TimeSeriesPoint } from '../types';
import { fetchAnalytics } from '../services/api';

interface AnalyticsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AnalyticsModal: React.FC<AnalyticsModalProps> = ({ isOpen, onClose }) => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [timeRange, setTimeRange] = useState<'1m' | '5m' | '30m' | '1h' | 'today'>('1m');
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await fetchAnalytics();
      setData(res);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Select time series points based on selected range
  const getPoints = (): TimeSeriesPoint[] => {
    if (!data) return [];
    if (timeRange === '1m') return data.time_series_1m || [];
    if (timeRange === '5m') return data.time_series_5m || [];
    if (timeRange === '30m') return data.time_series_30m || [];
    if (timeRange === '1h') return data.time_series_1h || [];
    return data.time_series_today || [];
  };

  const points = getPoints();
  const maxVal = Math.max(6, ...(points.map(p => p.people_count) || [6]));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-mono text-xs">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-slate-950 px-5 py-3 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-emerald-400" />
            <h2 className="text-sm font-bold text-slate-100 uppercase tracking-wider">
              DETECTION ANALYTICS & CROWD TELEMETRY
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={loading}
              className="text-slate-400 hover:text-slate-200 p-1"
              title="Refresh Analytics"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-200">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1">
          {/* Key Stat Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-500 text-[10px] block">TOTAL DETECTIONS</span>
              <span className="text-xl font-bold text-slate-100">
                {data?.total_detections_today.toLocaleString() || 0}
              </span>
              <span className="text-[10px] text-emerald-400 block mt-0.5">Recorded today</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-500 text-[10px] block">PEAK CROWD COUNT</span>
              <span className="text-xl font-bold text-cyan-400">
                {data?.peak_people_count || 0}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">
                Avg: {data?.average_people_count || 0} people
              </span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-500 text-[10px] block">AVG CONFIDENCE</span>
              <span className="text-xl font-bold text-emerald-400">
                {data ? `${Math.round(data.average_confidence * 100)}%` : '--'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">CV model score</span>
            </div>

            <div className="bg-slate-950/70 border border-slate-800 p-3 rounded-lg">
              <span className="text-slate-500 text-[10px] block">AVG TRACK DURATION</span>
              <span className="text-xl font-bold text-amber-400">
                {data ? `${Math.round(data.average_tracking_duration_seconds)}s` : '--'}
              </span>
              <span className="text-[10px] text-slate-400 block mt-0.5">Subject persistence</span>
            </div>
          </div>

          {/* Time Series Chart Container */}
          <div className="bg-slate-950/80 border border-slate-800 p-4 rounded-lg space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-bold text-slate-200 text-xs uppercase">PEOPLE COUNT OVER TIME</span>

              {/* Time Range Filter Buttons */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-0.5 rounded">
                {(['1m', '5m', '30m', '1h', 'today'] as const).map((range) => (
                  <button
                    key={range}
                    onClick={() => setTimeRange(range)}
                    className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold transition-colors ${
                      timeRange === range
                        ? 'bg-emerald-500 text-slate-950'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {range}
                  </button>
                ))}
              </div>
            </div>

            {/* SVG Interactive Line Chart */}
            <div className="h-52 w-full pt-2">
              {points.length > 1 ? (
                <svg viewBox="0 0 600 200" className="w-full h-full overflow-visible">
                  {/* Grid Lines */}
                  {[0, 0.25, 0.5, 0.75, 1.0].map((frac, idx) => {
                    const y = 170 - frac * 140;
                    const val = Math.round(frac * maxVal);
                    return (
                      <g key={idx}>
                        <line x1="40" y1={y} x2="580" y2={y} stroke="#1e293b" strokeDasharray="3 3" />
                        <text x="25" y={y + 4} fill="#64748b" fontSize="10" fontFamily="monospace" textAnchor="end">
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Area fill */}
                  <polygon
                    points={`40,170 ${points
                      .map((pt, i) => {
                        const x = 40 + (i / (points.length - 1)) * 540;
                        const y = 170 - (pt.people_count / maxVal) * 140;
                        return `${x},${y}`;
                      })
                      .join(' ')} 580,170`}
                    fill="rgba(16, 185, 129, 0.15)"
                  />

                  {/* Polyline */}
                  <polyline
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={points
                      .map((pt, i) => {
                        const x = 40 + (i / (points.length - 1)) * 540;
                        const y = 170 - (pt.people_count / maxVal) * 140;
                        return `${x},${y}`;
                      })
                      .join(' ')}
                  />

                  {/* Point circles */}
                  {points.map((pt, i) => {
                    const x = 40 + (i / (points.length - 1)) * 540;
                    const y = 170 - (pt.people_count / maxVal) * 140;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="3"
                        fill="#06b6d4"
                        stroke="#0f172a"
                        strokeWidth="1.5"
                      />
                    );
                  })}

                  {/* X Axis Time Labels */}
                  {points.filter((_, i) => i % Math.ceil(points.length / 5) === 0).map((pt, idx, arr) => {
                    const origIndex = points.indexOf(pt);
                    const x = 40 + (origIndex / (points.length - 1)) * 540;
                    return (
                      <text
                        key={idx}
                        x={x}
                        y="190"
                        fill="#64748b"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {pt.timestamp}
                      </text>
                    );
                  })}
                </svg>
              ) : (
                <div className="h-full flex items-center justify-center text-slate-500 italic">
                  Collecting time-series data points...
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-slate-950 px-5 py-3 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
