import React from 'react';
import { User, Navigation, Clock, Activity, Compass, HelpCircle, X, Footprints, Bike, Car, AlertCircle } from 'lucide-react';
import { TrackedPerson, RouteResponse } from '../types';

interface PersonDetailsProps {
  person: TrackedPerson | undefined;
  routeData: RouteResponse | null;
  routeMode: string;
  onChangeRouteMode: (mode: string) => void;
  onClearSelection: () => void;
}

export const PersonDetails: React.FC<PersonDetailsProps> = ({
  person,
  routeData,
  routeMode,
  onChangeRouteMode,
  onClearSelection
}) => {
  if (!person) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 text-slate-400 font-mono text-xs flex flex-col items-center justify-center text-center min-h-[220px]">
        <User className="w-8 h-8 text-slate-700 mb-2" />
        <p className="text-slate-300 font-semibold mb-1">NO PERSON SELECTED</p>
        <p className="text-slate-500 text-[11px] max-w-xs">
          Click any bounding box in the camera feed, row in the table, or marker on the map to inspect telemetry & calculate routes.
        </p>
      </div>
    );
  }

  const confPercent = Math.round(person.confidence * 100);

  return (
    <div className="bg-slate-900 border border-emerald-500/40 rounded-xl p-4 shadow-xl font-mono text-xs relative flex flex-col gap-3">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="bg-emerald-500/20 border border-emerald-500/40 p-1.5 rounded-lg text-emerald-400">
            <User className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-slate-100">TARGET: {person.id}</span>
              <span className="bg-emerald-500/20 text-emerald-300 text-[10px] px-1.5 py-0.2 rounded border border-emerald-500/30">
                {confPercent}% Conf
              </span>
            </div>
            <span className="text-[10px] text-slate-400">ANONYMOUS TRACKED SUBJECT</span>
          </div>
        </div>

        <button
          onClick={onClearSelection}
          className="text-slate-500 hover:text-slate-300 p-1 transition-colors"
          title="Clear Selection"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Grid of Telemetry */}
      <div className="grid grid-cols-2 gap-2 text-[11px]">
        {/* GPS Coordinates */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-slate-400 text-[10px] block mb-0.5">GEOGRAPHIC POSITION</span>
          {person.geo ? (
            <span className="text-slate-100 font-semibold">
              {person.geo.lat.toFixed(6)}, {person.geo.lon.toFixed(6)}
            </span>
          ) : (
            <span className="text-amber-400">Calibration required</span>
          )}
        </div>

        {/* Location Accuracy with Tooltip */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80 relative group">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[10px] block mb-0.5">LOCATION ACCURACY</span>
            <HelpCircle className="w-3 h-3 text-slate-500 cursor-help" />
          </div>
          <span className={`font-bold ${
            person.location_accuracy === 'HIGH' ? 'text-emerald-400' : person.location_accuracy === 'MEDIUM' ? 'text-amber-400' : 'text-slate-400'
          }`}>
            {person.location_accuracy} {person.accuracy_meters ? `(±${person.accuracy_meters}m)` : ''}
          </span>

          {/* Tooltip */}
          <div className="absolute left-0 bottom-full mb-1 hidden group-hover:block z-30 w-56 bg-slate-950 border border-slate-700 text-slate-300 text-[10px] p-2 rounded shadow-2xl">
            Location accuracy depends on:
            <ul className="list-disc pl-3 mt-1 text-slate-400">
              <li>Camera planar homography</li>
              <li>Camera mounting & tilt angle</li>
              <li>Flat ground plane assumption</li>
              <li>Bounding box ground contact</li>
              <li>Perspective distance from lens</li>
            </ul>
          </div>
        </div>

        {/* Direct Distance */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-slate-400 text-[10px] block mb-0.5">DIRECT DISTANCE</span>
          <span className="text-slate-100 font-bold text-sm">
            {person.distance_meters !== null && person.distance_meters !== undefined ? `${Math.round(person.distance_meters)} m` : '--'}
          </span>
        </div>

        {/* Shortest Route Distance & ETA */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-emerald-400 text-[10px] block mb-0.5 font-bold">SHORTEST ROUTE</span>
          <span className="text-emerald-300 font-bold text-sm">
            {routeData ? `${routeData.route_distance_meters} m` : '--'}
          </span>
          {routeData && (
            <span className="text-slate-400 text-[10px] ml-1">
              ({routeData.formatted_duration})
            </span>
          )}
        </div>

        {/* Movement Telemetry */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-slate-400 text-[10px] block mb-0.5">VELOCITY & HEADING</span>
          <span className="text-slate-200 font-semibold">
            {person.speed_mps > 0 ? `${person.speed_mps} m/s [${person.direction}]` : 'Stationary'}
          </span>
        </div>

        {/* Tracking Duration */}
        <div className="bg-slate-950/60 p-2 rounded border border-slate-800/80">
          <span className="text-slate-400 text-[10px] block mb-0.5">TRACK DURATION</span>
          <span className="text-slate-200 font-semibold">
            {person.duration_seconds.toFixed(0)}s (since {person.first_seen})
          </span>
        </div>
      </div>

      {/* Routing Profile Selector */}
      <div className="bg-slate-950/70 p-2 rounded border border-slate-800 flex items-center justify-between">
        <span className="text-slate-400 text-[10px]">ROUTE PROFILE:</span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onChangeRouteMode('walking')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
              routeMode === 'walking'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Footprints className="w-3 h-3" />
            <span>Walking</span>
          </button>

          <button
            onClick={() => onChangeRouteMode('cycling')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
              routeMode === 'cycling'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Bike className="w-3 h-3" />
            <span>Cycling</span>
          </button>

          <button
            onClick={() => onChangeRouteMode('driving')}
            className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] border transition-colors ${
              routeMode === 'driving'
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 font-bold'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            <Car className="w-3 h-3" />
            <span>Driving</span>
          </button>
        </div>
      </div>

      {/* Fallback Notice if routing was direct */}
      {routeData?.is_fallback && (
        <div className="text-[10px] text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-1 rounded flex items-center gap-1.5">
          <AlertCircle className="w-3 h-3 flex-shrink-0" />
          <span>Routing engine offline — showing direct geodesic distance.</span>
        </div>
      )}
    </div>
  );
};
