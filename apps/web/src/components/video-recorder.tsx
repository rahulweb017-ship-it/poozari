'use client';

import { api } from '@/lib/client';
import { useEffect, useRef, useState } from 'react';

type Phase = 'idle' | 'ready' | 'recording' | 'review' | 'uploading' | 'done';

/**
 * In-app pooja video recorder. Uses getUserMedia + MediaRecorder to capture
 * the ritual from the pandit's device camera, then uploads the file to the API
 * (stored on local disk in dev). Falls back gracefully if camera is denied.
 */
export function VideoRecorder({
  bookingId,
  onUploaded,
}: {
  bookingId: string;
  onUploaded: (videoUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [blob, setBlob] = useState<Blob | null>(null);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Release the camera when the component unmounts.
  useEffect(() => {
    return () => {
      stopStream();
      if (timerRef.current) clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function openCamera() {
    setError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: true,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play().catch(() => undefined);
      }
      setPhase('ready');
    } catch {
      setError('Camera/mic access denied. Allow permission, or use "Paste video link" instead.');
    }
  }

  function startRecording() {
    const stream = streamRef.current;
    if (!stream) return;
    chunksRef.current = [];
    const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')
      ? 'video/webm;codecs=vp9,opus'
      : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';
    const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
    recorderRef.current = recorder;
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const recorded = new Blob(chunksRef.current, { type: recorder.mimeType || 'video/webm' });
      setBlob(recorded);
      setPreviewUrl(URL.createObjectURL(recorded));
      stopStream();
      setPhase('review');
    };
    recorder.start(1000);
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    setPhase('recording');
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    recorderRef.current?.stop();
  }

  function retake() {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setBlob(null);
    setSeconds(0);
    setPhase('idle');
  }

  async function upload() {
    if (!blob) return;
    setError('');
    setPhase('uploading');
    try {
      const ext = blob.type.includes('mp4') ? 'mp4' : 'webm';
      const updated = await api.panditUploadVideoFile(bookingId, blob, `pooja.${ext}`);
      setPhase('done');
      if (updated.videoUrl) onUploaded(updated.videoUrl);
    } catch (e: any) {
      setError(e.message ?? 'Upload failed');
      setPhase('review');
    }
  }

  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');

  return (
    <div className="rounded-2xl border p-4" style={{ borderColor: 'hsl(var(--border))' }}>
      <div className="flex items-center justify-between">
        <h4 className="text-2xs font-extrabold uppercase tracking-widest text-foreground">
          Record pooja video
        </h4>
        {phase === 'recording' && (
          <span className="badge bg-red-50 text-red-700">
            <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-red-500" />
            REC {mm}:{ss}
          </span>
        )}
      </div>

      {error ? <p className="mt-3 rounded-xl bg-red-50 p-3 text-xs text-red-700">{error}</p> : null}

      {/* Live camera preview / recorded review share one <video> element region. */}
      {phase === 'ready' || phase === 'recording' ? (
        <div className="mt-3 overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '16/9' }}>
          <video ref={videoRef} playsInline className="h-full w-full object-cover" />
        </div>
      ) : null}

      {phase === 'review' && previewUrl ? (
        <div className="mt-3 overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: '16/9' }}>
          <video src={previewUrl} controls playsInline className="h-full w-full object-cover" />
        </div>
      ) : null}

      <div className="mt-3 flex flex-wrap gap-2.5">
        {phase === 'idle' && (
          <button type="button" onClick={openCamera} className="btn-outline text-2xs uppercase tracking-wider">
            🎥 Open camera
          </button>
        )}
        {phase === 'ready' && (
          <>
            <button type="button" onClick={startRecording} className="btn-primary text-2xs uppercase tracking-wider">
              ● Start recording
            </button>
            <button type="button" onClick={() => { stopStream(); setPhase('idle'); }} className="btn-outline text-2xs uppercase tracking-wider">
              Cancel
            </button>
          </>
        )}
        {phase === 'recording' && (
          <button type="button" onClick={stopRecording} className="btn-primary text-2xs uppercase tracking-wider">
            ■ Stop
          </button>
        )}
        {phase === 'review' && (
          <>
            <button type="button" onClick={upload} className="btn-primary text-2xs uppercase tracking-wider">
              ⬆ Upload &amp; complete
            </button>
            <button type="button" onClick={retake} className="btn-outline text-2xs uppercase tracking-wider">
              ↺ Re-record
            </button>
          </>
        )}
        {phase === 'uploading' && (
          <span className="text-2xs font-bold uppercase tracking-wider text-muted-foreground">
            Uploading video…
          </span>
        )}
        {phase === 'done' && (
          <span className="badge bg-green-50 text-green-700">✓ Video uploaded</span>
        )}
      </div>
    </div>
  );
}
