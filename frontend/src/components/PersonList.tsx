import React from 'react';
import { Users, Navigation, Compass, Activity, ArrowUpRight, HelpCircle } from 'lucide-react';
import { TrackedPerson } from '../types';

interface PersonListProps {
  people: TrackedPerson[];
  selectedPersonId: string | null;
  onSelectPerson: (id: string | null) => void;
}

export const PersonList: React.FC<PersonListProps> = ({
  people,
  selectedPersonId,
  onSelectPerson
}) => {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg flex flex-col font-mono">
      {/* Header */}
      <div className="bg-slate-950/80 px-4 py-2.5 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-slate-200 tracking-wide uppercase">DETECTED PEOPLE ({people.length})</span>
        </div>
        <div className="text-[11px] text-slate-500">
          STABLE TRACK IDs (P001-P999)
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto max-h-[340px] overflow-y-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/60 text-slate-400 text-[11px] uppercase tracking-wider border-b border-slate-800/80 sticky top-0 z-10">
            <tr>
              <th className="px-3 py-2">ID</th>
              <th className="px-3 py-2">Confidence</th>
              <th className="px-3 py-2">Geo Coordinates</th>
              <th className="px-3 py-2">Accuracy</th>
              <th className="px-3 py-2">Distance</th>
              <th className="px-3 py-2">Motion</th>
              <th className="px-3 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {people.length > 0 ? (
              people.map((person) => {
                const isSelected = selectedPersonId === person.id;
                const confPercent = Math.round(person.confidence * 100);

                return (
                  <tr
                    key={person.id}
                    onClick={() => onSelectPerson(isSelected ? null : person.id)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-emerald-500/10 border-l-2 border-emerald-500'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    {/* ID */}
                    <td className="px-3 py-2.5 font-bold text-slate-100 flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${isSelected ? 'bg-emerald-400 shadow-[0_0_6px_#10b981]' : 'bg-cyan-400'}`} />
                      <span>{person.id}</span>
                    </td>

                    {/* Confidence */}
                    <td className="px-3 py-2.5">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                        confPercent >= 90
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : confPercent >= 75
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}>
                        {confPercent}%
                      </span>
                    </td>

                    {/* Coordinates */}
                    <td className="px-3 py-2.5 text-slate-300 text-[11px]">
                      {person.geo ? (
                        <span>
                          {person.geo.lat.toFixed(5)}, {person.geo.lon.toFixed(5)}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic">Uncalibrated</span>
                      )}
                    </td>

                    {/* Accuracy Indicator */}
                    <td className="px-3 py-2.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                        person.location_accuracy === 'HIGH'
                          ? 'text-emerald-400 bg-emerald-500/10'
                          : person.location_accuracy === 'MEDIUM'
                          ? 'text-amber-400 bg-amber-500/10'
                          : 'text-slate-400 bg-slate-800'
                      }`}>
                        {person.location_accuracy}
                      </span>
                    </td>

                    {/* Distance */}
                    <td className="px-3 py-2.5 text-slate-200">
                      {person.distance_meters !== null && person.distance_meters !== undefined ? (
                        <span>{Math.round(person.distance_meters)} m</span>
                      ) : (
                        <span className="text-slate-500">--</span>
                      )}
                    </td>

                    {/* Motion */}
                    <td className="px-3 py-2.5 text-slate-300 text-[11px]">
                      {person.speed_mps > 0 ? (
                        <span className="flex items-center gap-1 text-cyan-400">
                          <Activity className="w-3 h-3 animate-pulse" />
                          <span>{person.speed_mps} m/s {person.direction}</span>
                        </span>
                      ) : (
                        <span className="text-slate-500">Stationary</span>
                      )}
                    </td>

                    {/* Action */}
                    <td className="px-3 py-2.5 text-right">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPerson(isSelected ? null : person.id);
                        }}
                        className={`px-2 py-1 rounded text-[11px] font-mono transition-colors ${
                          isSelected
                            ? 'bg-emerald-500 text-slate-950 font-bold'
                            : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        }`}
                      >
                        {isSelected ? 'Selected' : 'Route'}
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-slate-500 italic">
                  No people currently detected in camera view
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
