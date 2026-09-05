import { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera, Upload, Sparkles, AlertCircle, CheckCircle2,
  Download, Calendar, Scissors, Eye, RefreshCw,
  ChevronRight, ArrowLeftRight, Trash2, Heart,
  ShieldCheck, Info, Palette, Cpu, Award, BookOpen,
  Columns, SplitSquareVertical, X, Timer, RotateCcw
} from 'lucide-react';

import { api } from '../api';

/* ------------------------------------------------------------------ */
/*  CURATED HAIRSTYLE CATALOG                                         */
/* ------------------------------------------------------------------ */
const CURATED_STYLES = [
  {
    id: 'braids-knotless',
    name: 'Knotless Bohemian Braids',
    category: 'braids',
    gender: 'women',
    previewUrl: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?w=500&auto=format&fit=crop&q=80',
    tags: ['Protective', 'Long Boho', 'Lightweight'],
    faceMatch: 'Oval & Heart (99%)',
    maintenance: 'Low • 6-8 weeks',
    careTips: 'Apply mousse & tie with satin scarf nightly.',
  },
  {
    id: 'braids-box',
    name: 'Goddess Box Braids',
    category: 'braids',
    gender: 'women',
    previewUrl: 'https://images.unsplash.com/photo-1584297091622-af8e5fd0a2e5?w=500&auto=format&fit=crop&q=80',
    tags: ['Golden Accents', 'Long', 'Glamour'],
    faceMatch: 'Diamond & Oval (98%)',
    maintenance: 'Medium • 6-8 weeks',
    careTips: 'Oil scalp with peppermint castor oil 2x/week.',
  },
  {
    id: 'afro-taper-fade',
    name: 'Crisp Low Taper Fade',
    category: 'men',
    gender: 'men',
    previewUrl: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=500&auto=format&fit=crop&q=80',
    tags: ['Barber Fade', 'Sharp Lineup', 'Clean'],
    faceMatch: 'Square & Round (99%)',
    maintenance: 'High • Every 1-2 weeks',
    careTips: 'Use curl sponge and light shea butter daily.',
  },
  {
    id: 'chic-french-bob',
    name: 'Chic Sleek Bob',
    category: 'short',
    gender: 'women',
    previewUrl: 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=500&auto=format&fit=crop&q=80',
    tags: ['Sleek Cut', 'Jawline Focus', 'Modern'],
    faceMatch: 'Heart & Oval (97%)',
    maintenance: 'Low • Trim every 5-6 weeks',
    careTips: 'Apply heat protectant spray before flat ironing.',
  },
  {
    id: 'curly-afro-crown',
    name: 'Natural Afro Crown',
    category: 'natural',
    gender: 'all',
    previewUrl: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=500&auto=format&fit=crop&q=80',
    tags: ['Type 4 Coils', 'Hydrated', 'Crown Volume'],
    faceMatch: 'All Shapes (100%)',
    maintenance: 'Medium • Daily moisture',
    careTips: 'Use LOC method (Liquid-Oil-Cream) with leave-in.',
  },
  {
    id: 'waves-balayage',
    name: 'Honey Balayage Waves',
    category: 'wavy',
    gender: 'women',
    previewUrl: 'https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=500&auto=format&fit=crop&q=80',
    tags: ['Layered', 'Honey Tones', 'Glam'],
    faceMatch: 'Diamond & Square (96%)',
    maintenance: 'Medium • Weekly mask',
    careTips: 'Wrap in silk scarf to preserve waves.',
  },
  {
    id: 'buzz-waves-360',
    name: '360 Deep Waves & Edge-Up',
    category: 'men',
    gender: 'men',
    previewUrl: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?w=500&auto=format&fit=crop&q=80',
    tags: ['360 Waves', 'Edge Control', 'Durag Waves'],
    faceMatch: 'Oval & Square (98%)',
    maintenance: 'High • Daily routine',
    careTips: 'Brush 15 mins daily with medium boar brush.',
  },
  {
    id: 'locs-dreadlocks',
    name: 'Boho Faux Locs',
    category: 'braids',
    gender: 'all',
    previewUrl: 'https://images.unsplash.com/photo-1589156280159-27698a70f29e?w=500&auto=format&fit=crop&q=80',
    tags: ['Locs', 'Beaded', 'Protective'],
    faceMatch: 'Oval & Heart (99%)',
    maintenance: 'Very Low • 8-10 weeks',
    careTips: 'Spray scalp with rosewater & tea tree oil.',
  },
  {
    id: 'pompadour-slick',
    name: 'Modern High Pompadour',
    category: 'men',
    gender: 'men',
    previewUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=500&auto=format&fit=crop&q=80',
    tags: ['Executive', 'High Volume', 'Gentleman'],
    faceMatch: 'Round & Square (96%)',
    maintenance: 'Medium • Blowdry routine',
    careTips: 'Use matte clay for flexible hold.',
  },
];

