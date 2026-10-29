import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  FaCamera, 
  FaTrophy, 
  FaShareNodes, 
  FaCheck, 
  FaScissors, 
  FaShieldHeart, 
  FaArrowRight,
  FaCircleQuestion,
  FaHandsHoldingCircle,
  FaImage,
  FaXmark
} from 'react-icons/fa6';
import { HiSparkles } from 'react-icons/hi2';
import { GiMustache, GiComb, GiRazor } from 'react-icons/gi';
import MustacheSilhouette, {
  LarnieSvg,
  FrenchCutSvg,
  UpperLipSvg,
  BuffaloSvg,
  ChopsSvg,
  WhaleTaleSvg
} from './MustacheStyleIllustrations';

export const MUSTACHE_STYLES_DATA = [
  {
    id: 'larnie',
    name: 'The Larnie',
    subtitle: 'The Dapper Handlebar',
    badge: 'Classic Posh',
    difficulty: 4,
    imageSrc: '/styles/the-larnie.png',
    component: LarnieSvg,
    mzansiMeaning: '“Larnie” is classic South African slang for high-class, fancy, posh, or sophisticated. This look commands instant respect in any boardroom or braai.',
    description: 'An immaculate handlebar mustache featuring sweeping symmetrical wings that curl gracefully upward into tight, waxed spirals at each tip.',
    groomingTips: [
      'Allow facial hair to grow past the lip corners without trimming the ends.',
      'Train bristles outward daily using a boar-bristle mustache comb.',
      'Apply firm-hold mustache wax to the tips and twist upward with thumb and forefinger.',
      'Keep the philtrum cleanly parted and the lower lip line sharp.'
    ],
    judgeCriteria: 'AI calipers evaluate tip curl height, spiral symmetry, wing density, and wax hold durability.',
    celebrityInspo: 'Lord Kitchener, Daniel Day-Lewis, Franz Joseph',
    idealFor: 'Contestants with patience, dense lateral growth, and a taste for vintage swagger.'
  },
  {
    id: 'french-cut',
    name: 'The French-Cut',
    subtitle: 'The Sleek Pencil',
    badge: 'Sharp Precision',
    difficulty: 3,
    imageSrc: '/styles/the-french-cut.png',
    component: FrenchCutSvg,
    mzansiMeaning: 'Tailored continental elegance for the modern Mzansi bro who values surgical barber precision over unruly bush.',
    description: 'A razor-sharp, ultra-clean pencil-thin mustache meticulously groomed directly above the upper lip with a crisp philtrum separation.',
    groomingTips: [
      'Maintain an exact width of 3mm to 5mm using a precision micro-trimmer or straight razor.',
      'Shave the philtrum gap cleanly for a symmetrical split above Cupid’s bow.',
      'Trim daily to prevent 5 o’clock shadow from blurring the immaculate outline.',
      'Hydrate with lightweight beard oil to keep the line sleek and jet-black.'
    ],
    judgeCriteria: 'AI calipers reward laser-level horizontal straightness, razor-sharp edge margins, and zero stray stubble.',
    celebrityInspo: 'Errol Flynn, Prince, Clark Gable',
    idealFor: 'Gents with finer facial hair or those who prefer immaculate, high-fashion grooming.'
  },
  {
    id: 'upper-lip',
    name: 'The Upper-Lip',
    subtitle: 'The Heavyweight Chevron',
    badge: 'All-Time Icon',
    difficulty: 2,
    imageSrc: '/styles/the-upper-lip.png',
    component: UpperLipSvg,
    mzansiMeaning: 'The undisputed King of the Philtrum. Synonymous with legendary braai masters, rugby heroes, and pure Movember heritage.',
    description: 'A dense, broad, full-bodied chevron mustache spanning generously across the entire width of the upper lip without curls or droop.',
    groomingTips: [
      'Let hair grow naturally dense for 3 to 4 weeks across the entire upper lip.',
      'Comb straight down and trim along the vermilion border of the upper lip.',
      'Do not allow hairs to curl into the mouth — maintain a clean horizontal bottom edge.',
      'Condition regularly with beard wash to keep follicles thick, soft, and vibrant.'
    ],
    judgeCriteria: 'AI calipers award maximum points for bristle volume, follicular density, and a solid horizontal lower margin.',
    celebrityInspo: 'Tom Selleck, Ron Swanson, Burt Reynolds, Freddie Mercury',
    idealFor: 'Natural growers blessed with dense facial hair seeking undeniable masculine authority.'
  },
  {
    id: 'buffalo',
    name: 'The Buffalo',
    subtitle: 'The African Horn Arc',
    badge: 'Big Five Power',
    difficulty: 4,
    imageSrc: '/styles/the-buffalo.png',
    component: BuffaloSvg,
    mzansiMeaning: 'Named after the mighty African Cape Buffalo of the Big Five. Fearless, wide-reaching, and unmistakably South African.',
    description: 'A formidable wide mustache that dips slightly in the center and flares aggressively outward and upward across the cheeks like majestic buffalo horns.',
    groomingTips: [
      'Grow the outer thirds wide past the mouth corners into the cheek zone.',
      'Shave the chin and neck clean to accentuate the sprawling horizontal span.',
      'Use medium mustache balm to sculpt the outer wings into an outward crescent arc.',
      'Ensure the central dip matches the natural arch of your lip line.'
    ],
    judgeCriteria: 'AI calipers score horizontal span width, upward horn curve radius, and bold bristle presence.',
    celebrityInspo: 'Theodore Roosevelt, Wyatt Earp, African Bush Legends',
    idealFor: 'Contestants with wide cheek growth who want an intimidating, charismatic contest entry.'
  },
  {
    id: 'chops',
    name: 'The Chops',
    subtitle: 'The Horseshoe Drooper',
    badge: 'Rugged Rebel',
    difficulty: 4,
    imageSrc: '/styles/the-chops.png',
    component: ChopsSvg,
    mzansiMeaning: 'Side-chops fused into an authoritative horseshoe framework. Pure rock-and-roll attitude engineered for high swagger.',
    description: 'An aggressive hybrid where a bold upper-lip bar turns 90 degrees downward at the corners of the mouth, descending past the jawline into vertical side-chops.',
    groomingTips: [
      'Grow out both the upper lip and the lower vertical facial hair channels down to the jaw.',
      'Shave the chin and lower soul patch completely bare for high contrast.',
      'Keep the vertical drop lines parallel and symmetrical on both cheeks.',
      'Trim the outer edges weekly with a guard to prevent muttonchop ballooning.'
    ],
    judgeCriteria: 'AI calipers evaluate vertical drop alignment, equal pillar length, and a pristine bare chin.',
    celebrityInspo: 'Hulk Hogan, Lemmy Kilmister, John Lennon',
    idealFor: 'Gents with strong vertical beard growth ready to make an unforgettable visual statement.'
  },
  {
    id: 'whale-tale',
    name: 'The Whale Tale',
    subtitle: 'The Layered Fluke',
    badge: 'Architectural Sculpt',
    difficulty: 5,
    imageSrc: '/styles/the-whale-tale.png',
    component: WhaleTaleSvg,
    mzansiMeaning: 'Inspired by the majestic southern right whales gracing Hermanus and South Africa’s coast. A multi-layered follicular sculpture.',
    description: 'A distinctive tiered chevron featuring three horizontally combed layered ridges that sweep downward and flare outward like the flukes of a breaching whale.',
    groomingTips: [
      'Requires substantial length and bristle density across the entire philtrum.',
      'Comb with a fine-toothed mustache comb into horizontal layered tiers.',
      'Apply light sculpting wax to create defined horizontal ridges.',
      'Trim the outer corners at a gentle flared angle to mimic whale flukes.'
    ],
    judgeCriteria: 'AI calipers score tier layer visibility, ridge separation texture, and symmetrical outer flare.',
    celebrityInspo: 'Vintage Victorian Explorers, High-Barber Artisans',
    idealFor: 'Master groomers and grooming artisans aiming for the coveted DVT Innovation Trophy.'
  }
];

