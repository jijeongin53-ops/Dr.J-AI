'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Volume2, VolumeX, Sparkles, FastForward } from 'lucide-react';

/**
 * 넷플릭스 오리지널 시그니처 '두둥~' (Tudum) 사운드 신시사이저
 * 외부 오디오 파일 다운로드 없이 브라우저 내장 Web Audio API로 0초 렉 없이 100% 합성 생성
 */
export function playNetflixTudumSound() {
  try {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return null;
    const ctx = new AudioContextClass();

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // 1. 첫 번째 저음 타격 ("두", Low Boom & Percussive Kick)
    const kickOsc = ctx.createOscillator();
    const kickGain = ctx.createGain();
    kickOsc.type = 'sine';
    kickOsc.frequency.setValueAtTime(110, now);
    kickOsc.frequency.exponentialRampToValueAtTime(42, now + 0.22);
    kickGain.gain.setValueAtTime(0.85, now);
    kickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
    kickOsc.connect(kickGain);
    kickGain.connect(ctx.destination);
    kickOsc.start(now);
    kickOsc.stop(now + 0.35);

    // 2. 두 번째 묵직한 서브베이스 및 공간감 충격음 ("둥~~~", Heavy Sub-Bass & Swell)
    const t2 = now + 0.17;
    const bassOsc = ctx.createOscillator();
    const subOsc = ctx.createOscillator();
    const filter = ctx.createBiquadFilter();
    const bassGain = ctx.createGain();

    // D2 (73.4Hz) 및 D1 Sub (36.7Hz) 넷플릭스 시그니처 톤
    bassOsc.type = 'sawtooth';
    bassOsc.frequency.setValueAtTime(73.42, t2);

    subOsc.type = 'triangle';
    subOsc.frequency.setValueAtTime(36.71, t2);

    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(380, t2);
    filter.frequency.exponentialRampToValueAtTime(75, t2 + 2.4);

    bassGain.gain.setValueAtTime(0.001, t2);
    bassGain.gain.linearRampToValueAtTime(0.9, t2 + 0.05); // 날카롭고 묵직한 어택
    bassGain.gain.exponentialRampToValueAtTime(0.001, t2 + 2.5);

    bassOsc.connect(filter);
    subOsc.connect(filter);
    filter.connect(bassGain);
    bassGain.connect(ctx.destination);

    bassOsc.start(t2);
    subOsc.start(t2);
    bassOsc.stop(t2 + 2.6);
    subOsc.stop(t2 + 2.6);

    // 3. 시네마틱 앰비언트 신스 & 오케스트라 배음 잔향 (Metallic Shimmer & Swell)
    const t3 = now + 0.2;
    const shimmerFreqs = [146.83, 220.0, 293.66, 440.0, 587.33, 880.0]; // D3, A3, D4, A4, D5, A5
    shimmerFreqs.forEach((freq, idx) => {
      const sOsc = ctx.createOscillator();
      const sGain = ctx.createGain();
      sOsc.type = idx % 2 === 0 ? 'sine' : 'triangle';
      sOsc.frequency.setValueAtTime(freq, t3);
      sGain.gain.setValueAtTime(0.001, t3);
      sGain.gain.linearRampToValueAtTime(0.12 / (idx + 1), t3 + 0.08);
      sGain.gain.exponentialRampToValueAtTime(0.0001, t3 + 2.8);
      sOsc.connect(sGain);
      sGain.connect(ctx.destination);
      sOsc.start(t3);
      sOsc.stop(t3 + 2.9);
    });

    return ctx;
  } catch (err) {
    console.warn('[Netflix Sound] 오디오 재생 실패:', err);
    return null;
  }
}

/**
 * 넷플릭스 스타일 극적인 시네마틱 인트로 컴포넌트
 */
