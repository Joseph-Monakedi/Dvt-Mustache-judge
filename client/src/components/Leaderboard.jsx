import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { FaTrophy, FaCrown, FaMagnifyingGlass, FaXmark, FaArrowRight } from 'react-icons/fa6';
import { HiSparkles } from 'react-icons/hi2';
import { GiMustache } from 'react-icons/gi';
import { apiUrl } from '../utils/api';

const MUSTACHE_CATEGORIES = [
  'All',
  'Chevron',
  'Handlebar',
  'Painter\'s Brush',
  'Walrus',
  'Horseshoe',
  'Pencil',
  'Stubbled Maverick',
  'Peach Fuzz'
];

const CRAZY_HAIR_CATEGORIES = [
  'All',
  'Wild Afro',
  'Neon Punk',
  'Beehive Extravaganza',
  'Spiked Mohawk',
  'Galactic Braids',
  'Funky Mullet',
  'Glitter Cascade',
  'Bedhead Chic',
  'Creative Chaos'
];

function PodiumSkeleton() {
  return (
    <div className="podium-skeleton-section fade-in">
      {/* 2nd Place (Silver) */}
      <div className="podium-skeleton-card">
        <div className="skeleton-shimmer podium-skeleton-rank"></div>
        <div className="skeleton-shimmer podium-skeleton-avatar"></div>
        <div className="skeleton-shimmer podium-skeleton-score"></div>
        <div className="skeleton-shimmer podium-skeleton-name"></div>
        <div className="skeleton-shimmer podium-skeleton-title"></div>
        <div className="skeleton-shimmer podium-skeleton-badge"></div>
        <div className="skeleton-shimmer podium-skeleton-pedestal"></div>
      </div>
      {/* 1st Place (Gold) */}
      <div className="podium-skeleton-card gold-skeleton">
        <div className="skeleton-shimmer podium-skeleton-rank"></div>
        <div className="skeleton-shimmer podium-skeleton-avatar"></div>
        <div className="skeleton-shimmer podium-skeleton-score"></div>
        <div className="skeleton-shimmer podium-skeleton-name"></div>
        <div className="skeleton-shimmer podium-skeleton-title"></div>
        <div className="skeleton-shimmer podium-skeleton-badge"></div>
        <div className="skeleton-shimmer podium-skeleton-pedestal"></div>
      </div>
      {/* 3rd Place (Bronze) */}
      <div className="podium-skeleton-card">
        <div className="skeleton-shimmer podium-skeleton-rank"></div>
        <div className="skeleton-shimmer podium-skeleton-avatar"></div>
        <div className="skeleton-shimmer podium-skeleton-score"></div>
        <div className="skeleton-shimmer podium-skeleton-name"></div>
        <div className="skeleton-shimmer podium-skeleton-title"></div>
        <div className="skeleton-shimmer podium-skeleton-badge"></div>
        <div className="skeleton-shimmer podium-skeleton-pedestal"></div>
      </div>
    </div>
  );
}

