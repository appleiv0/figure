import React, { Suspense, useState, useEffect, useRef, useCallback, useDeferredValue } from 'react';
import { Canvas, useThree } from '@react-three/fiber';
import { Environment, ContactShadows, useGLTF } from '@react-three/drei';
import DeskModel from '../../atoms/DeskModel';
import Figure3D from '../../atoms/Figure3D';
import { FigureInstance, Figure3DType, FiguresConfig, DollPose, DollInstanceData, DOLL_MODELS } from '../../../types/figure3d';
import * as THREE from 'three';
import axios from 'axios';
import { getItemLocalStorage } from '../../../utils/helper';
import { USER } from '../../../constants/common.constant';

// gl 인스턴스를 외부 ref에 저장하는 헬퍼 컴포넌트
function GlCapture({ glRef, cameraRef }: { glRef: React.MutableRefObject<THREE.WebGLRenderer | null>; cameraRef: React.MutableRefObject<THREE.Camera | null> }) {
  const { gl, camera } = useThree();
  useEffect(() => {
    glRef.current = gl;
    cameraRef.current = camera;
  }, [gl, camera, glRef, cameraRef]);
  return null;
}

// 카메라 설정 컴포넌트
function CameraSetup() {
  const { camera } = useThree();

  useEffect(() => {
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0.3, 0);
  }, [camera]);

  return null;
}

// 인형 충돌 반지름 (size 기반)
function getCollisionRadius(fig: Figure3DType): number {
  return fig.size * 0.1;
}

// 충돌 감지: 새 위치가 다른 인형과 겹치는지 확인
function resolveCollision(
  movingId: string,
  newX: number,
  newZ: number,
  instances: FigureInstance[]
): [number, number] {
  const moving = instances.find(i => i.id === movingId);
  if (!moving) return [newX, newZ];

  const movingRadius = getCollisionRadius(moving.figureType);

  for (const other of instances) {
    if (other.id === movingId) continue;

    const otherRadius = getCollisionRadius(other.figureType);
    const minDist = movingRadius + otherRadius;

    const dx = newX - other.position.x;
    const dz = newZ - other.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < minDist && dist > 0.001) {
      // 밀어내기: 최소 거리만큼 떨어지도록 보정
      const pushX = (dx / dist) * minDist;
      const pushZ = (dz / dist) * minDist;
      newX = other.position.x + pushX;
      newZ = other.position.z + pushZ;
    } else if (dist <= 0.001) {
      // 완전히 같은 위치면 살짝 밀기
      newX += minDist;
    }
  }

  return [newX, newZ];
}

// 스폰용 충돌 반지름 (드래그보다 넓게)
function getSpawnRadius(fig: Figure3DType): number {
  return fig.size * 0.45;
}

// 빈 자리 찾기 (스폰용) - 기존 인형들보다 앞쪽(+Z, 카메라 가까이)에 배치
function findEmptySpot(instances: FigureInstance[], fig: Figure3DType): { x: number; z: number } {
  const radius = getSpawnRadius(fig);
  if (instances.length === 0) return { x: 0, z: 0 };

  // 기존 인형 중 가장 앞쪽(+Z) 위치 찾기
  const maxZ = Math.max(...instances.map(inst => inst.position.z));
  const startZ = maxZ + radius * 2;

  // 앞쪽부터 좌우로 빈 자리 탐색
  for (let dz = 0; dz <= 3; dz += 0.2) {
    for (let dx = 0; dx <= 3; dx += 0.2) {
      const candidates = dx === 0 ? [{ x: 0, z: startZ + dz }] : [
        { x: dx, z: startZ + dz },
        { x: -dx, z: startZ + dz },
      ];
      for (const pos of candidates) {
        let collides = false;
        for (const inst of instances) {
          const otherRadius = getSpawnRadius(inst.figureType);
          const ddx = pos.x - inst.position.x;
          const ddz = pos.z - inst.position.z;
          if (Math.sqrt(ddx * ddx + ddz * ddz) < radius + otherRadius) {
            collides = true;
            break;
          }
        }
        if (!collides) return pos;
      }
    }
  }
  return { x: 0, z: startZ };
}

