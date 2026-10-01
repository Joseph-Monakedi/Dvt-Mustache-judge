import React, { useState, useEffect } from 'react';
import { FaTrophy, FaCrown, FaMagnifyingGlass, FaXmark, FaArrowRight } from 'react-icons/fa6';
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchLeaderboard = async () => {
    try {
      const url = selectedCategory === 'All' 
        ? '/api/mustache/leaderboard?limit=100'
        : `/api/mustache/leaderboard?limit=100&category=${encodeURIComponent(selectedCategory)}`;

      const res = await fetch(apiUrl(url));
      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }
      const data = await res.json();
      setEntries(data.entries || []);
      setTotalEntries(data.totalEntries || 0);
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
    fetchLeaderboard();
  }, [selectedCategory]);

  useEffect(() => {
    const interval = setInterval(() => {
      fetchLeaderboard();
    }, 10000);

    return () => clearInterval(interval);
  }, [selectedCategory]);

  const filteredEntries = entries.filter(e => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.contestantName.toLowerCase().includes(q) ||
      (e.officeLocation && e.officeLocation.toLowerCase().includes(q)) ||
      e.mustacheTitle.toLowerCase().includes(q)
    );
  });

  const topThree = entries.slice(0, 3);

  return (
    <div className="leaderboard-container fade-in">
      {/* Header Banner */}
      <div className="leaderboard-header">
        <div>
          <h1 className="leaderboard-title">
            DVT Movember Leaderboard <FaTrophy className="title-trophy-icon" />
          </h1>
          <p className="leaderboard-subtitle">
            Live bristle standings across all DVT squads. Auto-refreshes every 10 seconds.
          </p>
        </div>

        <div className="live-status-pill">
          <span className="live-dot"></span>
          <span className="live-text">
            LIVE • {totalEntries} Entries • Refreshed {lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
          </span>
        </div>
      </div>

      {/* Top 3 Podium */}
      {selectedCategory === 'All' && !searchQuery.trim() && topThree.length >= 3 && (
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
            <div className="podium-score gold-score">{topThree[0].overallScore}</div>
            <h3 className="podium-name gold-text">{topThree[0].contestantName}</h3>
            <div className="podium-title">"{topThree[0].mustacheTitle}"</div>
            <div className="podium-badge-tag gold-tag">{topThree[0].verdictBadge}</div>
            <div className="podium-pedestal gold-pedestal">GRAND CHAMPION</div>
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
            placeholder="Search contestant or office location..."
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
            <span className="spinner"></span> Loading supreme standings...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="empty-state">
            <GiMustache className="empty-icon" />
            <h3>No Mustaches Found</h3>
            <p>No contestants match the current filter. Be the first to enter!</p>
            <button className="action-btn" onClick={onGoToBooth}>
              Judge Your Mustache Now
            </button>
          </div>
        ) : (
          <div className="standings-table-wrapper">
            <table className="standings-table">
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Contestant</th>
                  <th>Office Location</th>
                  <th>Style Archetype</th>
                  <th>Scores (D/S/Sw)</th>
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
                      <span className={`rank-pill rank-${entry.rank <= 3 ? entry.rank : 'other'}`}>
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
                    <td className="breakdown-col">
                      <div className="subscores-compact">
                        <span title="Density">D: {entry.densityScore}</span>
                        <span>•</span>
                        <span title="Symmetry">S: {entry.symmetryScore}</span>
                        <span>•</span>
                        <span title="Swagger">Sw: {entry.swaggerScore}</span>
                      </div>
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
        )}
      </div>
    </div>
  );
}
