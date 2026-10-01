import React, { useState, useEffect } from 'react';
import { FaTrophy, FaCrown, FaMagnifyingGlass, FaXmark, FaArrowRight, FaUtensils } from 'react-icons/fa6';
import { GiMustache } from 'react-icons/gi';
import { apiUrl } from '../utils/api';

const CATEGORIES = [
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

export default function Leaderboard({ onSelectEntry, onGoToBooth }) {
  const [entries, setEntries] = useState([]);
  const [totalEntries, setTotalEntries] = useState(0);
  const [championshipCount, setChampionshipCount] = useState(0);
  const [woodenSpoonCount, setWoodenSpoonCount] = useState(0);
  const [division, setDivision] = useState('championship'); // 'championship' | 'woodenspoon'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(() => new Date());

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
      setChampionshipCount(data.championshipEntriesCount || 0);
      setWoodenSpoonCount(data.woodenSpoonEntriesCount || 0);
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
      e.contestantName.toLowerCase().includes(q) ||
      (e.officeLocation && e.officeLocation.toLowerCase().includes(q)) ||
      e.mustacheTitle.toLowerCase().includes(q) ||
      (e.woodenSpoonReason && e.woodenSpoonReason.toLowerCase().includes(q))
    );
  });

  const topThree = entries.slice(0, 3);
  const isSpoonDivision = division === 'woodenspoon';

  return (
    <div className="leaderboard-container fade-in">
      {/* Header Banner */}
      <div className="leaderboard-header">
        <div>
          <h1 className="leaderboard-title">
            {isSpoonDivision ? (
              <>The Wooden Spoon Gallery <FaUtensils className="title-trophy-icon text-orange" /></>
            ) : (
              <>DVT Movember Championship <FaTrophy className="title-trophy-icon" /></>
            )}
          </h1>
          <p className="leaderboard-subtitle">
            {isSpoonDivision 
              ? 'Honouring cartoons, doodles, AI marvels, pets, and drawn-on masterpieces.'
              : 'Live bristle standings for genuine, real-life human mustaches across all DVT squads.'}
          </p>
        </div>

        <div className="live-status-pill">
          <span className="live-dot"></span>
          <span className="live-text">
            LIVE • {totalEntries} in Division • Refreshed {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Division Switch Tabs */}
      <div className="division-switch-tabs">
        <button
          type="button"
          className={`division-tab ${!isSpoonDivision ? 'active' : ''}`}
          onClick={() => {
            setDivision('championship');
            setSelectedCategory('All');
          }}
        >
          <FaTrophy className="tab-icon" /> Genuine Entries ({championshipCount})
        </button>
        <button
          type="button"
          className={`division-tab spoon-tab ${isSpoonDivision ? 'active' : ''}`}
          onClick={() => {
            setDivision('woodenspoon');
            setSelectedCategory('All');
          }}
        >
          <FaUtensils className="tab-icon" /> The Wooden Spoon ({woodenSpoonCount})
        </button>
      </div>

      {error && (
        <div className="leaderboard-error-banner">
          <span>{error}</span>
        </div>
      )}

      {/* Top 3 Podium */}
      {selectedCategory === 'All' && !searchQuery.trim() && topThree.length >= 3 && (
        <div className="podium-section">
          {/* 2nd Place (Silver) */}
          <div 
            className={`podium-card silver-card ${isSpoonDivision ? 'spoon-podium-card' : ''}`}
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
            {isSpoonDivision && topThree[1].woodenSpoonReason && (
              <div className="podium-spoon-reason-badge">
                 {topThree[1].woodenSpoonReason}
              </div>
            )}
            <div className="podium-badge-tag">{topThree[1].verdictBadge}</div>
            <div className="podium-pedestal silver-pedestal">
              {isSpoonDivision ? '2ND RUNNER UP' : '2ND PLACE'}
            </div>
          </div>

          {/* 1st Place (Gold Champion or Spoon Master) */}
          <div 
            className={`podium-card gold-card ${isSpoonDivision ? 'spoon-grand-card' : ''}`}
            onClick={() => onSelectEntry(topThree[0])}
          >
            {isSpoonDivision ? (
              <FaUtensils className="crown-icon text-orange" />
            ) : (
              <FaCrown className="crown-icon" />
            )}
            <div className={`podium-rank-badge ${isSpoonDivision ? 'spoon-badge' : 'gold-badge'}`}>1</div>
            <div className={`podium-avatar-wrapper ${isSpoonDivision ? 'spoon-avatar-border' : 'gold-avatar-border'}`}>
              <img 
                src={topThree[0].thumbnailUrl || topThree[0].imageUrl} 
                alt={topThree[0].contestantName} 
                className="podium-avatar" 
              />
            </div>
            <div className={`podium-score ${isSpoonDivision ? 'spoon-score' : 'gold-score'}`}>
              {topThree[0].overallScore}
            </div>
            <h3 className="podium-name gold-text">{topThree[0].contestantName}</h3>
            <div className="podium-title">"{topThree[0].mustacheTitle}"</div>
            {isSpoonDivision && topThree[0].woodenSpoonReason && (
              <div className="podium-spoon-reason-badge">
                 {topThree[0].woodenSpoonReason}
              </div>
            )}
            <div className={`podium-badge-tag ${isSpoonDivision ? 'spoon-tag' : 'gold-tag'}`}>
              {topThree[0].verdictBadge}
            </div>
            <div className={`podium-pedestal ${isSpoonDivision ? 'spoon-pedestal' : 'gold-pedestal'}`}>
              {isSpoonDivision ? 'WOODEN SPOON CHAMPION' : 'GRAND CHAMPION'}
            </div>
          </div>

          {/* 3rd Place (Bronze) */}
          <div 
            className={`podium-card bronze-card ${isSpoonDivision ? 'spoon-podium-card' : ''}`}
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
            {isSpoonDivision && topThree[2].woodenSpoonReason && (
              <div className="podium-spoon-reason-badge">
                 {topThree[2].woodenSpoonReason}
              </div>
            )}
            <div className="podium-badge-tag">{topThree[2].verdictBadge}</div>
            <div className="podium-pedestal bronze-pedestal">3RD PLACE</div>
          </div>
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="leaderboard-controls">
        <div className="category-chips">
          {CATEGORIES.map(cat => (
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
            placeholder="Search contestant, office, or reason..."
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
          <div className="loading-state">
            <span className="spinner"></span> Loading standings...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">
            <GiMustache className="empty-icon" />
            <h3>No entries in this division</h3>
            <p>
              {isSpoonDivision 
                ? 'No cartoon, AI or drawn-on submissions yet. Try uploading a doodle in the booth!'
                : 'No real contestant records match this filter.'}
            </p>
            <button className="action-btn" onClick={onGoToBooth}>
              Judge Your Mustache Now
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
                    <th>Office Location</th>
                    <th>Style Archetype</th>
                    {isSpoonDivision && <th>Wooden Spoon Reason</th>}
                    <th>
                      {isSpoonDivision ? 'Scores (Inn / Ded / Fun)' : 'Scores (D / S / Sw)'}
                    </th>
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
                        <span className={`rank-pill ${isSpoonDivision ? 'rank-spoon' : entry.rank <= 3 ? `rank-${entry.rank}` : 'rank-other'}`}>
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
                      <td className="cohort-col">
                        <span className="cohort-text">{entry.officeLocation || 'DVT'}</span>
                      </td>
                      <td className="category-col">
                        <span className="style-tag">{entry.styleCategory}</span>
                      </td>
                      {isSpoonDivision && (
                        <td className="spoon-reason-col">
                          <span className="division-badge badge-woodenspoon">
                             {entry.woodenSpoonReason || 'Creative Submission'}
                          </span>
                        </td>
                      )}
                      <td className="breakdown-col">
                        {isSpoonDivision ? (
                          <div className="subscores-compact spoon-subscores">
                            <span title="Innovation">Inn: {entry.innovationScore}</span>
                            <span>•</span>
                            <span title="Dedication">Ded: {entry.dedicationScore}</span>
                            <span>•</span>
                            <span title="Funniness">Fun: {entry.funninessScore}</span>
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
                        <div className={`score-badge ${isSpoonDivision ? 'score-woodenspoon' : entry.overallScore === 0 ? 'score-zero' : entry.overallScore >= 90 ? 'score-gold' : entry.overallScore >= 80 ? 'score-cyan' : 'score-standard'}`}>
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
                    <span className={`rank-pill ${isSpoonDivision ? 'rank-spoon' : entry.rank <= 3 ? `rank-${entry.rank}` : 'rank-other'}`}>
                      #{entry.rank}
                    </span>
                    <span className="mobile-card-location">{entry.officeLocation || 'REMOTE'}</span>
                    <div className={`score-badge ${isSpoonDivision ? 'score-woodenspoon' : entry.overallScore === 0 ? 'score-zero' : entry.overallScore >= 90 ? 'score-gold' : entry.overallScore >= 80 ? 'score-cyan' : 'score-standard'}`}>
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
                        {isSpoonDivision && entry.woodenSpoonReason && (
                          <span className="division-badge badge-woodenspoon mobile-reason-tag">
                             {entry.woodenSpoonReason}
                          </span>
                        )}
                      </div>
                      <div className="mobile-subscores-wrap">
                        {isSpoonDivision ? (
                          <span className="mobile-subscores-text text-orange">
                            Inn: {entry.innovationScore} • Ded: {entry.dedicationScore} • Fun: {entry.funninessScore}
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