const FAMILY_ROLES = ['나', '엄마', '아빠', '남편', '아내', '아들', '딸', '언니', '누나', '오빠', '형', '남동생', '여동생', '할아버지', '할머니', '삼촌', '이모', '고모', '기타'];

interface DeskScene3DProps {
  onNext?: (canvasImage: string, dollInstances: DollInstanceData[]) => void;
  initialDollInstances?: DollInstanceData[];
  readOnly?: boolean;
  phase?: number;
  onPhaseChange?: (phase: number) => void;
}

export default function DeskScene3D({ onNext, initialDollInstances, readOnly, phase = 2, onPhaseChange }: DeskScene3DProps = {}) {
  const [figures, setFigures] = useState<Figure3DType[]>([]);
  const [instances, setInstances] = useState<FigureInstance[]>([]);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 768);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDollPicker, setShowDollPicker] = useState(false);
  const [showRolePicker, setShowRolePicker] = useState(false);
  const [pendingFigure, setPendingFigure] = useState<{ id: string; fig: Figure3DType } | null>(null);
  const [customRole, setCustomRole] = useState('');
  const canvasRef = useRef<HTMLDivElement>(null);
  const glRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.Camera | null>(null);
  const touchDragEnabled = useRef(false);
  const touchStartTime = useRef(0);
  const instancesRef = useRef<FigureInstance[]>([]);
  instancesRef.current = instances;
  const autoSaveTimerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setIsDesktop(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const captureCanvas = useCallback(() => {
    if (!glRef.current) return '';
    const glCanvas = glRef.current.domElement;
    const w = glCanvas.width;
    const h = glCanvas.height;
    const offscreen = document.createElement('canvas');
    offscreen.width = w;
    offscreen.height = h;
    const ctx = offscreen.getContext('2d');
    if (ctx && cameraRef.current) {
      ctx.drawImage(glCanvas, 0, 0);
      const camera = cameraRef.current as THREE.PerspectiveCamera;
      instancesRef.current.forEach(inst => {
        const labelHeight = inst.figureType.size * (inst.pose === 'sit' ? 1.6 : 2.15);
        const pos3 = new THREE.Vector3(inst.position.x, labelHeight, inst.position.z);
        pos3.project(camera);
        const sx = (pos3.x * 0.5 + 0.5) * w;
        const sy = (-pos3.y * 0.5 + 0.5) * h;
        const fontSize = Math.round(w / 30);
        ctx.font = `bold ${fontSize}px sans-serif`;
        ctx.textAlign = 'center';
        const text = inst.figureType.label;
        const metrics = ctx.measureText(text);
        const pw = 6, ph = 4;
        ctx.fillStyle = 'rgba(0,0,0,0.55)';
        const rx = sx - metrics.width / 2 - pw;
        const ry = sy - fontSize / 2 - ph;
        const rw = metrics.width + pw * 2;
        const rh = fontSize + ph * 2;
        ctx.beginPath();
        if (ctx.roundRect) { ctx.roundRect(rx, ry, rw, rh, 6); } else { ctx.rect(rx, ry, rw, rh); }
        ctx.fill();
        ctx.fillStyle = '#ffffff';
        ctx.fillText(text, sx, sy + fontSize / 3);
      });
      return offscreen.toDataURL('image/png');
    }
    if (ctx) {
      ctx.drawImage(glCanvas, 0, 0);
      return offscreen.toDataURL('image/png');
    }
    return glCanvas.toDataURL('image/png');
  }, []);

  const autoSaveCanvas = useCallback(() => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(async () => {
      try {
        const user = getItemLocalStorage(USER);
        const receiptNo = user?.receiptNo;
        if (!receiptNo) return;

        const canvasImage = captureCanvas();
        if (!canvasImage) return;

        const apiBase = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || '/api';
        await axios.post(`${apiBase}/public/auto-save-canvas`, { receiptNo, canvasImage });
      } catch (e) {
        // Silent fail for auto-save
      }
    }, 2000);
  }, [captureCanvas]);

  // Load figures configuration + preload all models
  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}figures/figures.json`)
      .then(res => res.json())
      .then((config: FiguresConfig) => {
        const enabledFigures = config.figures.filter(f => f.enabled);
        setFigures(enabledFigures);
        if (phase >= 2) setShowDollPicker(true);
        // 모든 모델 프리로드 (stand + sit)
        enabledFigures.forEach(fig => {
          const dollKey = fig.dollModel || 'adult_male';
          const m = DOLL_MODELS[dollKey];
          if (m?.stand) useGLTF.preload(m.stand);
          if (m?.sit) useGLTF.preload(m.sit);
        });
      })
      .catch(err => console.error('Failed to load figures config:', err));
  }, []);

  // 저장된 인형 데이터로 씬 복원
  useEffect(() => {
    if (!initialDollInstances || initialDollInstances.length === 0) return;
    const restored: FigureInstance[] = initialDollInstances.map((doll, idx) => ({
      id: `restored-${doll.dollModel}-${idx}`,
      figureType: {
        id: doll.dollModel,
        enabled: true,
        label: doll.label,
        category: 'adult' as const,
        gender: 'male' as const,
        variant: 1 as const,
        size: doll.size,
        hasImages: true,
        dollModel: doll.dollModel,
      },
      position: { ...doll.position },
      rotation: doll.rotation ?? 0,
      selected: false,
      pose: doll.pose as DollPose,
      dragCount: doll.dragCount || 0,
      initialPosition: doll.initialPosition ? { ...doll.initialPosition } : { ...doll.position },
      rotationChanged: doll.rotationChanged || false,
      poseChanged: doll.poseChanged || false,
      sizeChanged: doll.sizeChanged || false,
      interactionCount: doll.interactionCount || 0,
    }));
    setInstances(restored);
    // 모델 프리로드
    restored.forEach(inst => {
      const m = DOLL_MODELS[inst.figureType.dollModel || 'adult_male'];
      if (m?.stand) useGLTF.preload(m.stand);
      if (m?.sit) useGLTF.preload(m.sit);
    });
  }, [initialDollInstances]);

  const handleAddFigure = useCallback((fig: Figure3DType) => {
    const newId = `${fig.id}-${Date.now()}`;
    // 인형 추가 후 역할 선택 팝업 표시
    setPendingFigure({ id: newId, fig });
    setShowDollPicker(false);
    setShowRolePicker(true);
    setCustomRole('');
  }, []);

  const handleRoleSelect = useCallback((role: string) => {
    if (!pendingFigure) return;
    const { id, fig } = pendingFigure;
    const labeledFig = { ...fig, label: role };
    setInstances(prev => {
      const spot = findEmptySpot(prev, fig);
      const spawnPos = { x: spot.x, y: 0.01, z: spot.z };
      const newInstance: FigureInstance = {
        id,
        figureType: labeledFig,
        position: { ...spawnPos },
        rotation: 0,
        selected: true,
        pose: 'stand',
        dragCount: 0,
        initialPosition: { ...spawnPos },
        rotationChanged: false,
        poseChanged: false,
        sizeChanged: false,
        interactionCount: 0,
      };
      return [...prev.map(inst => ({ ...inst, selected: false })), newInstance];
    });
    setSelectedId(id);
    setShowRolePicker(false);
    setPendingFigure(null);
    autoSaveCanvas();
  }, [pendingFigure, autoSaveCanvas]);

  const handleRemoveFigure = useCallback(() => {
    if (!selectedId) return;
    setInstances(prev => prev.filter(inst => inst.id !== selectedId));
    setSelectedId(null);
    autoSaveCanvas();
  }, [selectedId, autoSaveCanvas]);

  const handleSelectFigure = (id: string) => {
    setSelectedId(id);
    setInstances(prev => prev.map(inst => ({
      ...inst,
      selected: inst.id === id
    })));
  };

  const handleRotate = (id: string, angle: number) => {
    setInstances(prev => prev.map(inst =>
      inst.id === id ? {
        ...inst,
        rotation: angle,
        rotationChanged: true,
        interactionCount: (inst.interactionCount || 0) + 1,
      } : inst
    ));
  };

  const handlePositionChange = useCallback((id: string, position: [number, number, number]) => {
    setInstances(prev => {
      const [resolvedX, resolvedZ] = resolveCollision(id, position[0], position[2], prev);
      return prev.map(inst =>
        inst.id === id ? { ...inst, position: { x: resolvedX, y: position[1], z: resolvedZ } } : inst
      );
    });
  }, []);

  const handleDragEnd = useCallback((id: string) => {
    setInstances(prev => prev.map(inst =>
      inst.id === id ? {
        ...inst,
        dragCount: (inst.dragCount || 0) + 1,
        interactionCount: (inst.interactionCount || 0) + 1,
      } : inst
    ));
    autoSaveCanvas();
  }, [autoSaveCanvas]);

  const handleTogglePose = () => {
    if (!selectedId) return;
    setInstances(prev => prev.map(inst =>
      inst.id === selectedId
        ? {
            ...inst,
            pose: inst.pose === 'stand' ? 'sit' : 'stand',
            poseChanged: true,
            interactionCount: (inst.interactionCount || 0) + 1,
          }
        : inst
    ));
    autoSaveCanvas();
  };

  const handleDeselectAll = () => {
    setSelectedId(null);
    setInstances(prev => prev.map(inst => ({ ...inst, selected: false })));
  };

  const handleComplete = useCallback(() => {
    if (!onNext) return;
    if (instancesRef.current.length === 0) {
      alert("가족 인형을 최소 1개 이상 배치해 주세요.");
      return;
    }
    // 선택 해제 후 스크린샷 캡처
    setSelectedId(null);
    setInstances(prev => prev.map(inst => ({ ...inst, selected: false })));
    // 약간의 딜레이 후 캡처 (선택 테두리 제거 반영)
    setTimeout(() => {
      let canvasImage = '';
      if (glRef.current) {
        const glCanvas = glRef.current.domElement;
        const w = glCanvas.width;
        const h = glCanvas.height;
        // 2D 캔버스에 WebGL 스크린샷 + 라벨 그리기
        const offscreen = document.createElement('canvas');
        offscreen.width = w;
        offscreen.height = h;
        const ctx = offscreen.getContext('2d');
        if (ctx && cameraRef.current) {
          ctx.drawImage(glCanvas, 0, 0);
          const camera = cameraRef.current as THREE.PerspectiveCamera;
          // 각 인형 위에 라벨 그리기
          instancesRef.current.forEach(inst => {
            const labelHeight = inst.figureType.size * (inst.pose === 'sit' ? 1.6 : 2.15);
            const pos3 = new THREE.Vector3(inst.position.x, labelHeight, inst.position.z);
            pos3.project(camera);
            const sx = (pos3.x * 0.5 + 0.5) * w;
            const sy = (-pos3.y * 0.5 + 0.5) * h;
            const fontSize = Math.round(w / 30);
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.textAlign = 'center';
            const text = inst.figureType.label;
            const metrics = ctx.measureText(text);
            const pw = 6;
            const ph = 4;
            ctx.fillStyle = 'rgba(0,0,0,0.55)';
            const rx = sx - metrics.width / 2 - pw;
            const ry = sy - fontSize / 2 - ph;
            const rw = metrics.width + pw * 2;
            const rh = fontSize + ph * 2;
            ctx.beginPath();
            if (ctx.roundRect) {
              ctx.roundRect(rx, ry, rw, rh, 6);
            } else {
              ctx.rect(rx, ry, rw, rh);
            }
            ctx.fill();
            ctx.fillStyle = '#ffffff';
            ctx.fillText(text, sx, sy + fontSize / 3);
          });
          canvasImage = offscreen.toDataURL('image/png');
        } else {
          canvasImage = glCanvas.toDataURL('image/png');
        }
      }
      // 인형 인스턴스 데이터 직렬화
      const dollInstances: DollInstanceData[] = instancesRef.current.map(inst => ({
        dollModel: inst.figureType.dollModel || 'adult_male',
        label: inst.figureType.label,
        pose: inst.pose,
        rotation: inst.rotation ?? 0,
        position: { ...inst.position },
        size: inst.figureType.size,
        dragCount: inst.dragCount || 0,
        initialPosition: inst.initialPosition ? { ...inst.initialPosition } : { ...inst.position },
        rotationChanged: inst.rotationChanged || false,
        poseChanged: inst.poseChanged || false,
        sizeChanged: inst.sizeChanged || false,
        interactionCount: inst.interactionCount || 0,
      }));
      onNext(canvasImage, dollInstances);
    }, 200);
  }, [onNext]);

  const selectedInstance = instances.find(inst => inst.id === selectedId);
  const deferredInstances = useDeferredValue(instances);

  // Canvas 레벨 터치 이벤트 처리
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (_e: TouchEvent) => {
      if (!selectedId) return;
      touchStartTime.current = Date.now();
      touchDragEnabled.current = false;
      setTimeout(() => {
        if (Date.now() - touchStartTime.current >= 500 && selectedId) {
          touchDragEnabled.current = true;
        }
      }, 500);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchDragEnabled.current || !selectedId) return;
      e.preventDefault();
      const touch = e.touches[0];
      const rect = canvas.getBoundingClientRect();
      const x = ((touch.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -((touch.clientY - rect.top) / rect.height) * 2 + 1;
      const worldX = x * 1.5;
      const worldZ = -y * 1.5;
      handlePositionChange(selectedId, [worldX, 0.01, worldZ]);
    };

    const handleTouchEnd = () => {
      if (touchDragEnabled.current && selectedId) {
        handleDragEnd(selectedId);
      }
      touchDragEnabled.current = false;
      touchStartTime.current = 0;
    };

    canvas.addEventListener('touchstart', handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', handleTouchEnd);
    canvas.addEventListener('touchcancel', handleTouchEnd);

    return () => {
      canvas.removeEventListener('touchstart', handleTouchStart);
      canvas.removeEventListener('touchmove', handleTouchMove);
      canvas.removeEventListener('touchend', handleTouchEnd);
      canvas.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [selectedId, handlePositionChange, handleDragEnd]);

  return (
    <div style={{ width: '100dvw', height: '100dvh', background: '#1a1a1a', display: 'flex', justifyContent: 'center' }}>
    <div ref={canvasRef} style={{ width: '100%', maxWidth: isDesktop ? 430 : undefined, height: '100dvh', background: '#f0ebe3', touchAction: 'none', position: 'relative' }}>
      <Canvas
        shadows
        dpr={[1, 2]}
        onPointerMissed={handleDeselectAll}
        style={{ width: '100%', height: '100%', background: '#f0ebe3' }}
        gl={{
          antialias: true,
          preserveDrawingBuffer: true,
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        camera={{
          position: [0, 3, 8],
          fov: 33
        }}
      >
        <CameraSetup />
        <GlCapture glRef={glRef} cameraRef={cameraRef} />
        <ambientLight intensity={0.9} />
        <directionalLight
          castShadow
          position={[3, 5, 4]}
          intensity={1.2}
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
          shadow-camera-left={-3}
          shadow-camera-right={3}
          shadow-camera-top={3}
          shadow-camera-bottom={-3}
          shadow-camera-near={0.1}
          shadow-camera-far={20}
        />
        <pointLight position={[-2, 2, 2]} intensity={0.4} />
        <Environment preset="apartment" />

        {phase >= 2 && <DeskModel />}

        {deferredInstances.map(instance => (
          <Suspense key={instance.id} fallback={null}>
            <Figure3D
              figureType={instance.figureType}
              position={[instance.position.x, instance.position.y, instance.position.z]}
              rotation={instance.rotation}
              scale={instance.figureType.size * 0.9}
              selected={instance.selected && !showRolePicker}
              pose={instance.pose}
              onSelect={() => handleSelectFigure(instance.id)}
              onRotate={(angle) => handleRotate(instance.id, angle)}
              onPositionChange={(position) => handlePositionChange(instance.id, position)}
              onDragEnd={() => handleDragEnd(instance.id)}
              onResolvePosition={(x, z) => resolveCollision(instance.id, x, z, instancesRef.current)}
            />
          </Suspense>
        ))}

        <ContactShadows position={[0, 0.011, 0]} opacity={0.4} blur={2} far={4} />
      </Canvas>

      {/* 상단 툴바 (readOnly일 때 숨김) */}
      {!readOnly && (
        <div style={{
          position: 'absolute',
          top: phase >= 2 ? 12 : 130,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'flex-start',
          gap: 8,
          zIndex: 10,
          padding: '0 12px',
          flexWrap: 'wrap',
        }}>
          {/* 인형 추가 버튼 (phase 2에서만 표시) */}
          {phase >= 2 && (
            <button
              onClick={() => setShowDollPicker(!showDollPicker)}
              style={{
                padding: '8px 20px',
                fontSize: 15,
                fontWeight: 'bold',
                background: showDollPicker ? '#fff' : 'rgba(0,0,0,0.8)',
                color: showDollPicker ? '#333' : 'white',
                border: '2px solid white',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              + 가족 추가
            </button>
          )}

          {/* 자세 토글 */}
          {selectedInstance && (
            <button
              onClick={handleTogglePose}
              style={{
                padding: '8px 20px',
                fontSize: 15,
                fontWeight: 'bold',
                background: 'rgba(0,0,0,0.8)',
                color: 'white',
                border: '2px solid white',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              {selectedInstance.pose === 'stand' ? '앉음' : '선다'}
            </button>
          )}

          {/* 삭제 버튼 */}
          {selectedInstance && (
            <button
              onClick={handleRemoveFigure}
              style={{
                padding: '8px 20px',
                fontSize: 15,
                fontWeight: 'bold',
                background: 'rgba(180,30,30,0.9)',
                color: 'white',
                border: '2px solid white',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              삭제
            </button>
          )}

        </div>
      )}

      {/* 인형 선택 패널 (phase 2에서만) */}
      {!readOnly && phase >= 2 && showDollPicker && !showRolePicker && (
        <div style={{
          position: 'absolute',
          top: 54,
          left: 8,
          right: 8,
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))',
          gap: 6,
          background: 'rgba(0,0,0,0.85)',
          padding: '10px',
          borderRadius: 12,
          zIndex: 10,
        }}>
          {figures.map(fig => (
            <button
              key={fig.id}
              onClick={() => handleAddFigure(fig)}
              style={{
                padding: '8px 4px',
                fontSize: 13,
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.3)',
                borderRadius: 8,
                cursor: 'pointer',
                fontFamily: 'sans-serif',
                transition: 'background 0.2s',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.3)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.15)')}
            >
              {fig.label}
            </button>
          ))}
        </div>
      )}

      {/* 가족 구성원 선택 팝업 */}
      {showRolePicker && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
        }}>
          <div style={{
            background: 'white',
            borderRadius: 16,
            padding: '20px',
            width: '90%',
            maxWidth: 360,
            maxHeight: '80vh',
            overflowY: 'auto',
          }}>
            <h3 style={{ fontSize: 16, fontWeight: 'bold', textAlign: 'center', marginBottom: 16, fontFamily: 'sans-serif' }}>
              이 인형은 누구인가요?
            </h3>
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 8,
            }}>
              {FAMILY_ROLES.filter(r => r !== '기타').map(role => (
                <button
                  key={role}
                  onClick={() => handleRoleSelect(role)}
                  style={{
                    padding: '10px 4px',
                    fontSize: 14,
                    fontWeight: 'bold',
                    background: '#f3f4f6',
                    border: '2px solid #e5e7eb',
                    borderRadius: 10,
                    cursor: 'pointer',
                    fontFamily: 'sans-serif',
                    transition: 'all 0.2s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#2EB500'; e.currentTarget.style.color = 'white'; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#f3f4f6'; e.currentTarget.style.color = 'black'; }}
                >
                  {role}
                </button>
              ))}
            </div>
            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={customRole}
                onChange={e => setCustomRole(e.target.value)}
                placeholder="기타 (직접 입력)"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  fontSize: 14,
                  border: '2px solid #e5e7eb',
                  borderRadius: 10,
                  outline: 'none',
                  fontFamily: 'sans-serif',
                }}
                onKeyDown={e => {
                  if (e.key === 'Enter' && customRole.trim()) {
                    handleRoleSelect(customRole.trim());
                  }
                }}
              />
              <button
                onClick={() => customRole.trim() && handleRoleSelect(customRole.trim())}
                disabled={!customRole.trim()}
                style={{
                  padding: '10px 16px',
                  fontSize: 14,
                  fontWeight: 'bold',
                  background: customRole.trim() ? '#2EB500' : '#ccc',
                  color: 'white',
                  border: 'none',
                  borderRadius: 10,
                  cursor: customRole.trim() ? 'pointer' : 'default',
                  fontFamily: 'sans-serif',
                }}
              >
                확인
              </button>
            </div>
            <button
              onClick={() => { setShowRolePicker(false); setPendingFigure(null); }}
              style={{
                marginTop: 12,
                width: '100%',
                padding: '8px',
                fontSize: 13,
                color: '#999',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 캐릭터 안내 (Intro4 스타일, phase 1에서만) */}
      {!readOnly && onNext && phase === 1 && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
        }}>
          <div style={{
            position: 'relative',
            background: '#FFFBE3',
            border: '1px solid #FDE68A',
            borderRadius: 16,
            padding: '12px 18px',
            fontSize: 17,
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
            textAlign: 'center',
            whiteSpace: 'pre-line',
            marginBottom: 8,
            maxWidth: '90%',
          }}>
            <div style={{
              position: 'absolute',
              bottom: -7,
              left: '50%',
              transform: 'translateX(-50%) rotate(45deg)',
              width: 14,
              height: 14,
              background: '#FFFBE3',
              borderRight: '1px solid #FDE68A',
              borderBottom: '1px solid #FDE68A',
            }} />
            {phase === 1
              ? '가족을 선택해서 원하는 위치에 세워보세요.\n인형을 드래그하면 위치를 옮길 수 있습니다.\n화살표를 클릭하면 360도 회전합니다.\n앉음 버튼을 클릭하면 사람을 앉힐 수 있습니다.'
              : '가족을 추가하세요.'}
          </div>
          <img src={`${import.meta.env.BASE_URL}assets/images/01.png`} alt="purum" style={{ width: 56, marginTop: 10 }} />
        </div>
      )}

      {/* 하단 버튼 */}
      {!readOnly && onNext && (
        <div style={{
          position: 'absolute',
          bottom: 12,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
        }}>
          {phase === 1 ? (
            <button
              onClick={() => onPhaseChange?.(2)}
              style={{
                padding: '10px 28px',
                fontSize: 16,
                fontWeight: 'bold',
                background: '#2EB500',
                color: 'white',
                border: '2px solid white',
                borderRadius: 10,
                cursor: 'pointer',
                fontFamily: 'sans-serif',
              }}
            >
              확인
            </button>
          ) : (
            <button
              onClick={handleComplete}
              disabled={instances.length === 0}
              style={{
                padding: '10px 28px',
                fontSize: 16,
                fontWeight: 'bold',
                background: instances.length === 0 ? '#aaa' : '#2EB500',
                color: 'white',
                border: '2px solid white',
                borderRadius: 10,
                cursor: instances.length === 0 ? 'not-allowed' : 'pointer',
                fontFamily: 'sans-serif',
                opacity: instances.length === 0 ? 0.6 : 1,
              }}
            >
              검사완료
            </button>
          )}
        </div>
      )}
    </div>
    </div>
  );
}