export function NetflixIntro() {
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [stage, setStage] = useState<'idle' | 'boom' | 'reveal' | 'expand'>('idle');
  const [waitingInteraction, setWaitingInteraction] = useState(false);
  const introTimerRef = useRef<NodeJS.Timeout[]>([]);

  // 인트로 애니메이션 시퀀스 실행
  const triggerIntroSequence = () => {
    setWaitingInteraction(false);
    setStage('boom');

    // '두둥~' 사운드 재생
    playNetflixTudumSound();

    const t1 = setTimeout(() => {
      setStage('reveal');
    }, 200);

    const t2 = setTimeout(() => {
      setStage('expand');
    }, 1200);

    const t3 = setTimeout(() => {
      setFadingOut(true);
    }, 2800);

    const t4 = setTimeout(() => {
      setVisible(false);
      setFadingOut(false);
      setStage('idle');
    }, 3500);

    introTimerRef.current.push(t1, t2, t3, t4);
  };

  const handleStartWithClick = () => {
    triggerIntroSequence();
  };

  const handleSkip = () => {
    introTimerRef.current.forEach((t) => clearTimeout(t));
    setFadingOut(true);
    setTimeout(() => {
      setVisible(false);
      setFadingOut(false);
      setStage('idle');
    }, 300);
  };

  useEffect(() => {
    // 세션별 최초 접속 체크 (sessionStorage 확인)
    const hasSeenIntro = sessionStorage.getItem('DR_J_INTRO_SEEN');
    if (!hasSeenIntro) {
      sessionStorage.setItem('DR_J_INTRO_SEEN', 'true');
      setVisible(true);

      // 브라우저의 오디오 자동재생 가능 여부 확인
      try {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioContextClass) {
          const testCtx = new AudioContextClass();
          if (testCtx.state === 'running') {
            testCtx.close();
            triggerIntroSequence();
          } else {
            testCtx.close();
            // 브라우저 정책상 사용자 인터랙션 대기
            setWaitingInteraction(true);
          }
        } else {
          triggerIntroSequence();
        }
      } catch (_) {
        setWaitingInteraction(true);
      }
    }

    // 언제든 다시 볼 수 있도록 커스텀 이벤트 등록
    const handleReplay = () => {
      introTimerRef.current.forEach((t) => clearTimeout(t));
      setFadingOut(false);
      setVisible(true);
      triggerIntroSequence();
    };

    window.addEventListener('replayNetflixIntro', handleReplay);
    return () => {
      introTimerRef.current.forEach((t) => clearTimeout(t));
      window.removeEventListener('replayNetflixIntro', handleReplay);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      onClick={waitingInteraction ? handleStartWithClick : undefined}
      className={`fixed inset-0 z-[9999] bg-black flex flex-col items-center justify-center overflow-hidden transition-opacity duration-700 select-none ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      } ${waitingInteraction ? 'cursor-pointer' : ''}`}
      style={{ perspective: '1000px' }}
    >
      {/* 1. 우측 상단 건너뛰기 버튼 */}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
        className="absolute top-6 right-6 z-20 px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white/80 hover:text-white text-xs font-semibold backdrop-blur-md border border-white/15 transition flex items-center gap-1.5"
      >
        <span>SKIP</span>
        <FastForward className="w-3.5 h-3.5" />
      </button>

      {/* 2. 시네마틱 넷플릭스 스타일 수직 네온 빔 레이어 */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {/* 중앙 붉은/오렌지 빛 폭발 (Radial Flare) */}
        <div
          className={`absolute w-[600px] h-[600px] rounded-full bg-gradient-to-r from-orange-600/40 via-red-600/20 to-transparent blur-3xl transition-transform duration-1000 ${
            stage === 'reveal' || stage === 'expand'
              ? 'scale-150 opacity-90'
              : 'scale-50 opacity-20'
          }`}
        />

        {/* 넷플릭스 리본 광선 라인 (Vertical Light Ribbons) */}
        <div
          className={`absolute inset-0 flex items-center justify-center gap-2 sm:gap-3 transition-opacity duration-700 ${
            stage === 'reveal' || stage === 'expand' ? 'opacity-70 scale-110' : 'opacity-0 scale-90'
          }`}
        >
          {[-4, -3, -2, -1, 0, 1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="w-1.5 sm:w-2 h-screen rounded-full transition-all duration-1000"
              style={{
                background:
                  i === 0
                    ? 'linear-gradient(180deg, transparent, #FF6F0F, #E50914, transparent)'
                    : Math.abs(i) % 2 === 0
                    ? 'linear-gradient(180deg, transparent, #FF4500, transparent)'
                    : 'linear-gradient(180deg, transparent, #E50914, transparent)',
                transform:
                  stage === 'expand'
                    ? `scaleY(1.3) translateY(${i * 12}px) rotate(${i * 2}deg)`
                    : 'scaleY(0.8)',
                filter: 'blur(1.5px)',
                opacity: 1 - Math.abs(i) * 0.15,
              }}
            />
          ))}
        </div>
      </div>

      {/* 3. 중앙 Dr. J 로고 극적 등장 */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-4">
        {/* 심볼 아이콘 뱃지 */}
        <div
          className={`w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-gradient-to-br from-orange-500 via-carrot to-red-600 p-0.5 shadow-[0_0_80px_rgba(255,111,15,0.8)] flex items-center justify-center transition-all duration-700 transform ${
            stage === 'boom'
              ? 'scale-50 opacity-40 rotate-[-12deg]'
              : stage === 'reveal'
              ? 'scale-110 opacity-100 rotate-0'
              : stage === 'expand'
              ? 'scale-105 opacity-100 rotate-0'
              : 'scale-75 opacity-0'
          }`}
        >
          <div className="w-full h-full bg-black/90 rounded-[22px] flex items-center justify-center border border-white/20 backdrop-blur-xl">
            <span className="text-3xl sm:text-4xl font-black bg-gradient-to-br from-orange-400 via-yellow-200 to-white bg-clip-text text-transparent tracking-tighter drop-shadow-[0_0_20px_rgba(255,111,15,0.9)]">
              Dr. J
            </span>
          </div>
        </div>

        {/* 메인 넷플릭스 스타일 대형 타이틀 */}
        <h1
          className={`mt-6 text-4xl sm:text-6xl md:text-7xl font-black tracking-widest uppercase transition-all duration-1000 transform ${
            stage === 'reveal' || stage === 'expand'
              ? 'opacity-100 scale-100 translate-y-0'
              : 'opacity-0 scale-90 translate-y-4'
          }`}
          style={{
            letterSpacing: stage === 'expand' ? '0.35em' : '0.15em',
            textShadow: '0 0 40px rgba(255, 111, 15, 0.9), 0 0 80px rgba(229, 9, 20, 0.6)',
          }}
        >
          <span className="bg-gradient-to-r from-orange-500 via-red-500 to-amber-400 bg-clip-text text-transparent">
            DR. J&apos;S
          </span>
        </h1>

        {/* 서브타이틀 시네마틱 페이드인 */}
        <p
          className={`mt-4 text-xs sm:text-sm font-semibold tracking-[0.25em] text-gray-300 transition-all duration-1000 delay-200 ${
            stage === 'reveal' || stage === 'expand'
              ? 'opacity-90 translate-y-0'
              : 'opacity-0 translate-y-3'
          }`}
        >
          당근 모임 AI 통합 관리 아카데미
        </p>

        {/* 4. 브라우저 오디오 자동재생 제한 시 터치 유도 가이드 */}
        {waitingInteraction && (
          <div className="mt-10 animate-bounce flex flex-col items-center gap-2 p-3 px-5 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white cursor-pointer hover:bg-white/20 transition">
            <div className="flex items-center gap-2 text-xs font-bold text-orange-300">
              <Volume2 className="w-4 h-4 text-carrot animate-pulse" />
              <span>화면을 터치하면 극적인 사운드와 함께 시작됩니다</span>
            </div>
            <span className="text-[10px] text-gray-400">클릭하여 Dr. J 인트로 입장하기</span>
          </div>
        )}
      </div>

      {/* 하단 시네마틱 바 */}
      <div className="absolute bottom-6 left-0 right-0 flex justify-center text-[10px] tracking-widest text-zinc-600 uppercase font-mono">
        ORIGINAL COMMUNITY SERIES
      </div>
    </div>
  );
}