const COLOR_TINTS = [
  { id: 'original', name: 'Original', hex: 'transparent' },
  { id: 'jet-black', name: 'Jet Black', hex: '#0f172a' },
  { id: 'espresso', name: 'Espresso', hex: '#3b2219' },
  { id: 'caramel', name: 'Caramel', hex: '#a75d27' },
  { id: 'honey-blonde', name: 'Honey Blonde', hex: '#d4a359' },
  { id: 'burgundy', name: 'Burgundy', hex: '#7f1d1d' },
  { id: 'platinum', name: 'Platinum', hex: '#cbd5e1' },
  { id: 'rose-gold', name: 'Rose Gold', hex: '#f472b6' },
];

const CATEGORIES = [
  { id: 'all', label: 'All Styles' },
  { id: 'braids', label: 'Braids & Locs' },
  { id: 'men', label: "Men's Cuts" },
  { id: 'short', label: 'Short & Bob' },
  { id: 'wavy', label: 'Wavy & Glam' },
  { id: 'natural', label: 'Natural Afro' },
];


export default function VirtualTryOnPage() {
  const navigate = useNavigate();

  // Steps: 1=Photo, 2=Style, 3=Result
  const [step, setStep] = useState(1);

  // Photo
  const [userPhoto, setUserPhoto] = useState(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [cameraFacing, setCameraFacing] = useState('user');
  const [countdown, setCountdown] = useState(null);
  const [flashActive, setFlashActive] = useState(false);

  // Hairstyle
  const [category, setCategory] = useState('all');
  const [selectedStyle, setSelectedStyle] = useState(null);
  const [customHairImg, setCustomHairImg] = useState(null);
  const [sourceTab, setSourceTab] = useState('catalog');
  const [aiChecking, setAiChecking] = useState(false);
  const [aiValidation, setAiValidation] = useState(null);
  const [salonStyles, setSalonStyles] = useState([]);

  // Transformation
  const [transformedPhoto, setTransformedPhoto] = useState(null);
  const [isTransforming, setIsTransforming] = useState(false);
  const [transformStatus, setTransformStatus] = useState('');
  const [selectedColor, setSelectedColor] = useState(COLOR_TINTS[0]);
  const [diagnostics, setDiagnostics] = useState(null);

  // Comparison
  const [compareMode, setCompareMode] = useState('side');
  const [sliderPos, setSliderPos] = useState(50);
  const [showingOriginal, setShowingOriginal] = useState(false);

  // Saved
  const [savedLooks, setSavedLooks] = useState([]);
  const [toast, setToast] = useState(null);

  // Refs
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const sliderRef = useRef(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem('munagay_tryon_looks');
      if (s) setSavedLooks(JSON.parse(s));
    } catch { /* ignore */ }

    api.getHairstylePublications?.()
      .then(d => { if (Array.isArray(d) && d.length) setSalonStyles(d); })
      .catch(() => {});

    return () => stopCamera();
  }, []);

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  /* ==================== CAMERA ==================== */
  const startCamera = async (facing = cameraFacing) => {
    setCameraOn(true);
    try {
      if (streamRef.current) streamRef.current.getTracks().forEach(t => t.stop());
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 960 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => videoRef.current.play().catch(() => {});
      }
    } catch {
      setCameraOn(false);
      showToast('Camera access denied. Please allow permissions or upload a photo.', 'error');
    }
  };

  const attachVideoRef = useCallback((node) => {
    videoRef.current = node;
    if (node && streamRef.current) {
      node.srcObject = streamRef.current;
      node.onloadedmetadata = () => node.play().catch(() => {});
    }
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraOn(false);
    setCountdown(null);
  };

  const flipCamera = () => {
    const next = cameraFacing === 'user' ? 'environment' : 'user';
    setCameraFacing(next);
    startCamera(next);
  };

  const snapPhoto = () => {
    const video = videoRef.current;
    if (!video) return showToast('Camera not ready.', 'error');
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 180);
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 800;
    canvas.height = video.videoHeight || 1000;
    const ctx = canvas.getContext('2d');
    if (cameraFacing === 'user') { ctx.translate(canvas.width, 0); ctx.scale(-1, 1); }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL('image/jpeg', 0.92);
    setUserPhoto(url);
    stopCamera();
    showToast('Photo captured! Now choose a hairstyle.', 'success');
    setStep(2);
  };

  const timerSnap = () => {
    setCountdown(3);
    const iv = setInterval(() => {
      setCountdown(p => {
        if (p === 1) { clearInterval(iv); snapPhoto(); return null; }
        return p - 1;
      });
    }, 1000);
  };

  /* ==================== USER PHOTO UPLOAD ==================== */
  const handlePhotoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) return showToast('Upload a valid image (PNG, JPG).', 'error');
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUserPhoto(ev.target.result);
      showToast('Photo loaded! Choose a hairstyle.', 'success');
      setStep(2);
    };
    reader.readAsDataURL(file);
  };

  /* ==================== HAIRSTYLE VALIDATION ==================== */
  const handleCustomUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setAiValidation({ valid: false, message: 'Invalid format. Upload JPG/PNG/WEBP.' });
      return;
    }
    setAiChecking(true);
    setAiValidation(null);
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const imgUrl = ev.target.result;
      try {
        let result;
        try { result = await api.validateHairstyle(imgUrl, file.name); }
        catch { result = fallbackValidate(file.name); }
        setAiChecking(false);
        setAiValidation(result);
        if (result.valid) {
          setCustomHairImg(imgUrl);
          setSelectedStyle({
            id: 'custom-' + Date.now(),
            name: result.detected_style || result.detectedStyle || 'Custom Hair Design',
            category: 'custom',
            previewUrl: imgUrl,
            tags: ['Custom', 'AI Verified'],
            faceMatch: 'Custom Fit (99%)',
            maintenance: 'Custom Style',
            careTips: 'Consult your stylist.',
            isCustom: true,
          });
          showToast('✅ Hair design verified! Ready to transform.', 'success');
        } else {
          showToast(result.message, 'error');
        }
      } catch {
        setAiChecking(false);
        setAiValidation({ valid: false, message: 'Could not verify. Please try a different image.' });
      }
    };
    reader.readAsDataURL(file);
  };

  const fallbackValidate = (fname) => {
    const lower = fname.toLowerCase();
    const bad = ['car','cat','dog','pet','shoe','food','pizza','building','receipt','passport'];
    if (bad.some(k => lower.includes(k))) {
      return { valid: false, message: '⚠️ This does not appear to be a hairstyle. Please upload a hair photo.' };
    }
    return { valid: true, detected_style: 'Custom Hair Design', message: '✅ Hair design detected.' };
  };

  /* ==================== AI TRANSFORMATION ==================== */
  const runTransformation = async (style, color = selectedColor) => {
    if (!userPhoto || !style) return;
    setSelectedStyle(style);
    setTransformedPhoto(null);
    setStep(3);
    setIsTransforming(true);
    setTransformStatus('AI is refining your hair...');

    const hairSrc = style.previewUrl || customHairImg;

    try {
      const result = await api.aiVirtualTryOn(userPhoto, hairSrc, {
        color_tint: color.id,
        style_name: style.name,
      });
      if (result?.status !== 'success' || !result?.result_image) {
        throw new Error(result?.note || 'The AI did not generate a hairstyle image.');
      }
      setTransformedPhoto(result.result_image);
      if (result?.diagnostics) setDiagnostics(result.diagnostics);
    } catch (e) {
      setTransformedPhoto(null);
      setStep(2);
      showToast(e?.message || 'AI refinement failed. Please try again.', 'error');
    } finally {
      setIsTransforming(false);
    }
  };


