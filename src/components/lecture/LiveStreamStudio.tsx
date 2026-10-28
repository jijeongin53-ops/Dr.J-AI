'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Radio,
  Monitor,
  Smartphone,
  Video,
  VideoOff,
  Mic,
  MicOff,
  CircleDot,
  Square,
  Download,
  QrCode,
  RefreshCw,
  Maximize2,
  Columns,
  PictureInPicture2,
  Camera,
  CheckCircle2,
  Copy,
  Check,
  Sparkles,
  Youtube,
  Volume2,
  VolumeX,
  Power,
  FolderUp,
  Trash2,
  ExternalLink,
  Loader2,
  PlayCircle,
} from 'lucide-react';
import {
  GOOGLE_DRIVE_FOLDER_ID,
  GOOGLE_DRIVE_FOLDER_URL,
  GOOGLE_APPS_SCRIPT_DEFAULT_URL,
} from '@/lib/constants';

interface LiveStreamStudioProps {
  lectureId: string;
  lectureTitle: string;
  isAdmin: boolean;
  externalStartRecordTrigger?: number;
  externalEndBroadcastTrigger?: number;
  onSaveYoutubeLiveUrl?: (url: string) => void;
  onSaveReplayVideo?: (videoUrlOrId: string, localBlobUrl?: string) => void;
}

type StudioDeviceRole = 'viewer' | 'laptop' | 'phone';
type LayoutMode = 'pip' | 'split' | 'screenOnly' | 'camOnly';

// PeerJS CDN 동적 로더 (번들 크기 증가 및 SSR 충돌 방지)
function loadPeerJsScript(): Promise<any> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Browser environment required'));
      return;
    }
    if ((window as any).Peer) {
      resolve((window as any).Peer);
      return;
    }
    const existing = document.getElementById('peerjs-cdn-script') as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener('load', () => resolve((window as any).Peer));
      existing.addEventListener('error', reject);
      return;
    }
    const script = document.createElement('script');
    script.id = 'peerjs-cdn-script';
    script.src = 'https://unpkg.com/peerjs@1.5.4/dist/peerjs.min.js';
    script.async = true;
    script.onload = () => resolve((window as any).Peer);
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
}