export default function StyleGuide() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('styles'); // 'styles' | 'rules' | 'grooming'
  const [selectedStyle, setSelectedStyle] = useState(MUSTACHE_STYLES_DATA[0]);
  const [copiedLink, setCopiedLink] = useState(false);
  const [showPosterModal, setShowPosterModal] = useState(false);

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  return (
    <div className="style-guide-page fade-in">
      {/* Hero Header matching Style Guide Flyer */}
      <section className="brovember-hero-poster">
        <div className="poster-sunburst-arch">
          <svg viewBox="0 0 400 120" className="sunburst-svg" aria-hidden="true">
            <defs>
              <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#F59E0B" />
                <stop offset="50%" stopColor="#FBBF24" />
                <stop offset="100%" stopColor="#D97706" />
              </linearGradient>
            </defs>
            {/* Geometric African sunburst rays arch */}
            <path d="M 50 110 C 120 20 280 20 350 110" stroke="url(#goldGradient)" strokeWidth="3" fill="none" />
            <path d="M 70 110 C 135 35 265 35 330 110" stroke="url(#goldGradient)" strokeWidth="2" fill="none" />
            <path d="M 90 110 C 150 50 250 50 310 110" stroke="url(#goldGradient)" strokeWidth="2" strokeDasharray="6 4" fill="none" />
            <line x1="200" y1="10" x2="200" y2="40" stroke="url(#goldGradient)" strokeWidth="3" />
            <line x1="160" y1="18" x2="170" y2="46" stroke="url(#goldGradient)" strokeWidth="2.5" />
            <line x1="240" y1="18" x2="230" y2="46" stroke="url(#goldGradient)" strokeWidth="2.5" />
            <line x1="120" y1="36" x2="140" y2="58" stroke="url(#goldGradient)" strokeWidth="2" />
            <line x1="280" y1="36" x2="260" y2="58" stroke="url(#goldGradient)" strokeWidth="2" />
          </svg>
        </div>

        <div className="poster-branding-wrap">
          <span className="badge-pill gold-pill" style={{ marginBottom: '12px' }}>Official Movember 2026 Guide</span>
          <h1 className="poster-main-title">MOUSTACHE STYLE GUIDE</h1>
          <p className="poster-tagline">
            “Grown and groomed. Whatever you grow will save an Mzansi bro.”
          </p>
        </div>

        <div className="poster-quick-actions">
          <button 
            type="button" 
            className="btn btn-primary btn-gold-glow"
            onClick={() => navigate('/booth')}
          >
            <FaCamera className="btn-icon" /> Enter Mustache Challenge
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/leaderboard')}
          >
            <FaTrophy className="btn-icon" /> View Leaderboard
          </button>
          <button 
            type="button" 
            className="btn btn-subtle"
            onClick={() => setShowPosterModal(true)}
            title="View original style guide document"
          >
            <FaImage className="btn-icon" /> View Original Document
          </button>
          <button 
            type="button" 
            className="btn btn-subtle"
            onClick={handleCopyLink}
            title="Share this style guide"
          >
            {copiedLink ? <FaCheck className="btn-icon text-emerald-400" /> : <FaShareNodes className="btn-icon" />}
            {copiedLink ? 'Link Copied!' : 'Share Guide'}
          </button>
        </div>

        {/* Clean Link to Brovember Website */}
        <div className="poster-partners-bar" style={{ justifyContent: 'center' }}>
          <div className="partner-item">
            <span className="text-slate-400 text-xs">Official Men's Health Initiative:</span>
            <a 
              href="https://www.brovember.co.za" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="partner-link font-bold text-cyan-400 hover:text-cyan-300 transition-colors inline-flex items-center gap-1.5"
            >
              <span>Visit www.brovember.co.za</span>
              <span className="text-xs">↗</span>
            </a>
          </div>
        </div>
      </section>

      {/* Interactive Tabs */}
      <div className="guide-nav-tabs">
        <button 
          className={`guide-tab-btn ${activeTab === 'styles' ? 'active' : ''}`}
          onClick={() => setActiveTab('styles')}
        >
          <GiMustache className="tab-icon" /> The 6 Official Styles
        </button>
        <button 
          className={`guide-tab-btn ${activeTab === 'rules' ? 'active' : ''}`}
          onClick={() => setActiveTab('rules')}
        >
          <FaShieldHeart className="tab-icon" /> Rules & AI Scoring
        </button>
        <button 
          className={`guide-tab-btn ${activeTab === 'grooming' ? 'active' : ''}`}
          onClick={() => setActiveTab('grooming')}
        >
          <GiComb className="tab-icon" /> Barber & Grooming Masterclass
        </button>
      </div>

      {/* TAB 1: THE 6 OFFICIAL STYLES */}
      {activeTab === 'styles' && (
        <section className="guide-content-section fade-in">
          <div className="section-header-wrap text-center">
            <span className="badge-pill">Official Movember Archetypes</span>
            <h2 className="section-title">Pick Your Battle Stash</h2>
            <p className="section-desc">
              Every contestant’s facial hair is evaluated against these six official archetypes, taken directly from the style guide document.
              Click any style to examine its grooming blueprint and what our Gemini AI Judge looks for.
            </p>
          </div>

          {/* 6 Grid Cards */}
          <div className="styles-showcase-grid">
            {MUSTACHE_STYLES_DATA.map(style => {
              const isSelected = selectedStyle.id === style.id;

              return (
                <div 
                  key={style.id} 
                  className={`style-card ${isSelected ? 'selected' : ''}`}
                  onClick={() => setSelectedStyle(style)}
                >
                  <div className="style-card-badge">
                    <span>{style.badge}</span>
                    <span className="style-stars">
                      {'★'.repeat(style.difficulty)}{'☆'.repeat(5 - style.difficulty)}
                    </span>
                  </div>

                  {/* Authentic Extracted Image from Document */}
                  <div className="style-silhouette-container">
                    <img 
                      src={style.imageSrc} 
                      alt={style.name} 
                      className="style-svg-art" 
                      loading="lazy" 
                    />
                  </div>

                  <div className="style-card-content">
                    <h3 className="style-title">{style.name}</h3>
                    <div className="style-subtitle">{style.subtitle}</div>
                    <p className="style-summary">{style.description}</p>
                  </div>

                  <div className="style-card-actions">
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-cyan"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/leaderboard?category=${encodeURIComponent(style.name)}`);
                      }}
                      title={`View all ${style.name} contenders`}
                    >
                      <FaTrophy /> See Leaders
                    </button>
                    <button
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate('/booth');
                      }}
                      title={`Enter contest with ${style.name}`}
                    >
                      <FaCamera /> Enter with Style
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Focused Style Deep-Dive Inspector */}
          {selectedStyle && (
            <div className="style-inspector-card fade-in">
              <div className="inspector-header">
                <div className="inspector-art-wrap">
                  <img 
                    src={selectedStyle.imageSrc} 
                    alt={selectedStyle.name} 
                    className="inspector-svg" 
                    loading="lazy" 
                  />
                </div>
                <div className="inspector-title-wrap">
                  <div className="badge-pill gold-pill">{selectedStyle.badge}</div>
                  <h3 className="inspector-name">{selectedStyle.name}</h3>
                  <div className="inspector-sub">{selectedStyle.subtitle}</div>
                  <div className="inspector-difficulty">
                    Difficulty Level: <span className="text-gold font-bold">{'★'.repeat(selectedStyle.difficulty)}{'☆'.repeat(5 - selectedStyle.difficulty)}</span>
                  </div>
                </div>
              </div>

              <div className="inspector-body-grid">
                <div className="inspector-col">
                  <h4 className="col-heading">
                    <HiSparkles className="text-gold" /> Mzansi Heritage & Story
                  </h4>
                  <p className="mzansi-story-box">{selectedStyle.mzansiMeaning}</p>
                  <p className="style-full-desc">{selectedStyle.description}</p>

                  <div className="inspo-pill">
                    <strong>Celebrity Inspo:</strong> {selectedStyle.celebrityInspo}
                  </div>
                  <div className="inspo-pill mt-2">
                    <strong>Ideal Grower:</strong> {selectedStyle.idealFor}
                  </div>
                </div>

                <div className="inspector-col">
                  <h4 className="col-heading">
                    <FaScissors className="text-cyan-400" /> Barber Grooming Blueprint
                  </h4>
                  <ul className="grooming-step-list">
                    {selectedStyle.groomingTips.map((tip, idx) => (
                      <li key={idx} className="grooming-step-item">
                        <span className="step-num">{idx + 1}</span>
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="judge-calipers-box">
                    <div className="judge-calipers-title">
                      <GiMustache className="text-gold" /> What Gemini AI Judge Looks For:
                    </div>
                    <p className="judge-calipers-text">{selectedStyle.judgeCriteria}</p>
                  </div>

                  <div className="inspector-cta-row">
                    <button 
                      className="btn btn-primary w-full"
                      onClick={() => navigate('/booth')}
                    >
                      <FaCamera className="btn-icon" /> Submit My {selectedStyle.name} Photo
                    </button>
                    <button 
                      className="btn btn-secondary w-full"
                      onClick={() => navigate(`/leaderboard?category=${encodeURIComponent(selectedStyle.name)}`)}
                    >
                      <FaTrophy className="btn-icon" /> View {selectedStyle.name} Leaderboard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {/* TAB 2: RULES & AI SCORING */}
      {activeTab === 'rules' && (
        <section className="guide-content-section fade-in">
          <div className="section-header-wrap text-center">
            <span className="badge-pill">Contest Rules & Regulations</span>
            <h2 className="section-title">How the DVT Mustache Challenge Works</h2>
            <p className="section-desc">
              Everything you need to know about entering, charity impact, AI caliper scoring, and winning the R1,000 Grand Prize.
            </p>
          </div>

          <div className="rules-grid">
            <div className="rule-card">
              <div className="rule-card-icon gold">
                <GiRazor />
              </div>
              <h3 className="rule-card-title">1. Day 1 Clean Shave</h3>
              <p className="rule-card-text">
                Every contestant begins by submitting a clean-shaven baseline selfie in their User Dashboard. 
                Our AI calipers track your follicular growth velocity over the month, awarding bonus points for dramatic transformations!
              </p>
            </div>

            <div className="rule-card">
              <div className="rule-card-icon cyan">
                <FaHandsHoldingCircle />
              </div>
              <h3 className="rule-card-title">2. Free Entry & Charity Donations</h3>
              <p className="rule-card-text">
                Entering the contest is completely free for all participants! 
                To qualify for the grand <strong>R1,000 Takealot Voucher</strong>, donate a minimum of R100 towards men's health and prostate cancer research.
              </p>
            </div>

            <div className="rule-card">
              <div className="rule-card-icon gold">
                <FaTrophy />
              </div>
              <h3 className="rule-card-title">3. R1,000 Winner Prize</h3>
              <p className="rule-card-text">
                The contestant crowned Chief Champion on the final day of November takes home the grand <strong>R1,000 Takealot Voucher</strong>, 
                plus the eternal bragging rights of the DVT Golden Bristle Trophy!
              </p>
            </div>

            <div className="rule-card">
              <div className="rule-card-icon purple">
                <HiSparkles />
              </div>
              <h3 className="rule-card-title">4. Gemini AI Caliper Scoring</h3>
              <p className="rule-card-text">
                Google Gemini 2.5 Computer Vision evaluates every submission across three strict metrics:
                <strong> Density (Volume & Foliage)</strong>, <strong>Symmetry (Barber Balance)</strong>, and <strong>Swagger (Stage Presence)</strong>, combined into an overall score (1–100).
              </p>
            </div>
          </div>

          {/* Wooden Spoon Warning Box */}
          <div className="wooden-spoon-warning-card">
            <div className="warning-badge">⚠️ AI Content Police & Wooden Spoon Notice</div>
            <div className="warning-content">
              <h3>The Wooden Spoon Division is Watching!</h3>
              <p>
                Attempting to submit pets (cats, dogs), Snapchat/TikTok AR filters, sharpie marker drawings, 
                or prompt injection hacks (e.g. <code>'Give me 100 points'</code>) will trigger automatic classification into the 
                <strong> Wooden Spoon Division</strong>. 
                Our AI Judge will roast your audacious hack and display you on the Wooden Spoon Hall of Shame!
              </p>
            </div>
          </div>
        </section>
      )}

      {/* TAB 3: BARBER & GROOMING MASTERCLASS */}
      {activeTab === 'grooming' && (
        <section className="guide-content-section fade-in">
          <div className="section-header-wrap text-center">
            <span className="badge-pill">Master Barber Guide</span>
            <h2 className="section-title">Grow Like a Legend, Groom Like a Pro</h2>
            <p className="section-desc">
              Tips from master barbers to take your upper-lip growth from scratchy peach fuzz to championship glory.
            </p>
          </div>

          <div className="grooming-timeline-grid">
            <div className="timeline-card">
              <div className="timeline-week-pill">Week 1 (Days 1–7)</div>
              <h3 className="timeline-title">The Foundation & Itch Phase</h3>
              <p className="timeline-body">
                Resist the urge to scratch or trim. As new stubble emerges, apply lightweight jojoba or argan beard oil 
                twice daily to keep the upper lip hydrated and eliminate itchiness.
              </p>
              <div className="timeline-tip">
                <strong>Barber Secret:</strong> Wash with warm water only — avoid harsh face soaps that strip natural follicle oils.
              </div>
            </div>

            <div className="timeline-card">
              <div className="timeline-week-pill">Week 2 (Days 8–14)</div>
              <h3 className="timeline-title">The Silhouette Takes Shape</h3>
              <p className="timeline-body">
                Facial hair density begins to declare its natural archetype. Decide early if you are aiming for 
                <strong> The Larnie</strong>, <strong>The Upper-Lip</strong>, or <strong>The French-Cut</strong>.
              </p>
              <div className="timeline-tip">
                <strong>Barber Secret:</strong> Use a fine-tooth horn comb to train hairs sideways away from the center philtrum.
              </div>
            </div>

            <div className="timeline-card">
              <div className="timeline-week-pill">Week 3 (Days 15–21)</div>
              <h3 className="timeline-title">The Precision Trim Window</h3>
              <p className="timeline-body">
                Trim only the hairs touching your upper lip pink vermilion border with precision barber shears. 
                Do NOT use clippers with guards that can take too much bulk out of the core body.
              </p>
              <div className="timeline-tip">
                <strong>Barber Secret:</strong> Trim while dry and un-waxed; wet hairs appear longer and shrink when dry!
              </div>
            </div>

            <div className="timeline-card">
              <div className="timeline-week-pill">Week 4 (Days 22–30)</div>
              <h3 className="timeline-title">Championship Sculpt & Swagger</h3>
              <p className="timeline-body">
                Warm mustache wax between thumbs and apply from center outward. Sculpt curls or horizontal flares, 
                align your lighting, and step into the DVT Webcam Booth for official judging!
              </p>
              <div className="timeline-tip">
                <strong>Barber Secret:</strong> Direct front-facing natural light reveals optimal follicle density to the AI camera.
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Bottom Sticky Action Banner */}
      <section className="guide-bottom-cta">
        <div className="cta-container">
          <div className="cta-text">
            <h3>Ready to Put Your Stash to the Test?</h3>
            <p>Step up to the virtual judge, earn your official archetype verdict, and back a worthy brother in Mzansi.</p>
          </div>
          <div className="cta-buttons">
            <button 
              className="btn btn-primary btn-lg"
              onClick={() => navigate('/booth')}
            >
              <FaCamera className="btn-icon" /> Step into the Webcam Booth
            </button>
            <button 
              className="btn btn-secondary btn-lg"
              onClick={() => navigate('/leaderboard')}
            >
              <FaTrophy className="btn-icon" /> Check Current Podium
            </button>
          </div>
        </div>
      </section>

      {/* Original Document Modal */}
      {showPosterModal && (
        <div 
          className="modal-backdrop fade-in" 
          onClick={() => setShowPosterModal(false)}
          role="dialog" 
          aria-modal="true"
        >
          <div 
            className="auth-modal-card scale-in" 
            style={{ maxWidth: '640px', padding: '24px', background: '#0a0f18', border: '1px solid rgba(0,180,216,0.3)' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <GiMustache className="text-cyan-400 text-lg" />
                <span>Original Moustache Style Guide Document</span>
              </div>
              <button 
                type="button" 
                className="text-slate-400 hover:text-white text-lg p-1"
                onClick={() => setShowPosterModal(false)}
                aria-label="Close"
              >
                <FaXmark />
              </button>
            </div>

            <div className="rounded-xl overflow-hidden border border-white/10 bg-black flex justify-center">
              <img 
                src="/styles/poster.jpg" 
                alt="Official Moustache Style Guide Document" 
                className="w-full h-auto max-h-[75vh] object-contain"
              />
            </div>

            <div className="mt-4 flex items-center justify-between text-xs text-slate-400">
              <span>All 6 official styles are extracted directly from this document.</span>
              <a 
                href="https://www.brovember.co.za" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-cyan-400 hover:underline font-semibold"
              >
                www.brovember.co.za ↗
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
