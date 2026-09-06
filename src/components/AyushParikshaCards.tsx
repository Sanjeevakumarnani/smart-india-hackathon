import React, { useState } from 'react';
import {
  Wind,
  Flame,
  Droplets,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  Activity,
  Shield,
  Clock,
  Moon,
  Sun,
  Coffee,
  Leaf,
  Camera,
  Utensils,
} from 'lucide-react';
import { AharaViharaDetails, AyushAssessment, HistoryObject, LanguageCode } from '../types';
import { translate } from '../services/i18n';
import { AYUSH_DASHAVIDHA_CARDS } from '../data/mockData';

interface AyushParikshaCardsProps {
  historyObject: HistoryObject;
  onUpdateHistory: (history: HistoryObject) => void;
  onContinue: () => void;
  onBack: () => void;
  selectedLanguage: LanguageCode;
}

export const AyushParikshaCards: React.FC<AyushParikshaCardsProps> = ({
  historyObject,
  onUpdateHistory,
  onContinue,
  onBack,
  selectedLanguage,
}) => {
  const [activeDeckIndex, setActiveDeckIndex] = useState(0);
  const [cardsDeck, setCardsDeck] = useState<any[]>(AYUSH_DASHAVIDHA_CARDS);

  React.useEffect(() => {
    fetch('/api/ayush/cards')
      .then(res => {
        if (!res.ok) throw new Error('API failed');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          setCardsDeck(data);
        }
      })
      .catch(() => {
        // Fallback to offline/bundled configuration
      });
  }, []);

  const ayush: AyushAssessment = historyObject.ayush || {
    prakriti: 'Vata-Pitta',
    vataScore: 4,
    pittaScore: 6,
    kaphaScore: 2,
    agni: 'Tikshna Agni',
    koshtha: 'Krura Koshtha',
    aharaVihara: 'Pitta-Vardhaka Ahar',
  };

  const currentDeck = cardsDeck[activeDeckIndex] || AYUSH_DASHAVIDHA_CARDS[0];

  const getVisualIcon = (iconName: string) => {
    switch (iconName) {
      case 'Wind':
        return <Wind className="w-8 h-8 text-amber-400" />;
      case 'Flame':
        return <Flame className="w-8 h-8 text-amber-400" />;
      case 'Droplets':
        return <Droplets className="w-8 h-8 text-emerald-400" />;
      case 'Activity':
        return <Activity className="w-8 h-8 text-amber-400" />;
      case 'Shield':
        return <Shield className="w-8 h-8 text-amber-400" />;
      case 'Sparkles':
        return <Sparkles className="w-8 h-8 text-amber-400" />;
      case 'Clock':
        return <Clock className="w-8 h-8 text-emerald-400" />;
      case 'Moon':
        return <Moon className="w-8 h-8 text-amber-400" />;
      case 'Sun':
        return <Sun className="w-8 h-8 text-amber-400" />;
      case 'Coffee':
        return <Coffee className="w-8 h-8 text-emerald-400" />;
      default:
        return <Leaf className="w-8 h-8 text-indigo-400" />;
    }
  };

  const handleCardSelect = (deckId: string, opt: any) => {
    let updatedAyush: AyushAssessment = { ...ayush };

    if (deckId === 'prakriti_skin_frame') {
      updatedAyush.prakriti = opt.dosha + '-Pradhana';
      updatedAyush.vataScore = (updatedAyush.vataScore || 0) + (opt.score?.vata || 0);
      updatedAyush.pittaScore = (updatedAyush.pittaScore || 0) + (opt.score?.pitta || 0);
      updatedAyush.kaphaScore = (updatedAyush.kaphaScore || 0) + (opt.score?.kapha || 0);
    } else if (deckId === 'agni_pariksha') {
      updatedAyush.agni = opt.dosha;
    } else if (deckId === 'koshtha_pariksha') {
      updatedAyush.koshtha = opt.dosha;
    } else if (deckId === 'ahara_vihara') {
      updatedAyush.aharaVihara = opt.label;
    } else if (deckId === 'jihva_pariksha') {
      updatedAyush.jihva = opt.dosha;
    } else if (deckId === 'vikriti_pariksha') {
      updatedAyush.vikriti = opt.label;
    } else if (deckId === 'sara_pariksha') {
      updatedAyush.sara = opt.label;
    } else if (deckId === 'satva_pariksha') {
      updatedAyush.satva = opt.label;
    } else if (deckId === 'vyayama_shakti') {
      updatedAyush.vyayamaShakti = opt.label;
    } else if (deckId === 'vaya_pariksha') {
      updatedAyush.vaya = opt.label;
    }

    if (opt.score) {
      updatedAyush.vataScore = (updatedAyush.vataScore || 0) + (opt.score.vata || 0);
      updatedAyush.pittaScore = (updatedAyush.pittaScore || 0) + (opt.score.pitta || 0);
      updatedAyush.kaphaScore = (updatedAyush.kaphaScore || 0) + (opt.score.kapha || 0);
    }

    onUpdateHistory({
      ...historyObject,
      ayush: updatedAyush,
    });
  };

  const handleAharaDetailChange = (field: keyof AharaViharaDetails, value: string) => {
    const currentDetails = ayush.aharaViharaDetails || {};
    const updatedDetails: AharaViharaDetails = {
      ...currentDetails,
      [field]: value,
    };
    onUpdateHistory({
      ...historyObject,
      ayush: {
        ...ayush,
        aharaViharaDetails: updatedDetails,
      },
    });
  };

  const handleImageCapture = (type: 'jihva' | 'nadi', e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const dataUrl = evt.target?.result as string;
      if (type === 'jihva') {
        onUpdateHistory({
          ...historyObject,
          ayush: { ...ayush, jihvaImageUrl: dataUrl },
        });
      } else {
        onUpdateHistory({
          ...historyObject,
          ayush: { ...ayush, nadiImageUrl: dataUrl },
        });
      }
    };
    reader.readAsDataURL(file);
  };

  const totalScore = Math.max(1, (ayush.vataScore || 3) + (ayush.pittaScore || 3) + (ayush.kaphaScore || 3));
  const vataPct = Math.round(((ayush.vataScore || 3) / totalScore) * 100);
  const pittaPct = Math.round(((ayush.pittaScore || 3) / totalScore) * 100);
  const kaphaPct = Math.max(0, 100 - vataPct - pittaPct);

  const handleNext = () => {
    if (activeDeckIndex < cardsDeck.length - 1) {
      setActiveDeckIndex((prev) => prev + 1);
    } else {
      onContinue();
    }
  };

  const handlePrev = () => {
    if (activeDeckIndex > 0) {
      setActiveDeckIndex((prev) => prev - 1);
    } else {
      onBack();
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto px-4 py-6">
      {/* Title Header */}
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-700 text-xs font-mono font-bold uppercase tracking-wider mb-2 shadow-sm">
          <Leaf className="w-4 h-4 text-indigo-600" />
          <span>AYUSH Dashavidha Rogi Pariksha / दशविध परीक्षा</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
          {selectedLanguage === 'hi' ? 'आयुर्वेदिक प्रकृति और रोगी परीक्षा' : selectedLanguage === 'ta' ? 'ஆயுர்வேத உடலமைப்பு மற்றும் நோயாளி பரிசோதனை' : selectedLanguage === 'te' ? 'ఆయుర్వేద ప్రకృతి మరియు రోగి పరీక్ష' : 'Ayurvedic Constitution & Rogi Pariksha'}
        </h2>
        <p className="text-slate-600 text-sm sm:text-base mt-1">
          प्रकृति, अग्नि, कोष्ठ, धातु सार व सत्व निर्धारण हेतु उपयुक्त विकल्प चुनें
        </p>
      </div>

      {/* Live Tridosha Balance Percentage Bar */}
      <div className="stitch-card p-5 mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-mono font-bold text-slate-700 uppercase tracking-wider">
            Calculated Tridosha Constitution (प्रकृति अनुपात)
          </span>
          <span className="px-3 py-0.5 rounded-full bg-violet-50 border border-indigo-200 text-indigo-800 text-xs font-mono font-bold">
            Prakriti: {ayush.prakriti || 'Vata-Pitta'}
          </span>
        </div>

        {/* 3-Color Dosha Progress Bar */}
        <div className="h-4 rounded-full bg-slate-100 overflow-hidden flex shadow-inner border border-slate-200">
          <div
            style={{ width: `${vataPct}%` }}
            className="bg-violet-500 transition-all duration-500 flex items-center justify-center text-[10px] font-black text-white"
            title={`Vata: ${vataPct}%`}
          >
            {vataPct > 15 && `VATA ${vataPct}%`}
          </div>
          <div
            style={{ width: `${pittaPct}%` }}
            className="bg-amber-500 transition-all duration-500 flex items-center justify-center text-[10px] font-black text-white"
            title={`Pitta: ${pittaPct}%`}
          >
            {pittaPct > 15 && `PITTA ${pittaPct}%`}
          </div>
          <div
            style={{ width: `${kaphaPct}%` }}
            className="bg-indigo-600 transition-all duration-500 flex items-center justify-center text-[10px] font-black text-white"
            title={`Kapha: ${kaphaPct}%`}
          >
            {kaphaPct > 15 && `KAPHA ${kaphaPct}%`}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 mt-3 text-center text-xs">
          <div className="p-2 rounded-xl bg-violet-50 border border-violet-200 text-indigo-800 font-mono font-bold">
            Vata: {vataPct}% (वात)
          </div>
          <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 font-mono font-bold">
            Pitta: {pittaPct}% (पित्त)
          </div>
          <div className="p-2 rounded-xl bg-violet-50 border border-indigo-200 text-indigo-800 font-mono font-bold">
            Kapha: {kaphaPct}% (कफ)
          </div>
        </div>
      </div>

      {/* Pariksha Module Step Indicator */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-[#161c28] border border-[#242e42] text-cyan-400 text-xs font-mono font-bold">
            Module {activeDeckIndex + 1} of {cardsDeck.length}
          </span>
          <span className="text-sm font-black text-white">
            {currentDeck.title}
          </span>
        </div>

        <div className="flex gap-1.5 overflow-x-auto py-1">
          {cardsDeck.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setActiveDeckIndex(idx)}
              className={`h-2.5 rounded-full transition-all duration-300 ${
                idx === activeDeckIndex
                  ? 'w-6 bg-amber-400 shadow-sm shadow-amber-400/50'
                  : idx < activeDeckIndex
                  ? 'w-2 bg-emerald-400'
                  : 'w-2 bg-[#1b2334]'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Card Deck Selection Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {currentDeck.options.map((opt: any, oIdx: number) => {
          let isSelected = false;
          if (currentDeck.id === 'prakriti_skin_frame') {
            isSelected = !!ayush.prakriti?.includes(opt.dosha);
          } else if (currentDeck.id === 'agni_pariksha') {
            isSelected = ayush.agni === opt.dosha;
          } else if (currentDeck.id === 'koshtha_pariksha') {
            isSelected = ayush.koshtha === opt.dosha;
          } else if (currentDeck.id === 'ahara_vihara') {
            isSelected = ayush.aharaVihara === opt.label;
          } else if (currentDeck.id === 'jihva_pariksha') {
            isSelected = ayush.jihva === opt.dosha;
          } else if (currentDeck.id === 'vikriti_pariksha') {
            isSelected = ayush.vikriti === opt.label;
          } else if (currentDeck.id === 'sara_pariksha') {
            isSelected = ayush.sara === opt.label;
          } else if (currentDeck.id === 'satva_pariksha') {
            isSelected = ayush.satva === opt.label;
          } else if (currentDeck.id === 'vyayama_shakti') {
            isSelected = ayush.vyayamaShakti === opt.label;
          } else if (currentDeck.id === 'vaya_pariksha') {
            isSelected = ayush.vaya === opt.label;
          }

          return (
            <div
              key={oIdx}
              id={`ayush-card-${oIdx}`}
              onClick={() => handleCardSelect(currentDeck.id, opt)}
              className={`p-6 rounded-3xl border-2 cursor-pointer transition-all duration-200 flex flex-col justify-between relative shadow-xl active:scale-98 ${
                isSelected
                  ? `${opt.accentColor || 'border-amber-400 bg-amber-950/40'} ring-2 ring-amber-400 scale-[1.02] shadow-amber-950/50`
                  : 'bg-[#0e121a]/85 border-[#1b2334] hover:bg-[#151a24] hover:border-slate-600'
              }`}
            >
              <div>
                <div className="p-3.5 rounded-2xl bg-[#06080d] border border-[#1b2334] inline-flex mb-4 shadow">
                  {getVisualIcon(opt.visualIcon)}
                </div>

                <h4 className="text-lg font-extrabold text-white">
                  {opt.label}
                </h4>
                <p className="text-xs text-slate-300 leading-relaxed mt-2">
                  {opt.desc}
                </p>
              </div>

              <div className="mt-5 pt-3 border-t border-[#1e2738] flex items-center justify-between">
                <span className="text-xs font-bold text-slate-400">
                  {isSelected ? `✓ ${translate('continue', selectedLanguage)}` : selectedLanguage === 'hi' ? 'चुनने के लिए टैप करें' : selectedLanguage === 'ta' ? 'தேர்வு செய்யத் தட்டவும்' : selectedLanguage === 'te' ? 'ఎంచుకోవడానికి నొక్కండి' : 'Tap to select'}
                </span>
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${
                    isSelected ? 'bg-amber-400 text-slate-950 shadow-md' : 'bg-[#182030] text-slate-500'
                  }`}
                >
                  {isSelected ? '✓' : '+'}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Special Module Feature A: Structured Ahara-Vihara Diary (when deck is ahara_vihara) */}
      {currentDeck.id === 'ahara_vihara' && (
        <div className="bg-[#0e121a]/95 border border-amber-500/30 rounded-3xl p-5 mb-6 shadow-xl">
          <h4 className="text-xs font-mono font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Utensils className="w-4 h-4" />
            <span>Structured Ahara-Vihara (Diet & Lifestyle Diary)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {/* Meal Regularity */}
            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1">Meal Timing Regularity</label>
              <select
                value={ayush.aharaViharaDetails?.mealTimingRegularity || 'Regular'}
                onChange={(e) => handleAharaDetailChange('mealTimingRegularity', e.target.value)}
                className="w-full bg-[#06080d] border border-[#1b2334] rounded-xl p-2 text-white"
              >
                <option value="Regular">Regular (समय पर भोजन)</option>
                <option value="Irregular">Irregular (अनियमित समय)</option>
                <option value="Very Irregular">Very Irregular (विषमाशन)</option>
              </select>
            </div>

            {/* Dominant Rasa */}
            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1">Taste Preference (प्रमुख रस)</label>
              <select
                value={ayush.aharaViharaDetails?.dominantRasa || 'Madhura (Sweet)'}
                onChange={(e) => handleAharaDetailChange('dominantRasa', e.target.value)}
                className="w-full bg-[#06080d] border border-[#1b2334] rounded-xl p-2 text-white"
              >
                <option value="Madhura (Sweet)">Madhura / मधुर (Sweet)</option>
                <option value="Amla (Sour)">Amla / अम्ल (Sour)</option>
                <option value="Lavana (Salty)">Lavana / लवण (Salty)</option>
                <option value="Katu (Pungent/Spicy)">Katu / कटु (Pungent/Spicy)</option>
                <option value="Tikta (Bitter)">Tikta / तिक्त (Bitter)</option>
                <option value="Kashaya (Astringent)">Kashaya / कषाय (Astringent)</option>
              </select>
            </div>

            {/* Sleep Pattern */}
            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1">Sleep Pattern (निद्रा)</label>
              <select
                value={ayush.aharaViharaDetails?.sleepPattern || 'Early Bird'}
                onChange={(e) => handleAharaDetailChange('sleepPattern', e.target.value)}
                className="w-full bg-[#06080d] border border-[#1b2334] rounded-xl p-2 text-white"
              >
                <option value="Early Bird">Early to bed & rise (सम्यक)</option>
                <option value="Night Owl">Late Night (रात्रि जागरण)</option>
                <option value="Irregular">Disturbed / Insomnia (अनिद्रा)</option>
              </select>
            </div>

            {/* Water Intake */}
            <div>
              <label className="block text-[11px] text-slate-300 font-bold mb-1">Water Intake (जलपान)</label>
              <select
                value={ayush.aharaViharaDetails?.waterIntake || 'Moderate'}
                onChange={(e) => handleAharaDetailChange('waterIntake', e.target.value)}
                className="w-full bg-[#06080d] border border-[#1b2334] rounded-xl p-2 text-white"
              >
                <option value="Low">&lt; 1.5 Liters / Day</option>
                <option value="Moderate">1.5 – 2.5 Liters / Day</option>
                <option value="High">&gt; 3 Liters / Day</option>
              </select>
            </div>
          </div>
        </div>
      )}

      {/* Special Module Feature B: Camera-Assisted Jihva & Nadi Capture */}
      {currentDeck.id === 'jihva_pariksha' && (
        <div className="stitch-card p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-mono font-bold text-indigo-700 uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4" />
              <span>Camera-Assisted Jihva (Tongue) &amp; Nadi Capture (Optional Research Aid)</span>
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              Diagnostic Authority: Attending Vaidya
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Tongue Capture */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-900 mb-1">Capture Tongue Image (जिह्वा छायाचित्र)</p>
              <p className="text-[10px] text-slate-500 mb-3">Assist the Vaidya in observing coating and coloration</p>

              {ayush.jihvaImageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-indigo-200 mb-2">
                  <img src={ayush.jihvaImageUrl} alt="Tongue capture" className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-indigo-200 font-mono font-bold bg-black/60 px-2 py-0.5 rounded">
                      Research Aid Only — Vaidya Verification Required
                    </span>
                  </div>
                </div>
              ) : null}

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 cursor-pointer transition">
                <Camera className="w-3.5 h-3.5" />
                <span>{ayush.jihvaImageUrl ? 'Retake Tongue Photo' : 'Capture Tongue Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="user"
                  onChange={(e) => handleImageCapture('jihva', e)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Nadi Region Capture */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200">
              <p className="text-xs font-bold text-slate-900 mb-1">Capture Wrist Region (नाड़ी अनुसंधान)</p>
              <p className="text-[10px] text-slate-500 mb-3">Radial artery zone photo for clinical record archival</p>

              {ayush.nadiImageUrl ? (
                <div className="relative rounded-xl overflow-hidden border border-indigo-200 mb-2">
                  <img src={ayush.nadiImageUrl} alt="Nadi capture" className="w-full h-32 object-cover" />
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center pointer-events-none">
                    <span className="text-[10px] text-indigo-200 font-mono font-bold bg-black/60 px-2 py-0.5 rounded">
                      Research Aid Only — Vaidya Verification Required
                    </span>
                  </div>
                </div>
              ) : null}

              <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-violet-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold border border-indigo-200 cursor-pointer transition">
                <Camera className="w-3.5 h-3.5" />
                <span>{ayush.nadiImageUrl ? 'Retake Wrist Photo' : 'Capture Wrist Photo'}</span>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleImageCapture('nadi', e)}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex items-center justify-between gap-4">
        <button
          onClick={handlePrev}
          className="py-3.5 px-6 rounded-2xl bg-white hover:bg-slate-50 text-slate-700 font-bold text-sm border border-slate-200 flex items-center gap-2 transition shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>{activeDeckIndex === 0 ? 'Back to Interview' : 'Previous Pariksha'}</span>
        </button>

        <button
          id="ayush-proceed-btn"
          onClick={handleNext}
          className="py-4 px-8 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-black text-base flex items-center gap-3 shadow-lg shadow-indigo-600/25 transition active:scale-98"
        >
          <span>
            {activeDeckIndex === AYUSH_DASHAVIDHA_CARDS.length - 1
              ? 'Proceed to Document Scan'
              : 'Next Pariksha Module'}
          </span>
          <ArrowRight className="w-5 h-5 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
};
