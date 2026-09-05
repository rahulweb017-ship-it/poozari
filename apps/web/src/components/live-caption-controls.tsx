'use client';

import { api } from '@/lib/client';
import { LIVE_CAPTION_LANGS, type LiveCaptionLang } from '@poozari/shared';
import { useState } from 'react';

type Translations = Partial<Record<LiveCaptionLang, string>>;

/** Common pooja captions pre-translated, so the pandit can push one tap mid-ceremony. */
const PRESETS: { label: string; translations: Translations }[] = [
  {
    label: 'Om Namah Shivaya',
    translations: {
      sa: 'ॐ नमः शिवाय',
      hi: 'ॐ नमः शिवाय — भगवान शिव को साष्टांग प्रणाम',
      en: 'Om Namah Shivaya — Salutations to Lord Shiva',
    },
  },
  {
    label: 'Gayatri Mantra',
    translations: {
      sa: 'ॐ भूर्भुवः स्वः तत्सवितुर्वरेण्यं भर्गो देवस्य धीमहि धियो यो नः प्रचोदयात्',
      hi: 'हे भगवन्! हम आपके दिव्य तेज का ध्यान करते हैं; हमारी बुद्धि को सन्मार्ग पर प्रेरित करें',
      en: 'We meditate on the divine light of the Sun; may it guide our intellect.',
    },
  },
  {
    label: 'Maha Mrityunjaya',
    translations: {
      sa: 'ॐ त्र्यम्बकं यजामहे सुगन्धिं पुष्टिवर्धनम् उर्वारुकमिव बन्धनान्मृत्योर्मुक्षीय मामृतात्',
      hi: 'हम त्रिनेत्रधारी भगवान शिव की उपासना करते हैं; वे हमें मृत्यु से मुक्त कर अमृतत्व दें',
      en: 'We worship the three-eyed Lord Shiva; may He free us from death for immortality.',
    },
  },
  {
    label: 'Sankalp',
    translations: {
      sa: 'अद्य शुभतिथौ श्रीमहाविष्णोः प्रीत्यर्थं पूजां करिष्ये',
      hi: 'आज के शुभ दिन, भगवान की प्रसन्नता हेतु हम यह पूजा कर रहे हैं',
      en: 'On this auspicious day we perform this pooja for the Lord’s blessings.',
    },
  },
  {
    label: 'Aarti',
    translations: {
      sa: 'ॐ जय जगदीश हरे',
      hi: 'ॐ जय जगदीश हरे — आरती के साथ पूजा सम्पन्न',
      en: 'Om Jai Jagdish Hare — the aarti concludes the pooja.',
    },
  },
  {
    label: 'Shanti Path',
    translations: {
      sa: 'ॐ द्यौः शान्तिः अन्तरिक्षं शान्तिः पृथिवी शान्तिः',
      hi: 'ॐ शान्तिः शान्तिः शान्तिः — सभी पर शान्ति और आशीर्वाद',
      en: 'Om Shanti Shanti Shanti — peace and blessings to all.',
    },
  },
];

/**
 * Controls to push a live caption for a session. Used by both the pandit and
 * admin live pages — `variant` selects which API endpoint to call.
 */
export function LiveCaptionControls({
  sessionId,
  variant,
}: {
  sessionId: string;
  variant: 'pandit' | 'admin';
}) {
  const [texts, setTexts] = useState<Record<LiveCaptionLang, string>>({ sa: '', hi: '', en: '' });
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  async function push(translations: Translations) {
    setBusy(true);
    setErr('');
    setMsg('');
    try {
      if (variant === 'pandit') await api.panditPushLiveCaption(sessionId, translations);
      else await api.adminPushLiveCaption(sessionId, translations);
      setMsg('Caption pushed live.');
      setTexts({ sa: '', hi: '', en: '' });
    } catch (e: any) {
      setErr(e.message ?? 'Could not push caption');
    } finally {
      setBusy(false);
    }
  }

  const hasAny = Boolean(texts.sa || texts.hi || texts.en);

  return (
    <div className="w-full">
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-2xs font-black uppercase tracking-widest text-foreground">
          💬 Live captions
        </h4>
        <span className="text-3xs font-bold uppercase tracking-wider text-muted-foreground">
          Shown to viewers in real time
        </span>
      </div>

      {err ? <p className="mt-2 rounded-xl bg-red-50 p-2 text-2xs text-red-700">{err}</p> : null}
      {msg ? <p className="mt-2 rounded-xl bg-green-50 p-2 text-2xs text-green-700">{msg}</p> : null}

      {/* One-tap preset mantras */}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            disabled={busy}
            onClick={() => push(p.translations)}
            className="rounded-full border bg-white px-2.5 py-1 text-3xs font-bold uppercase tracking-wider text-accent transition-colors hover:bg-accent hover:text-white disabled:opacity-50"
            style={{ borderColor: 'hsl(var(--accent) / 0.3)' }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom caption in each language */}
      <div className="mt-3 space-y-2">
        {LIVE_CAPTION_LANGS.map((l) => (
          <div key={l.code} className="flex items-center gap-2">
            <span
              className="w-9 shrink-0 text-center text-3xs font-black uppercase tracking-wider"
              style={{ color: 'hsl(var(--muted-foreground))' }}
            >
              {l.short}
            </span>
            <input
              className="input flex-1 bg-white py-1.5 text-xs"
              placeholder={`Caption in ${l.label} (optional)`}
              value={texts[l.code]}
              onChange={(e) => setTexts((t) => ({ ...t, [l.code]: e.target.value }))}
            />
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!hasAny || busy}
        onClick={() => push(texts)}
        className="btn-primary mt-3 w-full text-2xs uppercase tracking-widest disabled:opacity-50"
      >
        {busy ? 'Pushing…' : '📣 Push caption'}
      </button>
    </div>
  );
}