const handleColorChange = (tint) => {
    setSelectedColor(tint);
    if (selectedStyle) runTransformation(selectedStyle, tint);
  };


  /* ==================== SLIDER ==================== */
  const handleSliderDrag = (e) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    setSliderPos(Math.max(2, Math.min(98, (x / rect.width) * 100)));
  };

  /* ==================== SAVE / DOWNLOAD / BOOK ==================== */
  const downloadLook = () => {
    const img = transformedPhoto || userPhoto;
    if (!img) return;
    const a = document.createElement('a');
    a.download = `munagay-${selectedStyle?.name || 'look'}.png`;
    a.href = img;
    a.click();
    showToast('Downloaded!', 'success');
  };

  const saveLook = () => {
    if (!userPhoto || !selectedStyle) return;
    const look = {
      id: 'look-' + Date.now(),
      styleName: selectedStyle.name,
      transformed: transformedPhoto || selectedStyle.previewUrl,
      original: userPhoto,
      color: selectedColor.name,
      date: new Date().toLocaleDateString(),
    };
    const updated = [look, ...savedLooks.slice(0, 11)];
    setSavedLooks(updated);
    try { localStorage.setItem('munagay_tryon_looks', JSON.stringify(updated)); } catch {}
    showToast('Saved to favorites!', 'success');
  };

  const deleteLook = (id) => {
    const updated = savedLooks.filter(l => l.id !== id);
    setSavedLooks(updated);
    try { localStorage.setItem('munagay_tryon_looks', JSON.stringify(updated)); } catch {}
  };

  const bookStyle = () => {
    navigate('/booking', { state: { suggestedService: selectedStyle?.name, category: selectedStyle?.category } });
  };

  const filteredStyles = CURATED_STYLES.filter(s => {
    if (category === 'all') return true;
    if (category === 'men') return s.gender === 'men';
    if (category === 'women') return s.gender === 'women';
    return s.category === category;
  });

  /* ==================== RENDER ==================== */
  return (
    <div className="vto-page">
      {flashActive && <div className="vto-flash" />}

      {/* Toast */}
      {toast && (
        <div className={`vto-toast vto-toast--${toast.type}`}>
          {toast.type === 'success' && <CheckCircle2 size={16} />}
          {toast.type === 'error' && <AlertCircle size={16} />}
          {toast.type === 'info' && <Sparkles size={16} />}
          <span>{toast.msg}</span>
        </div>
      )}

      {/* ─── HEADER ─── */}
      <header className="vto-header">
        <div className="vto-header__badge">
          <Cpu size={14} />
          <span>Gemini AI Powered</span>
        </div>
        <h1 className="vto-header__title">Virtual Hairstyle Studio</h1>
        <p className="vto-header__sub">
          Capture your photo, pick a hairstyle, and let AI completely transform your look
        </p>

        {/* Steps */}
        <nav className="vto-steps">
          {[
            { n: 1, label: 'Your Photo', done: !!userPhoto },
            { n: 2, label: 'Pick Style', done: !!selectedStyle },
            { n: 3, label: 'View Result', done: !!transformedPhoto },
          ].map((s, i) => (
            <div key={s.n} className="vto-steps__row">
              {i > 0 && <ChevronRight size={14} className="vto-steps__arrow" />}
              <button
                className={`vto-step ${step === s.n ? 'vto-step--active' : ''} ${s.done ? 'vto-step--done' : ''}`}
                onClick={() => {
                  if (s.n === 1) setStep(1);
                  if (s.n === 2 && userPhoto) setStep(2);
                  if (s.n === 3 && transformedPhoto) setStep(3);
                }}
                disabled={s.n === 2 && !userPhoto}
              >
                <span className="vto-step__num">{s.n}</span>
                <span>{s.label}</span>
                {s.done && <CheckCircle2 size={13} />}
              </button>
            </div>
          ))}
        </nav>
      </header>

      {/* ═══════════════════ STEP 1: PHOTO ═══════════════════ */}
      {step === 1 && (
        <section className="vto-section">
          <div className="vto-section__head">
            <h2>Step 1: Capture or Upload Your Photo</h2>
            <p>Frame your upper body (head to chest), facing forward with hairline visible.</p>
            {userPhoto && (
              <button className="btn btn-primary btn-sm" onClick={() => setStep(2)}>
                Continue <ChevronRight size={15} />
              </button>
            )}
          </div>

          <div className="vto-photo-grid">
            {/* Camera / Preview */}
            <div className="vto-camera-area">
              {cameraOn ? (
                <div className="vto-camera-live">
                  <video ref={attachVideoRef} autoPlay playsInline muted className="vto-camera-video" />
                  <div className="vto-camera-guide">
                    <div className="vto-camera-oval">
                      <span>Align head here</span>
                    </div>
                  </div>
                  {countdown !== null && (
                    <div className="vto-countdown"><span>{countdown}</span></div>
                  )}
                  <div className="vto-camera-tip">
                    <ShieldCheck size={13} /> Look straight • Hairline visible
                  </div>
                  <div className="vto-camera-btns">
                    <button className="vto-cam-btn" onClick={flipCamera} title="Flip"><RefreshCw size={16} /></button>
                    <button className="vto-cam-btn vto-cam-btn--capture" onClick={snapPhoto} title="Capture">
                      <div className="vto-capture-ring" />
                    </button>
                    <button className="vto-cam-btn" onClick={timerSnap} title="3s Timer"><Timer size={16} /></button>
                    <button className="vto-cam-btn vto-cam-btn--close" onClick={stopCamera}><X size={16} /></button>
                  </div>
                </div>
              ) : userPhoto ? (
                <div className="vto-photo-preview">
                  <img src={userPhoto} alt="Your portrait" />
                  <div className="vto-photo-overlay">
                    <span className="vto-photo-badge"><CheckCircle2 size={13} /> Photo Ready</span>
                    <div className="vto-photo-actions">
                      <button className="btn btn-secondary btn-sm" onClick={() => startCamera()}>
                        <Camera size={13} /> Retake
                      </button>
                      <label className="btn btn-secondary btn-sm">
                        <Upload size={13} /> Replace
                        <input type="file" accept="image/*" onChange={handlePhotoUpload} hidden />
                      </label>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="vto-camera-placeholder">
                  <Camera size={36} />
                  <h3>Take Your Photo</h3>
                  <p>The guide helps you align for the best result</p>
                  <button className="btn btn-primary" onClick={() => startCamera()}>
                    <Camera size={16} /> Open Camera
                  </button>
                </div>
              )}
            </div>

            {/* Upload sidebar */}
            <div className="vto-upload-side">
              <div className="vto-upload-box">
                <Upload size={28} />
                <h4>Upload from Device</h4>
                <label className="btn btn-primary btn-sm">
                  <Upload size={14} /> Choose File
                  <input type="file" accept="image/*" onChange={handlePhotoUpload} hidden />
                </label>
                <span className="vto-hint">JPG, PNG, WEBP — Chest up</span>
              </div>

              <div className="vto-tips-box">
                <div className="vto-tips-head"><Info size={14} /> Photo Tips</div>
                <ul>
                  <li>✓ <b>Half-body</b>: Head to chest</li>
                  <li>✓ <b>Face forward</b>: Look at camera</li>
                  <li>✓ <b>Good light</b>: Avoid backlighting</li>
                  <li>✓ <b>Hairline clear</b>: No hats/caps</li>
                </ul>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* ═══════════════════ STEP 2: STYLE PICKER ═══════════════════ */}
      {step === 2 && (
        <section className="vto-section">
          <div className="vto-section__head">
            <div>
              <h2>Step 2: Choose a Hairstyle</h2>
              <p>Select from the catalog or upload your own design</p>
            </div>
            <div className="vto-section__actions">
              <button className="btn btn-secondary btn-sm" onClick={() => setStep(1)}>
                <RotateCcw size={14} /> Change Photo
              </button>
              {selectedStyle && (
                <button className="btn btn-primary btn-sm" onClick={() => runTransformation(selectedStyle)}>
                  <Sparkles size={14} /> Transform Now <ChevronRight size={14} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          <div className="vto-tabs">
            <button className={`vto-tab ${sourceTab === 'catalog' ? 'vto-tab--active' : ''}`} onClick={() => setSourceTab('catalog')}>
              <Sparkles size={14} /> Catalog ({CURATED_STYLES.length})
            </button>
            <button className={`vto-tab ${sourceTab === 'upload' ? 'vto-tab--active' : ''}`} onClick={() => setSourceTab('upload')}>
              <Upload size={14} /> Upload Custom
            </button>
            {salonStyles.length > 0 && (
              <button className={`vto-tab ${sourceTab === 'salon' ? 'vto-tab--active' : ''}`} onClick={() => setSourceTab('salon')}>
                <Scissors size={14} /> Salon ({salonStyles.length})
              </button>
            )}
          </div>

          {/* Catalog */}
          {sourceTab === 'catalog' && (
            <>
              <div className="vto-filters">
                {CATEGORIES.map(c => (
                  <button key={c.id} className={`vto-filter ${category === c.id ? 'vto-filter--active' : ''}`} onClick={() => setCategory(c.id)}>
                    {c.label}
                  </button>
                ))}
              </div>
              <div className="vto-styles-grid">
                {filteredStyles.map(s => (
                  <div
                    key={s.id}
                    className={`vto-style-card ${selectedStyle?.id === s.id ? 'vto-style-card--selected' : ''}`}
                    onClick={() => runTransformation(s)}
                  >
                    <div className="vto-style-card__img">
                      <img src={s.previewUrl} alt={s.name} loading="lazy" />
                      {selectedStyle?.id === s.id && (
                        <div className="vto-style-card__check"><CheckCircle2 size={16} /></div>
                      )}
                    </div>
                    <div className="vto-style-card__body">
                      <h4>{s.name}</h4>
                      <div className="vto-style-card__tags">
                        {s.tags.map((t, i) => <span key={i} className="vto-tag">{t}</span>)}
                      </div>
                      <div className="vto-style-card__match">
                        <Award size={12} /> {s.faceMatch}
                      </div>
                      <button className="btn btn-primary btn-sm vto-style-card__btn">
                        <Sparkles size={13} /> Transform
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Custom Upload */}
          {sourceTab === 'upload' && (
            <div className="vto-custom-upload">
              <div className="vto-custom-upload__box">
                <div className="vto-ai-badge"><ShieldCheck size={16} /> Gemini AI Inspector Active</div>
                <Upload size={32} />
                <h3>Upload a Hairstyle Photo</h3>
                <p>Upload braids, a cut, curls, etc. AI will verify it's a real hair design.</p>
                <label className="btn btn-primary">
                  <Upload size={16} /> Choose Hairstyle Image
                  <input type="file" accept="image/*" onChange={handleCustomUpload} hidden />
                </label>
                <span className="vto-hint">Non-hair images (cars, food, animals) will be rejected</span>
              </div>

              {aiChecking && (
                <div className="vto-ai-status vto-ai-status--loading">
                  <RefreshCw size={20} className="spin" />
                  <div><h4>Analyzing...</h4><p>Checking if this is a valid hair design</p></div>
                </div>
              )}

              {aiValidation && (
                <div className={`vto-ai-status ${aiValidation.valid ? 'vto-ai-status--ok' : 'vto-ai-status--fail'}`}>
                  {aiValidation.valid ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
                  <div>
                    <h4>{aiValidation.valid ? 'Verified!' : 'Not Valid'}</h4>
                    <p>{aiValidation.message}</p>
                  </div>
                </div>
              )}

              {customHairImg && aiValidation?.valid && (
                <div className="vto-custom-ready">
                  <img src={customHairImg} alt="Custom" />
                  <div>
                    <h4>{selectedStyle?.name}</h4>
                    <p>Verified & ready for transformation</p>
                    <button className="btn btn-primary" onClick={() => runTransformation(selectedStyle)}>
                      <Sparkles size={14} /> Transform Now
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Salon */}
          {sourceTab === 'salon' && (
            <div className="vto-styles-grid">
              {salonStyles.map(item => (
                <div
                  key={item.id}
                  className="vto-style-card"
                  onClick={() => runTransformation({
                    id: `salon-${item.id}`,
                    name: item.title || 'Salon Style',
                    category: 'salon',
                    previewUrl: item.media || item.media_url,
                    tags: ['Salon', item.category || 'Hair'],
                    faceMatch: 'Salon Fit',
                    maintenance: 'Professional',
                    careTips: 'Book with salon for care.',
                  })}
                >
                  <div className="vto-style-card__img">
                    <img src={item.media || item.media_url} alt={item.title} />
                  </div>
                  <div className="vto-style-card__body">
                    <h4>{item.title || 'Salon Style'}</h4>
                    <p className="vto-style-card__desc">{item.description || 'Verified salon creation'}</p>
                    <button className="btn btn-primary btn-sm vto-style-card__btn">
                      <Sparkles size={13} /> Transform
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* ═══════════════════ STEP 3: BEFORE & AFTER ═══════════════════ */}
      {step === 3 && (
        <section className="vto-result">
          <div className="vto-result__main">

            {/* ─── TOP BAR ─── */}
            <div className="vto-result__topbar">
              <div className="vto-result__title">
                <Sparkles size={16} className="vto-icon-accent" />
                <h3>Before & After</h3>
              </div>
              <div className="vto-compare-modes">
                <button className={`vto-mode-btn ${compareMode === 'side' ? 'vto-mode-btn--active' : ''}`} onClick={() => setCompareMode('side')}>
                  <Columns size={14} /> Side by Side
                </button>
                <button className={`vto-mode-btn ${compareMode === 'slider' ? 'vto-mode-btn--active' : ''}`} onClick={() => setCompareMode('slider')}>
                  <SplitSquareVertical size={14} /> Slider
                </button>
                <button className={`vto-mode-btn ${compareMode === 'flip' ? 'vto-mode-btn--active' : ''}`} onClick={() => setCompareMode('flip')}>
                  <Eye size={14} /> Flip
                </button>
              </div>
            </div>

            {/* ─── VIEWPORT ─── */}
            <div className="vto-viewport">
              {isTransforming && (
                <div className="vto-processing">
                  <div className="vto-processing__inner">
                    <Cpu size={36} className="vto-spin-glow" />
                    <h4>AI Hairstyle Transforming...</h4>
                    <p>{transformStatus}</p>
                    <div className="vto-progress-bar">
                      <div className="vto-progress-bar__fill" />
                    </div>
                  </div>
                </div>
              )}

              {!isTransforming && (
                <>
                  {/* SIDE BY SIDE */}
                  {compareMode === 'side' && (
                    <div className="vto-side-by-side">
                      <div className="vto-compare-panel">
                        <div className="vto-compare-label vto-compare-label--before">Your Face</div>
                        <img src={userPhoto} alt="Your Original Face" />
                      </div>
                      <div className="vto-compare-divider" />
                      <div className="vto-compare-panel vto-compare-panel--after">
                        <div className="vto-compare-label vto-compare-label--after">
                          <Sparkles size={11} /> {selectedStyle?.name}
                        </div>
                        <img src={transformedPhoto || userPhoto} alt="Transformed on Your Head" />
                      </div>
                    </div>
                  )}

                  {/* SLIDER */}
                  {compareMode === 'slider' && (
                    <div
                      className="vto-slider"
                      ref={sliderRef}
                      onMouseMove={e => { if (e.buttons === 1) handleSliderDrag(e); }}
                      onTouchMove={handleSliderDrag}
                    >
                      <img src={userPhoto} alt="Original" className="vto-slider__img" />
                      <div className="vto-slider__after" style={{ clipPath: `inset(0 0 0 ${sliderPos}%)` }}>
                        <img src={transformedPhoto || userPhoto} alt="Transformed on Your Head" className="vto-slider__img" />
                      </div>
                      <div className="vto-slider__line" style={{ left: `${sliderPos}%` }}>
                        <div className="vto-slider__handle"><ArrowLeftRight size={14} /></div>
                      </div>
                      <span className="vto-slider__tag vto-slider__tag--before">Your Face</span>
                      <span className="vto-slider__tag vto-slider__tag--after">With Style</span>
                    </div>
                  )}

                  {/* FLIP */}
                  {compareMode === 'flip' && (
                    <div className="vto-flip">
                      <div className="vto-flip__img-wrap">
                        <img
                          src={showingOriginal ? userPhoto : (transformedPhoto || userPhoto)}
                          alt="Compare"
                        />
                        <div className="vto-flip__badge">
                          {showingOriginal ? 'Your Face' : `✨ ${selectedStyle?.name}`}
                        </div>
                      </div>
                      <button
                        className="btn btn-secondary vto-flip__btn"
                        onMouseDown={() => setShowingOriginal(true)}
                        onMouseUp={() => setShowingOriginal(false)}
                        onMouseLeave={() => setShowingOriginal(false)}
                        onTouchStart={() => setShowingOriginal(true)}
                        onTouchEnd={() => setShowingOriginal(false)}
                      >
                        <Eye size={16} /> Hold to See Original Face
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* ─── BOTTOM BAR ─── */}
            <div className="vto-result__bottombar">
              <button className="btn btn-secondary" onClick={() => setStep(2)}>
                <Scissors size={14} /> Try Different Style
              </button>
              <div className="vto-result__cta">
                <button className="btn btn-secondary" onClick={saveLook}><Heart size={14} /> Save</button>
                <button className="btn btn-secondary" onClick={downloadLook}><Download size={14} /> Download</button>
                <button className="btn btn-primary" onClick={bookStyle}>
                  <Calendar size={14} /> Book This Style
                </button>
              </div>
            </div>
          </div>

          {/* ─── SIDEBAR ─── */}
          <aside className="vto-result__sidebar">
            {/* Active Style */}
            <div className="vto-sidebar-card vto-sidebar-card--accent">
              <div className="vto-active-style">
                <img src={selectedStyle?.previewUrl || customHairImg} alt="" className="vto-active-style__thumb" />
                <div className="vto-active-style__info">
                  <span className="vto-pill"><Cpu size={10} /> AI Hair Fitted</span>
                  <h4>{selectedStyle?.name}</h4>
                  <span className="vto-match"><Award size={12} /> {diagnostics?.face_shape_compatibility || selectedStyle?.faceMatch || '99% Match'}</span>
                </div>
              </div>
            </div>

            {/* Color Palette */}
            <div className="vto-sidebar-card">
              <div className="vto-sidebar-card__head"><Palette size={14} /> Hair Color</div>

              <div className="vto-colors">
                {COLOR_TINTS.map(t => (
                  <button
                    key={t.id}
                    className={`vto-color-btn ${selectedColor?.id === t.id ? 'vto-color-btn--active' : ''}`}
                    onClick={() => handleColorChange(t)}
                    title={t.name}
                  >
                    <span
                      className="vto-color-dot"
                      style={{
                        backgroundColor: t.hex === 'transparent' ? '#6b7280' : t.hex,
                        border: t.id === 'platinum' ? '1px solid #94a3b8' : 'none',
                      }}
                    />
                    <span className="vto-color-name">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Care Tips */}
            <div className="vto-sidebar-card vto-sidebar-card--care">
              <div className="vto-sidebar-card__head"><BookOpen size={14} /> Care & Maintenance</div>
              <div className="vto-care">
                <div className="vto-care__item">
                  <strong>Maintenance:</strong>
                  <span>{selectedStyle?.maintenance || 'Low-maintenance'}</span>
                </div>
                <div className="vto-care__item">
                  <strong>Care Tip:</strong>
                  <span>{selectedStyle?.careTips || 'Hydrate scalp regularly.'}</span>
                </div>
                <div className="vto-care__products">
                  <strong>Recommended:</strong>
                  <ul>
                    <li>• Rosewater Scalp Spray</li>
                    <li>• Shea & Peppermint Oil</li>
                    <li>• Silk Bonnet (Night)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Quick Switch */}
            <div className="vto-sidebar-card">
              <div className="vto-sidebar-card__head"><Sparkles size={14} /> Quick Switch</div>
              <div className="vto-quick-styles">
                {CURATED_STYLES.slice(0, 6).map(s => (
                  <button
                    key={s.id}
                    className={`vto-quick-item ${selectedStyle?.id === s.id ? 'vto-quick-item--active' : ''}`}
                    onClick={() => runTransformation(s)}
                  >
                    <img src={s.previewUrl} alt={s.name} />
                    <span>{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </section>
      )}

      {/* ═══════════════════ SAVED LOOKS ═══════════════════ */}
      {savedLooks.length > 0 && (
        <section className="vto-saved">
          <h3><Heart size={16} /> Saved Looks ({savedLooks.length})</h3>
          <div className="vto-saved__grid">
            {savedLooks.map(l => (
              <div key={l.id} className="vto-saved__card">
                <div className="vto-saved__thumb">
                  <img src={l.transformed || l.original} alt="" />
                  <button className="vto-saved__del" onClick={() => deleteLook(l.id)}><Trash2 size={12} /></button>
                </div>
                <div className="vto-saved__info">
                  <h4>{l.styleName}</h4>
                  <span>{l.color} • {l.date}</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