function TableSkeleton() {
  const rows = [1, 2, 3, 4, 5, 6];
  return (
    <div className="table-skeleton-container fade-in">
      <div className="desktop-only" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {rows.map(i => (
          <div key={i} className="table-skeleton-row">
            <div className="skeleton-shimmer" style={{ width: '34px', height: '24px', borderRadius: '12px' }}></div>
            <div className="table-skeleton-contestant">
              <div className="skeleton-shimmer table-skeleton-avatar"></div>
              <div className="table-skeleton-names">
                <div className="skeleton-shimmer" style={{ width: '140px', height: '16px', borderRadius: '4px' }}></div>
                <div className="skeleton-shimmer" style={{ width: '90px', height: '12px', borderRadius: '4px' }}></div>
              </div>
            </div>
            <div className="skeleton-shimmer" style={{ width: '100px', height: '16px', borderRadius: '4px' }}></div>
            <div className="skeleton-shimmer" style={{ width: '90px', height: '22px', borderRadius: '12px' }}></div>
            <div className="skeleton-shimmer" style={{ width: '110px', height: '14px', borderRadius: '4px' }}></div>
            <div className="skeleton-shimmer" style={{ width: '48px', height: '26px', borderRadius: '14px' }}></div>
            <div className="skeleton-shimmer" style={{ width: '70px', height: '28px', borderRadius: '6px' }}></div>
          </div>
        ))}
      </div>
      <div className="mobile-skeleton-cards mobile-only">
        {rows.slice(0, 4).map(i => (
          <div key={i} className="mobile-skeleton-card">
            <div className="mobile-skeleton-top">
              <div className="skeleton-shimmer" style={{ width: '40px', height: '22px', borderRadius: '12px' }}></div>
              <div className="skeleton-shimmer" style={{ width: '80px', height: '14px', borderRadius: '4px' }}></div>
              <div className="skeleton-shimmer" style={{ width: '36px', height: '24px', borderRadius: '12px' }}></div>
            </div>
            <div className="mobile-skeleton-body">
              <div className="skeleton-shimmer" style={{ width: '48px', height: '48px', borderRadius: '50%' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
                <div className="skeleton-shimmer" style={{ width: '70%', height: '16px', borderRadius: '4px' }}></div>
                <div className="skeleton-shimmer" style={{ width: '50%', height: '12px', borderRadius: '4px' }}></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Leaderboard({ onSelectEntry, onGoToBooth }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const [entries, setEntries] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [mustacheCount, setMustacheCount] = useState(0);
  const [crazyHairCount, setCrazyHairCount] = useState(0);
  const [division, setDivision] = useState(() => searchParams.get('division') === 'crazyhair' ? 'crazyhair' : 'mustache');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

  const isCrazyHair = division === 'crazyhair';
  const categories = isCrazyHair ? CRAZY_HAIR_CATEGORIES : MUSTACHE_CATEGORIES;

  const fetchLeaderboard = async () => {
    try {
      const url = selectedCategory === 'All' 
        ? `/api/mustache/leaderboard?limit=100&division=${division}`
        : `/api/mustache/leaderboard?limit=100&division=${division}&category=${encodeURIComponent(selectedCategory)}`;

      const res = await fetch(apiUrl(url));
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      setEntries(data.entries || []);
      setTotalEntries(data.totalEntries || 0);
      setMustacheCount(data.mustacheEntriesCount ?? data.championshipEntriesCount ?? 0);
      setCrazyHairCount(data.crazyHairEntriesCount ?? data.woodenSpoonEntriesCount ?? 0);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.warn('Leaderboard fetch error:', err);
      setError('Could not refresh leaderboard. Reconnecting...');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchLeaderboard();
  }, [selectedCategory, division]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedCategory, division]);

  const filteredEntries = entries.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (e.contestantName && e.contestantName.toLowerCase().includes(q)) ||
      (e.mustacheTitle && e.mustacheTitle.toLowerCase().includes(q)) ||
      (e.styleCategory && e.styleCategory.toLowerCase().includes(q))
    );
  });

  const topThree = entries.slice(0, 3);

  return (
    <div className="leaderboard-container fade-in">
      {/* Top Ambient Loading Bar during Background Refresh */}
      {loading && entries.length > 0 && <div className="global-loading-bar" />}

      {/* Grand Prize & Prostate Cancer Awareness Donation Banner */}
      <div className="mb-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-[#007FBA]/20 via-[#0b1320] to-purple-950/30 border border-cyan-500/40 shadow-2xl backdrop-blur-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-black px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/50 shadow-sm">
                🏆 GRAND PRIZES: R1,000 Takealot Vouchers
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/40">
                🎗️ Prostate Cancer Awareness & Research
              </span>
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              Two Challenges. Free Registration. R1,000 Grand Prizes!
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Anyone can enter and climb the leaderboard for free! The competition is split into two tracks: the <strong>Movember Mustache Challenge</strong> (for mustache growers) and <strong>The Mane Event: Crazy Hair Challenge</strong> (for women and non-growers). 
              Both tracks offer a grand prize of a <strong>R1,000 Takealot Voucher</strong> to eligible participants who have donated a minimum of <strong>R100</strong>.
            </p>
          </div>
          <div className="shrink-0 p-4 bg-[#070c14]/90 border border-cyan-400/30 rounded-xl text-xs space-y-1.5 text-slate-300 shadow-lg">
            <div className="font-bold text-cyan-300 flex items-center gap-1.5 text-sm">
              💬 How to Donate:
            </div>
            <div>Contact <strong>Rose Allen</strong> via <strong>MS Teams</strong></div>
            <div>Or Email: <a href="mailto:RAllen@dvtsoftware.com" className="text-cyan-400 hover:underline font-mono font-bold">RAllen@dvtsoftware.com</a></div>
            <div className="text-[11px] text-slate-400 pt-1 border-t border-white/10">
              * Minimum R100 donation required for Grand Prize eligibility.
            </div>
          </div>
        </div>
      </div>

      {/* Header Banner */}
      <div className="leaderboard-header">
        <div>
          <h1 className="leaderboard-title">
            {isCrazyHair ? (
              <>The Mane Event: Crazy Hair Challenge <HiSparkles className="title-trophy-icon text-purple-400" /></>
            ) : (
              <>DVT Movember Mustache Challenge <GiMustache className="title-trophy-icon text-cyan-400" /></>
            )}
          </h1>
          <p className="leaderboard-subtitle">
            {isCrazyHair 
              ? 'Wild styles, vibrant colors & creative hairdos for women and non-growers! Grand Prize: R1,000 Takealot Voucher for eligible donors.'
              : 'Live bristle standings for genuine, real-life human mustaches across all DVT squads. Grand Prize: R1,000 Takealot Voucher for eligible donors.'}
          </p>
        </div>

        <div className="live-status-pill">
          <span className="live-dot"></span>
          <span className="live-text">
            {loading && entries.length > 0 ? (
              <span className="bg-refreshing-pill"><span className="bg-refreshing-dot"></span> Syncing Standings...</span>
            ) : (
              `LIVE • ${totalEntries} in Challenge • Refreshed ${lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
            )}
          </span>
        </div>
      </div>

      {/* Division Switch Tabs */}
      <div className="division-switch-tabs">
        <button
          type="button"
          className={`division-tab ${!isCrazyHair ? 'active' : ''}`}
          onClick={() => {
            setDivision('mustache');
            setSelectedCategory('All');
            setSearchParams({ division: 'mustache' });
          }}
        >
          <GiMustache className="tab-icon text-cyan-400" /> Mustache Challenge ({mustacheCount})
        </button>
        <button
          type="button"
          className={`division-tab ${isCrazyHair ? 'active' : ''}`}
          onClick={() => {
            setDivision('crazyhair');
            setSelectedCategory('All');
            setSearchParams({ division: 'crazyhair' });
          }}
        >
          <HiSparkles className="tab-icon text-purple-400" /> The Mane Event: Crazy Hair ({crazyHairCount})
        </button>
      </div>

      {error && (
        <div className="leaderboard-error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Top 3 Podium or Loading Skeleton */}
      {selectedCategory === 'All' && !searchQuery.trim() && (
        loading && entries.length === 0 ? (
          <PodiumSkeleton />
        ) : topThree.length >= 3 ? (
          <div className="podium-section">
            {/* 2nd Place (Silver) */}
            <div 
              className="podium-card silver-card"
              onClick={() => onSelectEntry(topThree[1])}
            >
              <div className="podium-rank-badge silver-badge">2</div>
              <div className="podium-avatar-wrapper">
                <img 
                  src={topThree[1].thumbnailUrl || topThree[1].imageUrl} 
                  alt={topThree[1].contestantName} 
                  className="podium-avatar" 
                />
              </div>
              <div className="podium-score silver-score">{topThree[1].overallScore}</div>
              <h3 className="podium-name">{topThree[1].contestantName}</h3>
              <div className="podium-title">"{topThree[1].mustacheTitle}"</div>
              
              <div className="my-1.5">
                {topThree[1].isPrizeEligible ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🏆 R1,000 Eligible (Donated)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10">
                    🎗️ Community Entry
                  </span>
                )}
              </div>

              <div className="podium-badge-tag">{topThree[1].verdictBadge}</div>
              <div className="podium-pedestal silver-pedestal">2ND PLACE</div>
            </div>

            {/* 1st Place (Gold Champion) */}
            <div 
              className="podium-card gold-card"
              onClick={() => onSelectEntry(topThree[0])}
            >
              <FaCrown className="crown-icon" />
              <div className="podium-rank-badge gold-badge">1</div>
              <div className="podium-avatar-wrapper gold-avatar-border">
                <img 
                  src={topThree[0].thumbnailUrl || topThree[0].imageUrl} 
                  alt={topThree[0].contestantName} 
                  className="podium-avatar" 
                />
              </div>
              <div className="podium-score gold-score">
                {topThree[0].overallScore}
              </div>
              <h3 className="podium-name gold-text">{topThree[0].contestantName}</h3>
              <div className="podium-title">"{topThree[0].mustacheTitle}"</div>
              
              <div className="my-1.5">
                {topThree[0].isPrizeEligible ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-0.5 rounded-full bg-emerald-500/25 text-emerald-300 border border-emerald-500/50 shadow-md">
                    🏆 R1,000 Grand Prize Eligible
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10">
                    🎗️ Community Leader
                  </span>
                )}
              </div>

              <div className="podium-badge-tag gold-tag">
                {topThree[0].verdictBadge}
              </div>
              <div className="podium-pedestal gold-pedestal">
                {isCrazyHair ? 'MANE EVENT CHAMPION' : 'MUSTACHE CHAMPION'}
              </div>
            </div>

            {/* 3rd Place (Bronze) */}
            <div 
              className="podium-card bronze-card"
              onClick={() => onSelectEntry(topThree[2])}
            >
              <div className="podium-rank-badge bronze-badge">3</div>
              <div className="podium-avatar-wrapper">
                <img 
                  src={topThree[2].thumbnailUrl || topThree[2].imageUrl} 
                  alt={topThree[2].contestantName} 
                  className="podium-avatar" 
                />
              </div>
              <div className="podium-score bronze-score">{topThree[2].overallScore}</div>
              <h3 className="podium-name">{topThree[2].contestantName}</h3>
              <div className="podium-title">"{topThree[2].mustacheTitle}"</div>
              
              <div className="my-1.5">
                {topThree[2].isPrizeEligible ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    🏆 R1,000 Eligible (Donated)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10">
                    🎗️ Community Entry
                  </span>
                )}
              </div>

              <div className="podium-badge-tag">{topThree[2].verdictBadge}</div>
              <div className="podium-pedestal bronze-pedestal">3RD PLACE</div>
            </div>
          </div>
        ) : null
      )}

      {/* Filter and Search Bar */}
      <div className="leaderboard-controls">
        <div className="category-chips">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              className={`chip-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="search-bar">
          <FaMagnifyingGlass className="search-icon" />
          <input
            type="text"
            className="search-input"
            placeholder="Search contestant or style..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <button className="clear-search" onClick={() => setSearchQuery('')}>
              <FaXmark />
            </button>
          )}
        </div>
      </div>

      {/* Standings Table / List */}
      <div className="standings-card">
        {loading && entries.length === 0 ? (
          <TableSkeleton />
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">
            {isCrazyHair ? <HiSparkles className="empty-icon text-purple-400" /> : <GiMustache className="empty-icon text-cyan-400" />}
            <h3>No entries in this challenge yet</h3>
            <p>
              {isCrazyHair 
                ? 'Be the first to showcase your crazy, creative hairdo in The Mane Event!'
                : 'No mustache contestant records match this filter yet.'}
            </p>
            <button className="action-btn" onClick={onGoToBooth}>
              {isCrazyHair ? 'Enter The Mane Event' : 'Judge Your Mustache Now'}
            </button>
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="standings-table-wrapper desktop-only">
              <table className="standings-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Contestant</th>
                    <th>Style Archetype</th>
                    <th>Prize Eligibility</th>
                    <th>{isCrazyHair ? 'Scores (Vol / Style / Char)' : 'Scores (D / S / Sw)'}</th>
                    <th>Overall</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredEntries.map(entry => (
                    <tr 
                      key={entry.id} 
                      className="standings-row"
                      onClick={() => onSelectEntry(entry)}
                    >
                      <td className="rank-col">
                        <span className={`rank-pill ${entry.rank <= 3 ? `rank-${entry.rank}` : 'rank-other'}`}>
                          #{entry.rank}
                        </span>
                      </td>
                      <td className="contestant-col">
                        <div className="contestant-cell">
                          <img 
                            src={entry.thumbnailUrl || entry.imageUrl} 
                            alt={entry.contestantName} 
                            className="table-avatar"
                          />
                          <div>
                            <div className="table-contestant-name">{entry.contestantName}</div>
                            <div className="table-stache-title">"{entry.mustacheTitle}"</div>
                          </div>
                        </div>
                      </td>
                      <td className="category-col">
                        <span className="style-tag">{entry.styleCategory}</span>
                      </td>
                      <td className="prize-col">
                        {entry.isPrizeEligible ? (
                          <span className="inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm" title="Donated R100+ • Eligible for R1,000 Takealot Voucher">
                            <FaTrophy className="text-amber-400 text-xs" /> R1,000 Eligible
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-slate-800/80 text-slate-400 border border-white/10" title="Community Entry • Donate R100+ via Rose to become eligible for R1,000 voucher">
                            🎗️ Community
                          </span>
                        )}
                      </td>
                      <td className="breakdown-col">
                        {isCrazyHair ? (
                          <div className="subscores-compact">
                            <span title="Volume & Texture">Vol: {entry.densityScore}</span>
                            <span>•</span>
                            <span title="Styling & Form">Style: {entry.symmetryScore}</span>
                            <span>•</span>
                            <span title="Wild Charisma">Char: {entry.swaggerScore}</span>
                          </div>
                        ) : (
                          <div className="subscores-compact">
                            <span title="Density">D: {entry.densityScore}</span>
                            <span>•</span>
                            <span title="Symmetry">S: {entry.symmetryScore}</span>
                            <span>•</span>
                            <span title="Swagger">Sw: {entry.swaggerScore}</span>
                          </div>
                        )}
                      </td>
                      <td className="overall-col">
                        <div className={`score-badge ${entry.overallScore === 0 ? 'score-zero' : entry.overallScore >= 90 ? 'score-gold' : entry.overallScore >= 80 ? 'score-cyan' : 'score-standard'}`}>
                          {entry.overallScore}
                        </div>
                      </td>
                      <td className="action-col">
                        <button 
                          type="button" 
                          className="table-view-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectEntry(entry);
                          }}
                        >
                          Inspect <FaArrowRight className="btn-icon" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="standings-mobile-cards mobile-only">
              {filteredEntries.map(entry => (
                <div 
                  key={entry.id} 
                  className="mobile-entry-card"
                  onClick={() => onSelectEntry(entry)}
                  role="button"
                  tabIndex={0}
                >
                  <div className="mobile-card-top">
                    <div className="flex items-center gap-2">
                      <span className={`rank-pill ${entry.rank <= 3 ? `rank-${entry.rank}` : 'rank-other'}`}>
                        #{entry.rank}
                      </span>
                      {entry.isPrizeEligible ? (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          🏆 Eligible
                        </span>
                      ) : (
                        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-white/10">
                          🎗️ Community
                        </span>
                      )}
                    </div>
                    <div className={`score-badge ${entry.overallScore === 0 ? 'score-zero' : entry.overallScore >= 90 ? 'score-gold' : entry.overallScore >= 80 ? 'score-cyan' : 'score-standard'}`}>
                      {entry.overallScore}
                    </div>
                  </div>

                  <div className="mobile-card-main">
                    <img 
                      src={entry.thumbnailUrl || entry.imageUrl} 
                      alt={entry.contestantName} 
                      className="mobile-card-avatar"
                    />
                    <div className="mobile-card-details">
                      <div className="mobile-card-name">{entry.contestantName}</div>
                      <div className="mobile-card-title">"{entry.mustacheTitle}"</div>
                      <div className="mobile-card-tags">
                        <span className="style-tag">{entry.styleCategory}</span>
                      </div>
                      <div className="mobile-subscores-wrap">
                        {isCrazyHair ? (
                          <span className="mobile-subscores-text">
                            Vol: {entry.densityScore} • Style: {entry.symmetryScore} • Char: {entry.swaggerScore}
                          </span>
                        ) : (
                          <span className="mobile-subscores-text">
                            D: {entry.densityScore} • S: {entry.symmetryScore} • Sw: {entry.swaggerScore}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="mobile-card-arrow">
                      <FaArrowRight />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