export function LiveStreamStudio({
  lectureId,
  lectureTitle,
  isAdmin,
  externalStartRecordTrigger = 0,
  externalEndBroadcastTrigger = 0,
  onSaveYoutubeLiveUrl,
  onSaveReplayVideo,
}: LiveStreamStudioProps) {
  // URL 파라미터(?liveMode=phone&adminKey=drjlive)로 스마트폰 QR 접속 시 즉시 스마트폰 관리자 모드 활성화
  const [qrAdminUnlocked, setQrAdminUnlocked] = useState(false);
  const effectiveAdmin = isAdmin || qrAdminUnlocked;

  const [deviceRole, setDeviceRole] = useState<StudioDeviceRole>('laptop');
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('pip');

  // 스트림 수신/송출 상태
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [isCamStreaming, setIsCamStreaming] = useState(false);
  const [hasRemoteScreen, setHasRemoteScreen] = useState(false);
  const [hasRemoteCam, setHasRemoteCam] = useState(false);

  // 스마트폰 카메라 및 마이크 제어 상태
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('user');
  const [micEnabled, setMicEnabled] = useState(true);
  const [viewerMuted, setViewerMuted] = useState(false);

  // 스마트폰 녹화(MediaRecorder) 상태
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [recordedBlobUrl, setRecordedBlobUrl] = useState<string | null>(null);
  const [recordedFileName, setRecordedFileName] = useState<string>('');
  const [recordMode, setRecordMode] = useState<'cam' | 'composite'>('cam');
  const [lastRealtimeSaveTime, setLastRealtimeSaveTime] = useState<string | null>(null);

  // 방송 끄기 및 구글 드라이브 다시보기 저장 모달 상태
  const [showEndBroadcastModal, setShowEndBroadcastModal] = useState(false);
  const [driveUploadStatus, setDriveUploadStatus] = useState<'idle' | 'uploading' | 'manual_link' | 'done'>('idle');
  const [driveUploadMessage, setDriveUploadMessage] = useState<string>('');
  const [manualDriveLinkInput, setManualDriveLinkInput] = useState<string>('');

  // 연결 상태 및 QR 모달
  const [statusText, setStatusText] = useState<string>('실시간 방송 연결 대기 중...');
  const [viewerCount, setViewerCount] = useState<number>(0);
  const [showQrModal, setShowQrModal] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // 유튜브 라이브 링크 빠른 연동 상태
  const [ytLiveInput, setYtLiveInput] = useState('');

  // 비디오 엘리먼트 Refs
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const camVideoRef = useRef<HTMLVideoElement | null>(null);
  const playerContainerRef = useRef<HTMLDivElement | null>(null);

  // 미디어 스트림 & Peer 인스턴스 Refs
  const localScreenStreamRef = useRef<MediaStream | null>(null);
  const localCamStreamRef = useRef<MediaStream | null>(null);
  const remoteScreenStreamRef = useRef<MediaStream | null>(null);
  const remoteCamStreamRef = useRef<MediaStream | null>(null);

  const screenHostPeerRef = useRef<any>(null);
  const camHostPeerRef = useRef<any>(null);
  const viewerPeerRef = useRef<any>(null);

  // 녹화용 Refs 및 실시간 구글 드라이브 자동 저장 Refs
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordedBlobRef = useRef<Blob | null>(null);
  const recordedMimeTypeRef = useRef<string>('video/webm');
  const realtimeDriveFileIdRef = useRef<string>('');
  const isRealtimeSyncingRef = useRef<boolean>(false);
  const lastSyncedChunkCountRef = useRef<number>(0);
  const realtimeSyncTimerRef = useRef<NodeJS.Timeout | null>(null);
  const realtimeSyncPromiseRef = useRef<Promise<string | null> | null>(null);
  const shouldAutoDownloadOnStopRef = useRef<boolean>(false);
  const recordStopResolverRef = useRef<((blob: Blob | null) => void) | null>(null);
  const recordTimerRef = useRef<NodeJS.Timeout | null>(null);
  const compositeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const compositeAnimRef = useRef<number | null>(null);

  // 강의실 고유 Peer ID 생성 (영문/숫자만 허용)
  const cleanRoomKey = (lectureId || 'default').replace(/[^a-zA-Z0-9]/g, '').slice(-16) || 'room1';
  const screenHostId = `drj_screen_${cleanRoomKey}`;
  const camHostId = `drj_cam_${cleanRoomKey}`;

  // 초기 접속 기기 감지 및 QR 파라미터 처리
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('liveMode');
    const keyParam = params.get('adminKey');

    if (keyParam === 'drjlive') {
      setQrAdminUnlocked(true);
    }

    if (modeParam === 'phone') {
      setDeviceRole('phone');
    } else {
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      setDeviceRole(isMobile ? 'phone' : 'laptop');
    }
  }, [isAdmin]);

  // 비디오 태그에 스트림 연결 헬퍼
  const attachStreamsToVideoElements = useCallback(() => {
    const activeScreenStream = localScreenStreamRef.current || remoteScreenStreamRef.current;
    const activeCamStream = localCamStreamRef.current || remoteCamStreamRef.current;

    if (screenVideoRef.current && activeScreenStream) {
      if (screenVideoRef.current.srcObject !== activeScreenStream) {
        screenVideoRef.current.srcObject = activeScreenStream;
        screenVideoRef.current.play().catch(() => {});
      }
    }
    if (camVideoRef.current && activeCamStream) {
      if (camVideoRef.current.srcObject !== activeCamStream) {
        camVideoRef.current.srcObject = activeCamStream;
        camVideoRef.current.play().catch(() => {});
      }
    }
  }, []);

  useEffect(() => {
    attachStreamsToVideoElements();
  }, [isScreenSharing, isCamStreaming, hasRemoteScreen, hasRemoteCam, layoutMode, attachStreamsToVideoElements]);

  // ============================================================================
  // 1. 수강생(Viewer) 및 반대편 기기 자동 수신 연결 (PeerJS P2P — 서버 비용 0)
  // ============================================================================
  const connectToBroadcasts = useCallback(async () => {
    try {
      const PeerClass = await loadPeerJsScript();
      if (!PeerClass) return;

      if (!viewerPeerRef.current || viewerPeerRef.current.destroyed) {
        const randomSuffix = Math.random().toString(36).substring(2, 8);
        const peer = new PeerClass(`drj_v_${cleanRoomKey}_${randomSuffix}`, {
          debug: 0,
        });

        peer.on('call', (call: any) => {
          // 수강생은 별도 카메라/마이크 권한 없이 수신 전용으로 응답
          call.answer();
          call.on('stream', (remoteStream: MediaStream) => {
            const callerId = String(call.peer || '');
            if (callerId === screenHostId) {
              remoteScreenStreamRef.current = remoteStream;
              setHasRemoteScreen(true);
              setStatusText('🔴 실시간 노트북 화면 공유 수신 중');
              attachStreamsToVideoElements();
            } else if (callerId === camHostId) {
              remoteCamStreamRef.current = remoteStream;
              setHasRemoteCam(true);
              setStatusText('🔴 실시간 스마트폰 카메라 영상 수신 중');
              attachStreamsToVideoElements();
            }
          });
          call.on('close', () => {
            if (call.peer === screenHostId) {
              remoteScreenStreamRef.current = null;
              setHasRemoteScreen(false);
            } else if (call.peer === camHostId) {
              remoteCamStreamRef.current = null;
              setHasRemoteCam(false);
            }
          });
        });

        viewerPeerRef.current = peer;
      }

      const vPeer = viewerPeerRef.current;
      if (!vPeer || !vPeer.open) {
        vPeer?.once?.('open', () => {
          requestStreamsFromHosts(vPeer);
        });
      } else {
        requestStreamsFromHosts(vPeer);
      }
    } catch (_) {}
  }, [cleanRoomKey, screenHostId, camHostId, attachStreamsToVideoElements]);

  const requestStreamsFromHosts = (vPeer: any) => {
    // 내가 노트북 화면 공유 호스트가 아닐 때만 원격 노트북 화면 요청
    if (!localScreenStreamRef.current && !remoteScreenStreamRef.current) {
      try {
        const conn1 = vPeer.connect(screenHostId, { reliable: false });
        conn1?.on('open', () => {
          conn1.send({ type: 'REQUEST_STREAM', viewerId: vPeer.id });
        });
      } catch (_) {}
    }

    // 내가 스마트폰 카메라 호스트가 아닐 때만 원격 스마트폰 카메라 요청
    if (!localCamStreamRef.current && !remoteCamStreamRef.current) {
      try {
        const conn2 = vPeer.connect(camHostId, { reliable: false });
        conn2?.on('open', () => {
          conn2.send({ type: 'REQUEST_STREAM', viewerId: vPeer.id });
        });
      } catch (_) {}
    }
  };

  // 주기적으로 방송 호스트 연결 확인 (백그라운드 탭에서는 일시정지, Vercel 서버는 전혀 거치지 않음)
  useEffect(() => {
    connectToBroadcasts();
    const timer = setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      if (!hasRemoteScreen || !hasRemoteCam) {
        connectToBroadcasts();
      }
    }, 5000);
    return () => {
      clearInterval(timer);
    };
  }, [connectToBroadcasts, hasRemoteScreen, hasRemoteCam]);

  // 컴포넌트 언마운트 시 모든 스트림 및 Peer 정리
  useEffect(() => {
    return () => {
      localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
      localCamStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenHostPeerRef.current?.destroy?.();
      camHostPeerRef.current?.destroy?.();
      viewerPeerRef.current?.destroy?.();
      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      if (compositeAnimRef.current) cancelAnimationFrame(compositeAnimRef.current);
    };
  }, []);

  // ============================================================================
  // 2. [조건 1]: 내가 지정한 노트북 화면 공유 시작 / 종료
  // ============================================================================
  const startLaptopScreenShare = async () => {
    try {
      const displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: {
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          frameRate: { ideal: 30 },
        },
        audio: true,
      });

      // 공유 중단 버튼(브라우저 기본 바) 클릭 감지 -> 방송 끄기 및 저장 선택 모달 표시
      displayStream.getVideoTracks()[0]?.addEventListener('ended', () => {
        handleTurnOffBroadcast();
      });

      localScreenStreamRef.current = displayStream;
      setIsScreenSharing(true);
      setStatusText('🔴 내 노트북 화면을 실시간으로 공유 중입니다');
      attachStreamsToVideoElements();

      // 방송 시작 시 다시보기 저장을 위해 백그라운드 자동 녹화 시작
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        startBroadcastRecordingInternal(displayStream);
      }

      const PeerClass = await loadPeerJsScript();
      if (screenHostPeerRef.current) {
        screenHostPeerRef.current.destroy();
      }

      const hostPeer = new PeerClass(screenHostId, { debug: 0 });
      const connectedViewers = new Set<string>();

      hostPeer.on('connection', (conn: any) => {
        conn.on('open', () => {
          if (localScreenStreamRef.current) {
            connectedViewers.add(conn.peer);
            setViewerCount(connectedViewers.size);
            hostPeer.call(conn.peer, localScreenStreamRef.current);
          }
        });
        conn.on('data', (data: any) => {
          if (data?.type === 'REQUEST_STREAM' && localScreenStreamRef.current) {
            connectedViewers.add(conn.peer);
            setViewerCount(connectedViewers.size);
            hostPeer.call(conn.peer, localScreenStreamRef.current);
          }
        });
        conn.on('close', () => {
          connectedViewers.delete(conn.peer);
          setViewerCount(connectedViewers.size);
        });
      });

      screenHostPeerRef.current = hostPeer;
    } catch (err: any) {
      if (err?.name !== 'NotAllowedError') {
        alert('노트북 화면 공유를 시작할 수 없습니다. 브라우저 화면 공유 권한을 확인해 주세요.');
      }
    }
  };

  const stopLaptopScreenShare = () => {
    localScreenStreamRef.current?.getTracks().forEach((t) => t.stop());
    localScreenStreamRef.current = null;
    screenHostPeerRef.current?.destroy?.();
    screenHostPeerRef.current = null;
    setIsScreenSharing(false);
    setStatusText('노트북 화면 공유가 종료되었습니다.');
  };

  // ============================================================================
  // 3. [조건 2]: 와이파이 연결된 내 스마트폰 카메라 송출 & 영상 녹화
  // ============================================================================
  const startPhoneCameraStream = async (targetFacingMode: 'user' | 'environment' = facingMode) => {
    try {
      localCamStreamRef.current?.getTracks().forEach((t) => t.stop());

      const camStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: targetFacingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        },
      });

      camStream.getAudioTracks().forEach((t) => {
        t.enabled = micEnabled;
      });

      localCamStreamRef.current = camStream;
      setIsCamStreaming(true);
      setStatusText('🔴 스마트폰 카메라 및 음성을 실시간 송출 중입니다');
      attachStreamsToVideoElements();

      // 방송 시작 시 다시보기 저장을 위해 백그라운드 자동 녹화 시작
      if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
        startBroadcastRecordingInternal(camStream);
      }

      const PeerClass = await loadPeerJsScript();
      if (camHostPeerRef.current) {
        camHostPeerRef.current.destroy();
      }

      const hostPeer = new PeerClass(camHostId, { debug: 0 });
      const connectedViewers = new Set<string>();

      hostPeer.on('connection', (conn: any) => {
        conn.on('open', () => {
          if (localCamStreamRef.current) {
            connectedViewers.add(conn.peer);
            setViewerCount(connectedViewers.size);
            hostPeer.call(conn.peer, localCamStreamRef.current);
          }
        });
        conn.on('data', (data: any) => {
          if (data?.type === 'REQUEST_STREAM' && localCamStreamRef.current) {
            connectedViewers.add(conn.peer);
            setViewerCount(connectedViewers.size);
            hostPeer.call(conn.peer, localCamStreamRef.current);
          } else if (data?.type === 'REMOTE_START_RECORD') {
            startPhoneRecording();
          } else if (data?.type === 'REMOTE_STOP_RECORD') {
            stopPhoneRecording(true);
          } else if (data?.type === 'REMOTE_TOGGLE_FACING') {
            toggleCameraFacing();
          }
        });
        conn.on('close', () => {
          connectedViewers.delete(conn.peer);
          setViewerCount(connectedViewers.size);
        });
      });

      camHostPeerRef.current = hostPeer;
    } catch (err) {
      alert('스마트폰 카메라/마이크 접근 권한을 허용해 주세요.');
    }
  };

  const stopPhoneCameraStream = () => {
    localCamStreamRef.current?.getTracks().forEach((t) => t.stop());
    localCamStreamRef.current = null;
    camHostPeerRef.current?.destroy?.();
    camHostPeerRef.current = null;
    setIsCamStreaming(false);
    setStatusText('스마트폰 카메라 송출이 종료되었습니다.');
  };

  // 전면/후면 카메라 전환
  const toggleCameraFacing = async () => {
    const nextMode = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(nextMode);
    if (isCamStreaming) {
      await startPhoneCameraStream(nextMode);
    }
  };

  // 마이크 ON/OFF 토글
  const toggleMic = () => {
    const next = !micEnabled;
    setMicEnabled(next);
    if (localCamStreamRef.current) {
      localCamStreamRef.current.getAudioTracks().forEach((t) => {
        t.enabled = next;
      });
    }
  };

  // 실시간/주기적 구글 드라이브 자동 백업 업로드 헬퍼 (PC·스마트폰 전원 꺼짐 대비 및 방송 종료 시 초고속 완료)
  const syncRecordingToDriveRealtime = useCallback(
    async (forceFinal = false): Promise<string | null> => {
      if (isRealtimeSyncingRef.current && realtimeSyncPromiseRef.current && !forceFinal) {
        return realtimeSyncPromiseRef.current;
      }

      const chunks = recordedChunksRef.current;
      if (!chunks || chunks.length === 0) {
        return realtimeDriveFileIdRef.current || null;
      }

      // 이전 동기화 이후 새로 추가된 청크가 없으면 기존 파일 ID 반환
      if (!forceFinal && chunks.length === lastSyncedChunkCountRef.current && realtimeDriveFileIdRef.current) {
        return realtimeDriveFileIdRef.current;
      }

      const runUpload = async (): Promise<string | null> => {
        isRealtimeSyncingRef.current = true;
        try {
          const mimeType = recordedMimeTypeRef.current || 'video/webm';
          const ext = mimeType.includes('mp4') ? 'mp4' : 'webm';
          const snapshotBlob = recordedBlobRef.current || new Blob(chunks, { type: mimeType });
          if (!snapshotBlob || snapshotBlob.size === 0 || snapshotBlob.size > 35 * 1024 * 1024) {
            return realtimeDriveFileIdRef.current || null;
          }

          const chunkCountAtStart = chunks.length;
          const base64Data = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
              const res = String(reader.result || '');
              const commaIdx = res.indexOf(',');
              resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
            };
            reader.onerror = reject;
            reader.readAsDataURL(snapshotBlob);
          });

          const now = new Date();
          const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
            now.getDate()
          ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
            now.getMinutes()
          ).padStart(2, '0')}`;
          const safeTitle = (lectureTitle || '라이브강의').replace(/[^가-힣a-zA-Z0-9_-]/g, '_');
          const fileName = recordedFileName || `DrJ_다시보기_${safeTitle}_${dateStr}.${ext}`;

          const gasUrl =
            (typeof window !== 'undefined' ? localStorage.getItem('DR_J_GAS_URL') : '') ||
            GOOGLE_APPS_SCRIPT_DEFAULT_URL;

          const response = await fetch(gasUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({
              action: 'uploadDriveVideo',
              folderId: GOOGLE_DRIVE_FOLDER_ID,
              previousFileId: realtimeDriveFileIdRef.current || undefined,
              lectureId,
              fileName,
              mimeType,
              base64Data,
            }),
            keepalive: true,
          });

          const data = await response.json();
          if (response.ok && data?.result === 'success' && data?.fileId) {
            realtimeDriveFileIdRef.current = data.fileId;
            lastSyncedChunkCountRef.current = chunkCountAtStart;
            const timeLabel = `${String(now.getHours()).padStart(2, '0')}:${String(
              now.getMinutes()
            ).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
            setLastRealtimeSaveTime(timeLabel);
            return data.fileId as string;
          }
        } catch (_) {
        } finally {
          isRealtimeSyncingRef.current = false;
        }
        return realtimeDriveFileIdRef.current || null;
      };

      const p = runUpload();
      realtimeSyncPromiseRef.current = p;
      return p;
    },
    [lectureId, lectureTitle, recordedFileName]
  );

  // PC나 스마트폰이 갑자기 꺼지거나 창이 닫힐 때 그때까지 녹화된 영상을 즉시 백그라운드 전송
  useEffect(() => {
    if (!isRecording) return;
    const handleEmergencyFlush = () => {
      if (recordedChunksRef.current.length > 0) {
        syncRecordingToDriveRealtime(true);
      }
    };
    window.addEventListener('pagehide', handleEmergencyFlush);
    window.addEventListener('beforeunload', handleEmergencyFlush);
    return () => {
      window.removeEventListener('pagehide', handleEmergencyFlush);
      window.removeEventListener('beforeunload', handleEmergencyFlush);
    };
  }, [isRecording, syncRecordingToDriveRealtime]);

  // 내부 스트림 녹화 시작 헬퍼 (노트북 화면 공유 또는 스마트폰 카메라 스트림)
  const startBroadcastRecordingInternal = (baseStream: MediaStream) => {
    try {
      let streamToRecord = baseStream;

      // 합본(노트북 화면 + 스마트폰 PIP) 녹화 모드이고 노트북 화면이 수신 중일 때 Canvas 합성 스트림 생성
      const screenEl = screenVideoRef.current;
      const camEl = camVideoRef.current;
      const hasScreen = Boolean(localScreenStreamRef.current || remoteScreenStreamRef.current);

      if (recordMode === 'composite' && hasScreen && screenEl && camEl) {
        const canvas = document.createElement('canvas');
        canvas.width = 1280;
        canvas.height = 720;
        compositeCanvasRef.current = canvas;
        const ctx = canvas.getContext('2d');

        const drawFrame = () => {
          if (!ctx) return;
          ctx.fillStyle = '#000000';
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          if (screenEl.readyState >= 2) {
            ctx.drawImage(screenEl, 0, 0, canvas.width, canvas.height);
          }
          if (camEl.readyState >= 2) {
            const pipW = 320;
            const pipH = 180;
            const pipX = canvas.width - pipW - 24;
            const pipY = canvas.height - pipH - 24;
            ctx.save();
            ctx.strokeStyle = '#FF6F0F';
            ctx.lineWidth = 4;
            ctx.strokeRect(pipX, pipY, pipW, pipH);
            ctx.drawImage(camEl, pipX, pipY, pipW, pipH);
            ctx.restore();
          }
          compositeAnimRef.current = requestAnimationFrame(drawFrame);
        };
        drawFrame();

        const canvasStream = canvas.captureStream(30);
        // 오디오 트랙 병합
        baseStream.getAudioTracks().forEach((track) => canvasStream.addTrack(track));
        streamToRecord = canvasStream;
      }

      recordedChunksRef.current = [];
      recordedBlobRef.current = null;
      realtimeDriveFileIdRef.current = '';
      lastSyncedChunkCountRef.current = 0;
      setRecordedBlobUrl(null);
      setLastRealtimeSaveTime(null);
      shouldAutoDownloadOnStopRef.current = false;

      // 모바일 브라우저(iOS Safari / Android Chrome) 호환성 높은 MIME 타입 자동 선택
      const mimeTypes = [
        'video/mp4',
        'video/webm;codecs=vp9,opus',
        'video/webm;codecs=vp8,opus',
        'video/webm',
      ];
      const supportedMime = mimeTypes.find((m) => MediaRecorder.isTypeSupported(m)) || '';
      recordedMimeTypeRef.current = supportedMime || 'video/webm';

      // 빠른 실시간 구글 드라이브 업로드를 위해 최적화된 비트레이트(600kbps 영상 + 64kbps 음성) 적용
      const recorderOptions: MediaRecorderOptions = supportedMime
        ? {
            mimeType: supportedMime,
            videoBitsPerSecond: 600000,
            audioBitsPerSecond: 64000,
          }
        : {
            videoBitsPerSecond: 600000,
            audioBitsPerSecond: 64000,
          };

      const recorder = new MediaRecorder(streamToRecord, recorderOptions);

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          recordedChunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (compositeAnimRef.current) {
          cancelAnimationFrame(compositeAnimRef.current);
          compositeAnimRef.current = null;
        }
        if (realtimeSyncTimerRef.current) {
          clearInterval(realtimeSyncTimerRef.current);
          realtimeSyncTimerRef.current = null;
        }
        const ext = supportedMime.includes('mp4') ? 'mp4' : 'webm';
        const blob = new Blob(recordedChunksRef.current, {
          type: supportedMime || 'video/webm',
        });
        const url = URL.createObjectURL(blob);
        const now = new Date();
        const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(
          now.getDate()
        ).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(
          now.getMinutes()
        ).padStart(2, '0')}`;
        const safeTitle = (lectureTitle || '라이브강의').replace(/[^가-힣a-zA-Z0-9_-]/g, '_');
        const fileName = `DrJ_다시보기_${safeTitle}_${dateStr}.${ext}`;

        recordedBlobRef.current = blob;
        setRecordedBlobUrl(url);
        setRecordedFileName(fileName);

        // 수동 녹화 완료 버튼 클릭 시에만 즉시 기기 다운로드 실행 (방송 끄기 클릭 시에는 모달 선택에 따름)
        if (shouldAutoDownloadOnStopRef.current) {
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }

        if (recordStopResolverRef.current) {
          recordStopResolverRef.current(blob);
          recordStopResolverRef.current = null;
        }
      };

      // 3초 단위로 실시간 청크 버퍼링
      recorder.start(3000);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingSeconds(0);

      if (recordTimerRef.current) clearInterval(recordTimerRef.current);
      recordTimerRef.current = setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);

      // 15초마다 실시간으로 구글 드라이브에 자동 백업 (PC나 스마트폰이 꺼져도 그때까지의 녹화본 보존)
      if (realtimeSyncTimerRef.current) clearInterval(realtimeSyncTimerRef.current);
      realtimeSyncTimerRef.current = setInterval(() => {
        syncRecordingToDriveRealtime(false);
      }, 15000);
    } catch (_) {}
  };

  // 스마트폰에서 실시간 영상 녹화 시작 (스마트폰 단독 녹화 또는 노트북+스마트폰 합본 녹화)
  const startPhoneRecording = async () => {
    let targetStream =
      localCamStreamRef.current ||
      remoteCamStreamRef.current ||
      localScreenStreamRef.current ||
      remoteScreenStreamRef.current;

    // 아직 카메라나 화면공유가 켜지지 않은 상태에서 녹화를 누르면 현재 기기에 맞춰 자동 시작
    if (!targetStream) {
      try {
        if (deviceRole === 'laptop') {
          await startLaptopScreenShare();
          targetStream = localScreenStreamRef.current;
        } else {
          await startPhoneCameraStream(facingMode);
          targetStream = localCamStreamRef.current;
        }
      } catch (_) {}
    }

    if (!targetStream) {
      alert('녹화할 영상 스트림이 없습니다. 먼저 화면 공유 또는 카메라 송출을 시작해 주세요.');
      return;
    }

    if (!mediaRecorderRef.current || mediaRecorderRef.current.state === 'inactive') {
      startBroadcastRecordingInternal(targetStream);
    }
  };

  const stopPhoneRecording = (autoDownload = true): Promise<Blob | null> => {
    return new Promise((resolve) => {
      shouldAutoDownloadOnStopRef.current = autoDownload;
      if (realtimeSyncTimerRef.current) {
        clearInterval(realtimeSyncTimerRef.current);
        realtimeSyncTimerRef.current = null;
      }
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        recordStopResolverRef.current = resolve;
        mediaRecorderRef.current.stop();
      } else {
        resolve(recordedBlobRef.current);
      }
      setIsRecording(false);
      if (recordTimerRef.current) {
        clearInterval(recordTimerRef.current);
        recordTimerRef.current = null;
      }
    });
  };

  // ============================================================================
  // 4. [방송 끄기] & 구글 드라이브(1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo) 다시보기 저장 / 저장하지 않기
  // ============================================================================
  const handleTurnOffBroadcast = async () => {
    // 1) 진행 중인 녹화를 먼저 안전하게 마무리하여 그때까지의 녹화 Blob 확정
    await stopPhoneRecording(false);

    // 2) 노트북 화면 공유 및 스마트폰 카메라 스트림 모두 종료
    stopLaptopScreenShare();
    stopPhoneCameraStream();
    remoteScreenStreamRef.current = null;
    remoteCamStreamRef.current = null;
    setHasRemoteScreen(false);
    setHasRemoteCam(false);
    setStatusText('방송이 종료되었습니다. 다시보기 저장 여부를 선택해 주세요.');

    // 3) 방송 끄기를 누른 즉시 백그라운드에서 최종 녹화본 구글 드라이브 선제 업로드 시작 (체감 대기시간 단축)
    if (recordedChunksRef.current.length > 0) {
      syncRecordingToDriveRealtime(true);
    }

    // 4) 구글 드라이브에 저장하기 vs 저장하지 않기 선택 모달 열기
    setDriveUploadStatus('idle');
    setDriveUploadMessage('');
    setShowEndBroadcastModal(true);
  };

  // [선택 1]: 구글 드라이브(1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo)에 저장하기 & 다시보기 자동 등록
  const handleSaveToGoogleDrive = async () => {
    setDriveUploadStatus('uploading');
    setDriveUploadMessage(
      '그때까지 녹화된 영상을 구글 드라이브(1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo)에 빠르게 저장하고 있습니다...'
    );

    const blobUrl = recordedBlobUrl;
    const fileName =
      recordedFileName ||
      `DrJ_다시보기_${(lectureTitle || '라이브강의').replace(/[^가-힣a-zA-Z0-9_-]/g, '_')}_${Date.now()}.webm`;

    // 기기에도 안전하게 영상 파일 백업 다운로드 실행
    if (blobUrl) {
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    }

    // 실시간 백업 또는 방송 끄기 시점에 시작된 구글 드라이브 업로드 완료 확인
    const uploadedFileId = await syncRecordingToDriveRealtime(true);
    if (uploadedFileId) {
      onSaveReplayVideo?.(uploadedFileId, blobUrl || undefined);
      setDriveUploadStatus('done');
      setDriveUploadMessage(
        '✅ 구글 드라이브 저장 및 강의 다시보기 등록이 완료되었습니다!'
      );
      setTimeout(() => {
        setShowEndBroadcastModal(false);
      }, 900);
      return;
    }

    // 대용량이거나 직접 폴더 업로드가 필요한 경우: 지정된 구글 드라이브 폴더를 즉시 새 창으로 열고 다시보기 연결 지원
    if (typeof window !== 'undefined') {
      window.open(GOOGLE_DRIVE_FOLDER_URL, '_blank', 'noopener,noreferrer');
    }
    setDriveUploadStatus('manual_link');
    setDriveUploadMessage(
      '녹화 영상 파일이 기기에 저장되었고, 지정된 구글 드라이브 폴더가 열렸습니다! 폴더에 파일을 올리신 뒤 아래에 링크를 붙여넣거나 [즉시 다시보기 전환]을 눌러주세요.'
    );
  };

  // 구글 드라이브 폴더에 업로드한 파일 링크(또는 로컬 녹화본)로 즉시 다시보기 확정
  const handleConfirmManualReplay = () => {
    const targetUrl = manualDriveLinkInput.trim();
    if (targetUrl) {
      onSaveReplayVideo?.(targetUrl, recordedBlobUrl || undefined);
      setShowEndBroadcastModal(false);
      setManualDriveLinkInput('');
      return;
    }
    if (recordedBlobUrl) {
      onSaveReplayVideo?.('', recordedBlobUrl);
      setShowEndBroadcastModal(false);
      return;
    }
    alert('구글 드라이브에 업로드한 영상의 공유 링크(또는 파일 ID)를 입력해 주세요.');
  };

  // [선택 2]: 저장하지 않기 (녹화 데이터 및 임시 드라이브 백업본 폐기)
  const handleDiscardBroadcastRecording = () => {
    const tempDriveId = realtimeDriveFileIdRef.current;
    if (tempDriveId) {
      const gasUrl =
        (typeof window !== 'undefined' ? localStorage.getItem('DR_J_GAS_URL') : '') ||
        GOOGLE_APPS_SCRIPT_DEFAULT_URL;
      fetch(gasUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          action: 'deleteDriveVideo',
          fileId: tempDriveId,
        }),
      }).catch(() => {});
    }
    if (recordedBlobUrl) {
      URL.revokeObjectURL(recordedBlobUrl);
    }
    realtimeDriveFileIdRef.current = '';
    lastSyncedChunkCountRef.current = 0;
    recordedChunksRef.current = [];
    recordedBlobRef.current = null;
    setRecordedBlobUrl(null);
    setRecordedFileName('');
    setLastRealtimeSaveTime(null);
    setShowEndBroadcastModal(false);
    setDriveUploadStatus('idle');
    setDriveUploadMessage('');
    setStatusText('방송이 저장하지 않고 종료되었습니다.');
  };

  // 상단 VideoPlayer 헤더의 [방송 녹화] 버튼 클릭 시 연동 실행
  useEffect(() => {
    if (externalStartRecordTrigger > 0 && effectiveAdmin) {
      startPhoneRecording();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalStartRecordTrigger]);

  // 상단 VideoPlayer 헤더의 [⏹ 방송 끄기] 버튼 클릭 시 연동 실행
  useEffect(() => {
    if (externalEndBroadcastTrigger > 0 && effectiveAdmin) {
      handleTurnOffBroadcast();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalEndBroadcastTrigger]);

  const formatTimer = (sec: number) => {
    const mm = String(Math.floor(sec / 60)).padStart(2, '0');
    const ss = String(sec % 60).padStart(2, '0');
    return `${mm}:${ss}`;
  };

  // 전체화면 전환
  const handleFullScreen = () => {
    if (!playerContainerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    } else {
      playerContainerRef.current.requestFullscreen?.().catch(() => {});
    }
  };

  // 스마트폰 QR 연결용 URL 생성
  const phoneConnectUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/lectures/${lectureId}?liveMode=phone&adminKey=drjlive`
      : '';

  const copyPhoneUrl = () => {
    if (!phoneConnectUrl) return;
    navigator.clipboard.writeText(phoneConnectUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const showScreenStream = isScreenSharing || hasRemoteScreen;
  const showCamStream = isCamStreaming || hasRemoteCam;
  const isAnyLive = showScreenStream || showCamStream;

  return (
    <div className="w-full bg-gray-950 text-white rounded-b-2xl overflow-hidden">
      {/* 1. 관리자 전용: 노트북(화면 공유) + 스마트폰(카메라 & 녹화) 듀얼 컨트롤 스튜디오 */}
      {effectiveAdmin && (
        <div className="p-4 sm:p-5 bg-gray-900 border-b border-gray-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-1 rounded-full text-[11px] font-extrabold bg-red-600 text-white flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 animate-pulse" />
                <span>관리자 듀얼 라이브 스튜디오 (비용 0원)</span>
              </span>
              {viewerCount > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  실시간 연결: {viewerCount}명
                </span>
              )}
              {isRecording && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-amber-500/20 text-amber-300 border border-amber-400/40 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                  <span>
                    {lastRealtimeSaveTime
                      ? `☁️ 드라이브 실시간 백업됨 (${lastRealtimeSaveTime})`
                      : '☁️ 15초 주기 실시간 드라이브 자동백업 작동 중'}
                  </span>
                </span>
              )}
            </div>

            {/* 현재 접속 기기 역할 전환 버튼 & 방송 녹화 / 방송 끄기 버튼 */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1.5 bg-gray-950 p-1 rounded-xl border border-gray-800">
                <button
                  type="button"
                  onClick={() => setDeviceRole('laptop')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    deviceRole === 'laptop'
                      ? 'bg-carrot text-white shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>1. 내 노트북 (화면 공유)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeviceRole('phone')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition ${
                    deviceRole === 'phone'
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-gray-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>2. 내 스마트폰 (영상/녹화)</span>
                </button>
              </div>

              <button
                type="button"
                onClick={startPhoneRecording}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition shadow-md ${
                  isRecording
                    ? 'bg-amber-500 text-gray-950 animate-pulse'
                    : 'bg-amber-500 hover:bg-amber-600 text-gray-950'
                }`}
              >
                <CircleDot className="w-4 h-4" />
                <span>{isRecording ? `⏺ 녹화 중 (${formatTimer(recordingSeconds)})` : '⏺ 방송 녹화'}</span>
              </button>

              <button
                type="button"
                onClick={handleTurnOffBroadcast}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-1.5 transition shadow-lg ring-2 ring-red-400/50"
              >
                <Power className="w-4 h-4" />
                <span>⏹ 방송 끄기</span>
              </button>
            </div>
          </div>

          {/* 기기별 제어 카드 */}
          {deviceRole === 'laptop' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 조건 1: 노트북 화면 공유 제어 */}
              <div className="p-4 rounded-2xl bg-gray-950/90 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Monitor className="w-4 h-4 text-carrot" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      조건 1. 내 노트북 화면 지정 공유
                    </h4>
                  </div>
                  {isScreenSharing && (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      화면 공유 송출 중
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  버튼을 누른 뒤 공유할 <strong>노트북 전체 화면, 특정 프로그램 창, 또는 크롬 탭</strong>을 지정하면 수강생들에게 실시간 송출됩니다.
                </p>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={startLaptopScreenShare}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-carrot hover:bg-blue-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md"
                  >
                    <Monitor className="w-4 h-4" />
                    <span>{isScreenSharing ? '💻 공유 화면 변경' : '💻 내 노트북 화면 공유 시작'}</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleTurnOffBroadcast}
                    className="py-2.5 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-md"
                  >
                    <Power className="w-4 h-4" />
                    <span>⏹ 방송 끄기</span>
                  </button>
                </div>
              </div>

              {/* 조건 2 연동: 와이파이 스마트폰 카메라 & 녹화기 QR 연결 */}
              <div className="p-4 rounded-2xl bg-gray-950/90 border border-gray-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs sm:text-sm font-bold text-white">
                      조건 2. 내 스마트폰 카메라 & 녹화 연결
                    </h4>
                  </div>
                  {hasRemoteCam && (
                    <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      스마트폰 연결됨
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  와이파이에 연결된 스마트폰으로 <strong>QR 코드를 스캔</strong>하면 스마트폰이 실시간 카메라 및 녹화기로 즉시 연결됩니다.
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md"
                  >
                    <QrCode className="w-4 h-4" />
                    <span>📱 스마트폰 QR 코드로 1초 연결</span>
                  </button>
                  <button
                    type="button"
                    onClick={copyPhoneUrl}
                    className="py-2.5 px-3 rounded-xl border border-gray-700 hover:bg-gray-800 text-gray-300 text-xs font-semibold flex items-center gap-1 transition"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? '복사됨' : '링크 복사'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            /* 스마트폰(카메라 송출 & 영상 녹화) 전용 제어판 */
            <div className="p-4 rounded-2xl bg-gray-950/90 border border-emerald-500/40 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-emerald-400" />
                  <h4 className="text-xs sm:text-sm font-bold text-white">
                    📱 내 스마트폰 실시간 영상 송출 & 스마트폰 직접 녹화
                  </h4>
                  {hasRemoteCam && !isCamStreaming && (
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      스마트폰 카메라 연결됨
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {isRecording && (
                    <span className="px-2.5 py-1 rounded-full bg-red-600 text-white text-xs font-black flex items-center gap-1.5 animate-pulse">
                      <CircleDot className="w-3.5 h-3.5" />
                      <span>REC {formatTimer(recordingSeconds)}</span>
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowQrModal(true)}
                    className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition shadow-sm"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                    <span>📱 내 스마트폰 연결 QR코드 보기</span>
                  </button>
                </div>
              </div>

              {/* 노트북에서 이 탭을 열었을 때의 친절한 안내 배너 */}
              {!isCamStreaming && (
                <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-500/30 text-xs text-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="leading-relaxed">
                    💡 <strong>스마트폰 연결 방법:</strong> 우측 상단의 <strong>[📱 내 스마트폰 연결 QR코드 보기]</strong>를 눌러 스마트폰 카메라로 스캔한 뒤, <strong>스마트폰 화면에서 아래 초록색 [송출 시작] 및 빨간색 [방송 끄기] 버튼</strong>을 눌러주세요!
                  </p>
                </div>
              )}

              {/* 스마트폰 카메라 시작/종료 및 전후면/마이크 제어 */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => startPhoneCameraStream(facingMode)}
                    className="flex-1 py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition shadow-md"
                  >
                    <Video className="w-4 h-4" />
                    <span>{isCamStreaming ? '📱 카메라 송출 중' : '📱 스마트폰 카메라 송출 시작'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleCameraFacing}
                    className="py-3 px-2.5 rounded-xl border border-gray-700 bg-gray-900 hover:bg-gray-800 text-xs font-semibold text-gray-200 flex items-center gap-1 shrink-0"
                    title="전면/후면 카메라 전환"
                  >
                    <Camera className="w-4 h-4 text-emerald-400" />
                    <span>{facingMode === 'user' ? '전면' : '후면'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleMic}
                    className={`py-3 px-2.5 rounded-xl border text-xs font-semibold flex items-center gap-1 shrink-0 ${
                      micEnabled
                        ? 'border-gray-700 bg-gray-900 text-gray-200'
                        : 'border-red-500/50 bg-red-950/50 text-red-300'
                    }`}
                    title="마이크 켜기/끄기"
                  >
                    {micEnabled ? <Mic className="w-4 h-4 text-emerald-400" /> : <MicOff className="w-4 h-4 text-red-400" />}
                  </button>
                </div>

                {/* 스마트폰 녹화 시작 버튼 */}
                <button
                  type="button"
                  onClick={startPhoneRecording}
                  className="py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-600 text-gray-950 text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-md"
                >
                  <CircleDot className="w-4 h-4" />
                  <span>{isRecording ? `⏺ 녹화 진행 중 (${formatTimer(recordingSeconds)})` : '⏺ 스마트폰 영상 녹화 시작'}</span>
                </button>

                {/* 방송 끄기 (구글 드라이브 저장 / 저장하지 않기 선택) 버튼 */}
                <button
                  type="button"
                  onClick={handleTurnOffBroadcast}
                  className="py-3 px-4 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center justify-center gap-2 transition shadow-lg ring-2 ring-red-400/50"
                >
                  <Power className="w-4 h-4" />
                  <span>⏹ 방송 끄기 (드라이브 다시보기 저장)</span>
                </button>
              </div>

              {/* 녹화 모드 선택 & 저장된 파일 다시 받기 */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-800 text-[11px] text-gray-400">
                <div className="flex items-center gap-2">
                  <span>녹화 방식:</span>
                  <button
                    type="button"
                    onClick={() => setRecordMode('cam')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      recordMode === 'cam' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    스마트폰 카메라 단독 녹화
                  </button>
                  <button
                    type="button"
                    onClick={() => setRecordMode('composite')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition ${
                      recordMode === 'composite' ? 'bg-emerald-600 text-white' : 'bg-gray-800 text-gray-400'
                    }`}
                  >
                    노트북 화면 + 스마트폰 PIP 합본 녹화
                  </button>
                </div>

                {recordedBlobUrl && (
                  <a
                    href={recordedBlobUrl}
                    download={recordedFileName || 'DrJ_라이브녹화본.webm'}
                    className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-bold flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>방금 녹화한 영상 스마트폰에 다시 저장</span>
                  </a>
                )}
              </div>
            </div>
          )}

          {/* 방식 2: 유튜브 라이브 주소 즉시 연결 바 */}
          {onSaveYoutubeLiveUrl && (
            <div className="pt-2 border-t border-gray-800 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex items-center gap-1.5 text-xs text-gray-300 font-semibold shrink-0">
                <Youtube className="w-4 h-4 text-red-500" />
                <span>유튜브 라이브 링크 연동:</span>
              </div>
              <input
                type="text"
                value={ytLiveInput}
                onChange={(e) => setYtLiveInput(e.target.value)}
                placeholder="https://youtube.com/live/... 또는 https://youtu.be/... 붙여넣기"
                className="flex-1 w-full bg-gray-950 border border-gray-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-carrot"
              />
              <button
                type="button"
                onClick={() => {
                  if (!ytLiveInput.trim()) {
                    alert('유튜브 라이브 주소를 입력해 주세요.');
                    return;
                  }
                  onSaveYoutubeLiveUrl(ytLiveInput.trim());
                  setYtLiveInput('');
                }}
                className="w-full sm:w-auto px-4 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shrink-0"
              >
                유튜브 라이브로 즉시 전환
              </button>
            </div>
          )}
        </div>
      )}

      {/* 2. 실시간 라이브 비디오 플레이어 영역 (노트북 화면 공유 + 스마트폰 카메라 PIP/분할) */}
      <div
        ref={playerContainerRef}
        className="w-full aspect-video relative bg-black flex items-center justify-center overflow-hidden select-none"
      >
        {!isAnyLive ? (
          <div className="text-center p-6 space-y-3 max-w-md">
            <div className="w-14 h-14 rounded-full bg-gray-900 border border-gray-800 flex items-center justify-center mx-auto text-carrot">
              <Radio className="w-7 h-7 animate-pulse" />
            </div>
            <h3 className="text-base font-bold text-white">{statusText}</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              {effectiveAdmin
                ? '상단의 [💻 내 노트북 화면 공유 시작] 또는 스마트폰에서 [📱 스마트폰 카메라 송출 시작] 버튼을 누르면 실시간 방송이 시작되며, [⏹ 방송 끄기]를 누르면 구글 드라이브 다시보기 저장 창이 나타납니다.'
                : '모임장(Dr. J)이 노트북 화면 공유 또는 스마트폰 라이브 방송을 시작하면 자동으로 화면이 나타납니다.'}
            </p>
            {effectiveAdmin && (
              <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={connectToBroadcasts}
                  className="px-4 py-2 rounded-xl bg-gray-800 hover:bg-gray-700 text-xs font-bold text-gray-200 inline-flex items-center gap-1.5 transition"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>방송 신호 다시 확인</span>
                </button>
                <button
                  type="button"
                  onClick={handleTurnOffBroadcast}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-xs font-extrabold text-white inline-flex items-center gap-1.5 transition shadow-md"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>⏹ 방송 끄기 (구글 드라이브 저장 선택)</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div
            className={`w-full h-full relative ${
              layoutMode === 'split' && showScreenStream && showCamStream
                ? 'grid grid-cols-1 sm:grid-cols-2 gap-1 bg-gray-900'
                : 'block'
            }`}
          >
            {/* ① 노트북 화면 공유 비디오 */}
            <video
              ref={screenVideoRef}
              autoPlay
              playsInline
              muted={isScreenSharing || viewerMuted}
              className={`${
                !showScreenStream || layoutMode === 'camOnly'
                  ? 'hidden'
                  : layoutMode === 'split' && showCamStream
                  ? 'w-full h-full object-contain bg-black'
                  : 'w-full h-full object-contain bg-black'
              }`}
            />

            {/* ② 스마트폰 카메라 비디오 (PIP 오버레이 또는 분할/단독) */}
            <video
              ref={camVideoRef}
              autoPlay
              playsInline
              muted={isCamStreaming || viewerMuted}
              className={`${
                !showCamStream || layoutMode === 'screenOnly'
                  ? 'hidden'
                  : layoutMode === 'pip' && showScreenStream
                  ? 'absolute bottom-4 right-4 w-36 sm:w-56 aspect-video object-cover rounded-2xl border-2 border-carrot shadow-2xl z-20 bg-gray-900'
                  : 'w-full h-full object-contain bg-black'
              }`}
            />

            {/* 좌측 상단 LIVE 상태 배지 & 방송 끄기 버튼 */}
            <div className="absolute top-3 left-3 right-3 z-30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg bg-red-600/90 backdrop-blur-xs text-white text-[11px] font-black flex items-center gap-1.5 shadow-md">
                  <span className="w-2 h-2 rounded-full bg-white animate-ping" />
                  LIVE
                </span>
                {showScreenStream && (
                  <span className="px-2 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-gray-200 text-[10px] font-semibold flex items-center gap-1">
                    <Monitor className="w-3 h-3 text-carrot" />
                    노트북 화면
                  </span>
                )}
                {showCamStream && (
                  <span className="px-2 py-1 rounded-lg bg-black/70 backdrop-blur-xs text-gray-200 text-[10px] font-semibold flex items-center gap-1">
                    <Smartphone className="w-3 h-3 text-emerald-400" />
                    스마트폰 카메라
                  </span>
                )}
              </div>

              {effectiveAdmin && (
                <button
                  type="button"
                  onClick={handleTurnOffBroadcast}
                  className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold flex items-center gap-1.5 shadow-lg border border-red-400/60"
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>⏹ 방송 끄기</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 3. 플레이어 하단 화면 배치(PIP / 분할 / 단독) 및 음소거·전체화면 컨트롤 바 */}
      <div className="px-4 py-3 bg-gray-900 border-t border-gray-800 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-gray-300">
          <span className={`w-2 h-2 rounded-full ${isAnyLive ? 'bg-red-500 animate-ping' : 'bg-gray-500'}`} />
          <span className="font-medium">{statusText}</span>
        </div>

        {effectiveAdmin && (
          <div className="flex flex-wrap items-center gap-1.5">
            {/* 화면 레이아웃 전환 버튼 */}
            <button
              type="button"
              onClick={() => setLayoutMode('pip')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                layoutMode === 'pip' ? 'bg-carrot text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="노트북 화면 크게 + 스마트폰 작은 창(PIP)"
            >
              <PictureInPicture2 className="w-3.5 h-3.5" />
              <span>PIP 합본</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('split')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition ${
                layoutMode === 'split' ? 'bg-carrot text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
              title="노트북 화면과 스마트폰 화면 50:50 나란히 보기"
            >
              <Columns className="w-3.5 h-3.5" />
              <span>50:50 분할</span>
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('screenOnly')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                layoutMode === 'screenOnly' ? 'bg-carrot text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              노트북만
            </button>
            <button
              type="button"
              onClick={() => setLayoutMode('camOnly')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                layoutMode === 'camOnly' ? 'bg-carrot text-white' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
              }`}
            >
              스마트폰만
            </button>

            {/* 수강생 소리 켜기/끄기 */}
            <button
              type="button"
              onClick={() => setViewerMuted(!viewerMuted)}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition"
              title={viewerMuted ? '소리 켜기' : '소리 끄기'}
            >
              {viewerMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
            </button>

            {/* 전체화면 */}
            <button
              type="button"
              onClick={handleFullScreen}
              className="p-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-200 transition"
              title="전체화면"
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* 하단 상시 노출 방송 끄기 버튼 */}
            <button
              type="button"
              onClick={handleTurnOffBroadcast}
              className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-[11px] font-extrabold flex items-center gap-1 transition shadow-sm"
            >
              <Power className="w-3.5 h-3.5" />
              <span>⏹ 방송 끄기</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. 스마트폰 1초 연결용 QR 코드 모달 */}
      {showQrModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => setShowQrModal(false)}
        >
          <div
            className="bg-white text-gray-900 rounded-3xl max-w-sm w-full p-6 shadow-2xl space-y-4 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 mx-auto flex items-center justify-center">
              <Smartphone className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-gray-950">
                내 스마트폰 카메라 & 녹화기 연결
              </h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                와이파이에 연결된 <strong>스마트폰 기본 카메라 앱</strong>으로 아래 QR 코드를 비추면 즉시 스마트폰 송출 및 녹화 모드로 연결됩니다.
              </p>
            </div>

            {phoneConnectUrl && (
              <div className="p-4 bg-gray-50 rounded-2xl border border-gray-200 inline-block mx-auto">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(
                    phoneConnectUrl
                  )}`}
                  alt="스마트폰 연결 QR 코드"
                  className="w-48 h-48 mx-auto rounded-lg"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={copyPhoneUrl}
                className="flex-1 py-2.5 rounded-xl border border-gray-300 hover:bg-gray-50 text-xs font-bold text-gray-700 flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copiedLink ? '연결 주소 복사 완료!' : '스마트폰 연결 주소 복사'}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowQrModal(false)}
                className="py-2.5 px-4 rounded-xl bg-gray-900 text-white text-xs font-bold"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. 방송 끄기 클릭 시 — 구글 드라이브(1dFvRKioEs7YtYYTp_EFk8H6YXi-V_EHo) 저장하기 vs 저장하지 않기 선택 모달 */}
      {showEndBroadcastModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs animate-fadeIn"
          onClick={() => {
            if (driveUploadStatus !== 'uploading') setShowEndBroadcastModal(false);
          }}
        >
          <div
            className="bg-white text-gray-900 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center shrink-0">
                <Power className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-gray-950">
                  라이브 방송이 종료되었습니다
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  방금 진행한 방송 영상을 구글 드라이브에 저장하여 <strong>다시보기</strong>로 등록할까요?
                </p>
              </div>
            </div>

            {/* 저장 대상 구글 드라이브 폴더 안내 박스 */}
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-blue-950 flex items-center gap-1.5">
                  <FolderUp className="w-4 h-4 text-carrot" />
                  <span>저장 대상 구글 드라이브 폴더</span>
                </span>
                <a
                  href={GOOGLE_DRIVE_FOLDER_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-carrot hover:underline flex items-center gap-1"
                >
                  <span>폴더 열기</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <p className="text-[11px] text-gray-600 break-all font-mono bg-white/80 px-2.5 py-1.5 rounded-lg border border-blue-100">
                {GOOGLE_DRIVE_FOLDER_URL}
              </p>
              <p className="text-[11px] text-blue-800">
                • <strong>구글 드라이브에 저장하기</strong>를 선택하면 위 폴더에 영상이 저장되며 본 강의실의 <strong>다시보기 영상</strong>으로 즉시 전환됩니다.
              </p>
            </div>

            {driveUploadStatus === 'idle' && (
              <div className="grid grid-cols-1 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleSaveToGoogleDrive}
                  className="w-full py-3.5 px-4 rounded-2xl bg-carrot hover:bg-blue-700 text-white text-sm font-extrabold flex items-center justify-center gap-2 transition shadow-lg"
                >
                  <FolderUp className="w-4 h-4" />
                  <span>1. 구글 드라이브에 저장하기 (다시보기 자동 등록)</span>
                </button>

                <button
                  type="button"
                  onClick={handleDiscardBroadcastRecording}
                  className="w-full py-3 px-4 rounded-2xl bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 border border-gray-200 text-xs font-bold flex items-center justify-center gap-2 transition"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>2. 저장하지 않기 (녹화본 삭제 및 그냥 종료)</span>
                </button>
              </div>
            )}

            {driveUploadStatus === 'uploading' && (
              <div className="p-5 rounded-2xl bg-gray-50 border border-gray-200 text-center space-y-3">
                <Loader2 className="w-8 h-8 text-carrot animate-spin mx-auto" />
                <p className="text-xs font-bold text-gray-800 leading-relaxed">
                  {driveUploadMessage}
                </p>
              </div>
            )}

            {driveUploadStatus === 'done' && (
              <div className="p-5 rounded-2xl bg-emerald-50 border border-emerald-200 text-center space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="text-xs font-extrabold text-emerald-900">
                  {driveUploadMessage}
                </p>
              </div>
            )}

            {driveUploadStatus === 'manual_link' && (
              <div className="space-y-3 pt-1">
                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
                  ✅ <strong>1단계 완료:</strong> 녹화 파일(<code>{recordedFileName || 'DrJ_다시보기.webm'}</code>)이 기기에 저장되었고 지정하신 <strong>구글 드라이브 폴더</strong>가 새 창으로 열렸습니다.
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-gray-800">
                    폴더에 업로드한 구글 드라이브 영상 링크 붙여넣기 (선택)
                  </label>
                  <input
                    type="text"
                    value={manualDriveLinkInput}
                    onChange={(e) => setManualDriveLinkInput(e.target.value)}
                    placeholder="https://drive.google.com/file/d/.../view 붙여넣기"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-gray-300 text-xs text-gray-900 focus:outline-none focus:border-carrot"
                  />
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmManualReplay}
                    className="flex-1 py-3 px-4 rounded-xl bg-carrot hover:bg-blue-700 text-white text-xs font-extrabold flex items-center justify-center gap-1.5 transition shadow-md"
                  >
                    <PlayCircle className="w-4 h-4" />
                    <span>다시보기 영상으로 즉시 적용하기</span>
                  </button>
                  <a
                    href={GOOGLE_DRIVE_FOLDER_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="py-3 px-4 rounded-xl border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-bold flex items-center justify-center gap-1"
                  >
                    <span>구글 드라이브 폴더 다시 열기</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
