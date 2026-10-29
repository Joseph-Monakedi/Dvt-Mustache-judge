import React from 'react';
import { FaAward, FaArrowTrendUp, FaEye } from 'react-icons/fa6';
import Button from '../common/Button';

export default function VaultEntryCard({ entry, onSelectEntry }) {
  const isBest = entry.isBestEntry;

  return (
    <div 
      className={`group relative flex flex-col bg-[#0d1522] border rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-cyan-950/40 ${
        isBest 
          ? 'border-amber-400/50 shadow-lg shadow-amber-500/10' 
          : 'border-white/10 hover:border-cyan-500/40'
      }`}
    >
      {/* Best Entry Ribbon */}
      {isBest && (
        <div className="bg-gradient-to-r from-amber-500 to-yellow-400 text-slate-950 text-xs font-black px-3 py-1 flex items-center justify-center gap-1.5 shadow-md">
          <FaAward className="text-sm" />
          <span>Personal Best • On Leaderboard</span>
        </div>
      )}

      {/* Photo & Category Badges */}
      <div className="relative aspect-4/3 bg-slate-950 overflow-hidden">
        <img
          src={entry.thumbnailUrl || entry.imageUrl}
          alt={entry.mustacheTitle || entry.contestantName}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Style Category */}
        <span className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-cyan-300 text-xs font-semibold px-2.5 py-1 rounded-lg border border-cyan-500/30">
          {entry.styleCategory}
        </span>

        {/* Growth Score Badge */}
        {entry.growthScore > 0 && (
          <span className="absolute top-3 right-3 bg-emerald-950/80 backdrop-blur-md text-emerald-300 text-xs font-bold px-2.5 py-1 rounded-lg border border-emerald-500/40 flex items-center gap-1">
            <FaArrowTrendUp className="text-[10px]" /> {entry.growthScore}% Growth
          </span>
        )}

        {/* Score Overlay */}
        <div className="absolute bottom-3 right-3 bg-slate-950/85 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/15 flex items-baseline gap-1 shadow-lg">
          <span className="text-xl font-black text-cyan-400">{entry.overallScore}</span>
          <span className="text-xs text-slate-400 font-semibold">/100</span>
        </div>
      </div>

      {/* Entry Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div>
          <h4 className="text-base font-bold text-white line-clamp-1 group-hover:text-cyan-300 transition-colors">
            {entry.mustacheTitle || 'The Bristle Submission'}
          </h4>

          <div className="flex items-center justify-between text-xs text-slate-400 mt-1 mb-3">
            <span>
              {new Date(entry.createdAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
            <span className="bg-[#131f33] text-slate-300 px-2 py-0.5 rounded-md border border-white/5">
              {entry.verdictBadge}
            </span>
          </div>

          {/* Subscores Grid */}
          <div className="grid grid-cols-3 gap-2 py-2 border-y border-white/5 text-center">
            <div className="bg-[#131f33]/50 p-1.5 rounded-lg">
              <span className="block text-[10px] text-slate-400 uppercase font-medium">
                {entry.competitionType === 'CreativeMustache' || entry.isWoodenSpoon ? 'Craft' : 'Density'}
              </span>
              <span className="text-xs font-bold text-slate-200">
                {(entry.competitionType === 'CreativeMustache' || entry.isWoodenSpoon ? (entry.innovationScore || entry.densityScore) : entry.densityScore)}/10
              </span>
            </div>
            <div className="bg-[#131f33]/50 p-1.5 rounded-lg">
              <span className="block text-[10px] text-slate-400 uppercase font-medium">
                {entry.competitionType === 'CreativeMustache' || entry.isWoodenSpoon ? 'Innovation' : 'Symmetry'}
              </span>
              <span className="text-xs font-bold text-slate-200">
                {(entry.competitionType === 'CreativeMustache' || entry.isWoodenSpoon ? (entry.dedicationScore || entry.symmetryScore) : entry.symmetryScore)}/10
              </span>
            </div>
            <div className="bg-[#131f33]/50 p-1.5 rounded-lg">
              <span className="block text-[10px] text-slate-400 uppercase font-medium">
                {entry.competitionType === 'CreativeMustache' || entry.isWoodenSpoon ? 'Humor' : 'Swagger'}
              </span>
              <span className="text-xs font-bold text-slate-200">
                {(entry.competitionType === 'CreativeMustache' || entry.isWoodenSpoon ? (entry.funninessScore || entry.swaggerScore) : entry.swaggerScore)}/10
              </span>
            </div>
          </div>

          {/* Celebrity Twin */}
          {entry.celebrityTwin && (
            <p className="text-xs text-slate-300 mt-2">
              <span className="text-slate-400">Twin: </span>
              <span className="font-semibold text-cyan-300">{entry.celebrityTwin}</span>
            </p>
          )}

          {/* Roast Preview */}
          {entry.roast && (
            <p className="text-xs text-slate-400 italic line-clamp-2 mt-2 bg-[#131f33]/40 p-2 rounded-lg border border-white/5">
              "{entry.roast}"
            </p>
          )}
        </div>

        {/* Action Button */}
        <div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onSelectEntry(entry)}
            icon={FaEye}
            className="w-full text-xs"
          >
            {entry.cleanShaveImageUrl ? 'View Transformation & Roast' : 'View Verdict Details'}
          </Button>
        </div>
      </div>
    </div>
  );
}
