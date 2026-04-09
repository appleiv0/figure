import { useEffect, useMemo, useRef, useState } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { GLTFLoader } from 'three-stdlib';
import { Figure3DType, DollPose, DOLL_MODELS } from '../../../types/figure3d';

const POSE_CONFIG: Record<DollPose, { bottomZ: number; scaleMultiplier: number; baseRotation: number }> = {
  stand: { bottomZ: 1.05, scaleMultiplier: 0.5, baseRotation: -(Math.PI / 2) },
  sit:   { bottomZ: 0.97, scaleMultiplier: 0.4, baseRotation: -(Math.PI * 85 / 180) },
};

// 모델별 bottomZ 보정 (기본값과 다른 모델만)
const BOTTOM_OVERRIDE: Record<string, Partial<Record<DollPose, number>>> = {
  infant:       { stand: 1.15, sit: 1.10 },
  baby:         { stand: 1.15, sit: 1.10 },
  child_female: { sit: 0.75 },
};

// 모델별 scaleMultiplier 보정
const SCALE_OVERRIDE: Record<string, Partial<Record<DollPose, number>>> = {
  adult_female: { sit: 0.34 },  // 기본 0.4에서 15% 축소
};

// 모델별 중심 오프셋 보정 (회전/링/라벨 중심) - [x, z]
const CENTER_OVERRIDE: Record<string, [number, number]> = {};

export interface MaterialSettings {
  roughness: number;
  metalness: number;
  envMapIntensity: number;
  emissiveIntensity: number;
}

interface Props {
  figureType: Figure3DType;
  position: [number, number, number];
  rotation: number;
  scale: number;
  selected: boolean;
  pose?: DollPose;
  material?: MaterialSettings;
  isMe?: boolean;
  onSelect: () => void;
  onRotate: (angle: number) => void;
  onPositionChange: (position: [number, number, number]) => void;
  onDragEnd?: () => void;
  onResolvePosition?: (x: number, z: number) => [number, number];
}

const DEFAULT_MATERIAL: MaterialSettings = { roughness: 0.55, metalness: 0.0, envMapIntensity: 0.8, emissiveIntensity: 0.0 };

export default function Figure3D({
  figureType,
  position,
  rotation,
  scale,
  selected,
  pose = 'stand',
  material = DEFAULT_MATERIAL,
  isMe = false,
  onSelect,
  onRotate,
  onPositionChange,
  onDragEnd,
  onResolvePosition
}: Props) {
  const { camera, gl, raycaster } = useThree();
  const groupRef = useRef<THREE.Group>(null);
  const longPressTimer = useRef<NodeJS.Timeout | null>(null);
  const isDraggingRef = useRef(false);
  const dragOffset = useRef(new THREE.Vector3());
  const dragPos = useRef<[number, number, number] | null>(null);
  const onPositionChangeRef = useRef(onPositionChange);
  onPositionChangeRef.current = onPositionChange;
  const onDragEndRef = useRef(onDragEnd);
  onDragEndRef.current = onDragEnd;
  const onResolvePositionRef = useRef(onResolvePosition);
  onResolvePositionRef.current = onResolvePosition;

  // 재사용 벡터 (인스턴스별)
  const mouseVec = useRef(new THREE.Vector2());
  const planeConst = useRef(new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.01));
  const hitVec = useRef(new THREE.Vector3());

  const dollKey = figureType.dollModel || 'adult_male';
  const models = DOLL_MODELS[dollKey];

  // 초기 모델만 useGLTF로 로드 (Suspense 1회만)
  const initialPoseRef = useRef(pose);
  const initialModelPath = models?.[initialPoseRef.current] || figureType.modelPath || `/figures/${figureType.id}.glb`;
  const { scene: initialScene } = useGLTF(initialModelPath);

  // 포즈 전환: GLTFLoader로 직접 로드 (Suspense 안 걸림)
  const [activeScene, setActiveScene] = useState(initialScene);
  const [renderedPose, setRenderedPose] = useState(pose);
  const sceneCacheRef = useRef<Record<string, THREE.Group>>({});
  sceneCacheRef.current[initialPoseRef.current] = initialScene;

  useEffect(() => {
    // 이미 캐시에 있으면 즉시 전환
    if (sceneCacheRef.current[pose]) {
      setActiveScene(sceneCacheRef.current[pose]);
      setRenderedPose(pose);
      return;
    }
    // 없으면 직접 로드 (현재 인형+파라미터 유지, 로드 완료 후 전환)
    const newPath = models?.[pose] || figureType.modelPath || `/figures/${figureType.id}.glb`;
    const loader = new GLTFLoader();
    loader.load(newPath, (gltf) => {
      sceneCacheRef.current[pose] = gltf.scene;
      setActiveScene(gltf.scene);
      setRenderedPose(pose);
    });
  }, [pose]);

  // 대체 포즈 미리 로드
  useEffect(() => {
    const altPose = pose === 'stand' ? 'sit' : 'stand';
    if (sceneCacheRef.current[altPose]) return;
    const altPath = models?.[altPose];
    if (!altPath) return;
    const loader = new GLTFLoader();
    loader.load(altPath, (gltf) => {
      sceneCacheRef.current[altPose] = gltf.scene;
    });
  }, [pose, models]);

  // 렌더 파라미터는 실제 로드된 포즈 기준 (모델과 불일치 방지)
  const poseScale = scale * (SCALE_OVERRIDE[dollKey]?.[renderedPose] ?? POSE_CONFIG[renderedPose].scaleMultiplier);

  const model = useMemo(() => {
    const cloned = activeScene.clone(true);
    cloned.traverse((child: any) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
        child.material = child.material.clone();
        child.material.emissive = new THREE.Color(0xffffff);
      }
    });
    return cloned;
  }, [activeScene]);

  // 모델 중심 오프셋 계산 (모델 로컬 좌표에서, 캐시)
  const modelContainerRef = useRef<THREE.Group>(null);
  const centerCacheRef = useRef<Record<string, [number, number]>>({});
  const autoCenter = useMemo(() => {
    const cacheKey = `${dollKey}_${pose}`;
    if (centerCacheRef.current[cacheKey]) return centerCacheRef.current[cacheKey];
    // 모델의 XY 중심 계산 (Z-up 모델 공간) → 회전 후 XZ 오프셋
    const box = new THREE.Box3().setFromObject(model);
    const cx = (box.min.x + box.max.x) / 2;
    const cy = (box.min.y + box.max.y) / 2;
    // -PI/2 X회전 후: 모델X→월드X, 모델Y→월드Z (부호 반전)
    // Y회전(baseRotation)도 적용
    const baseRot = POSE_CONFIG[renderedPose].baseRotation;
    const worldOffsetX = cx * Math.cos(baseRot) - (-cy) * Math.sin(baseRot);
    const worldOffsetZ = cx * Math.sin(baseRot) + (-cy) * Math.cos(baseRot);
    const result: [number, number] = [worldOffsetX * poseScale, worldOffsetZ * poseScale];
    centerCacheRef.current[cacheKey] = result;
    return result;
  }, [model, dollKey, renderedPose, poseScale]);
  const modelCenter = CENTER_OVERRIDE[dollKey] || autoCenter;

  useEffect(() => {
    model.traverse((child: any) => {
      if (child.isMesh) {
        child.material.roughness = material.roughness;
        child.material.metalness = material.metalness;
        child.material.envMapIntensity = material.envMapIntensity;
        child.material.emissiveIntensity = material.emissiveIntensity;
      }
    });
  }, [model, material.roughness, material.metalness, material.envMapIntensity, material.emissiveIntensity]);


  const calcHit = (clientX: number, clientY: number) => {
    const rect = gl.domElement.getBoundingClientRect();
    mouseVec.current.set(
      ((clientX - rect.left) / rect.width) * 2 - 1,
      -((clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(mouseVec.current, camera);
    raycaster.ray.intersectPlane(planeConst.current, hitVec.current);
    return hitVec.current;
  };

  // window 레벨 드래그 핸들러 (ref 기반 → stale closure 없음)
  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      if (!isDraggingRef.current || !groupRef.current) return;
      const hit = calcHit(e.clientX, e.clientY);
      let newX = hit.x + dragOffset.current.x;
      let newZ = hit.z + dragOffset.current.z;
      if (onResolvePositionRef.current) {
        [newX, newZ] = onResolvePositionRef.current(newX, newZ);
      }
      groupRef.current.position.x = newX;
      groupRef.current.position.z = newZ;
      dragPos.current = [newX, 0.01, newZ];
    };

    const onUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current);
        longPressTimer.current = null;
      }
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      gl.domElement.style.cursor = 'grab';
      if (dragPos.current) {
        onPositionChangeRef.current(dragPos.current);
        dragPos.current = null;
        // 드래그 완료 시 dragCount 증가
        onDragEndRef.current?.();
      }
    };

    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
    };
  }, [camera, raycaster, gl]);

  const handlePointerDown = (e: any) => {
    e.stopPropagation();

    // 이전 드래그 상태 정리
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
    isDraggingRef.current = false;
    dragPos.current = null;

    onSelect();

    const hit = calcHit(e.clientX, e.clientY);
    dragOffset.current.set(position[0] - hit.x, 0, position[2] - hit.z);

    if (e.pointerType === 'mouse') {
      isDraggingRef.current = true;
      gl.domElement.style.cursor = 'grabbing';
    } else {
      longPressTimer.current = setTimeout(() => {
        isDraggingRef.current = true;
        gl.domElement.style.cursor = 'grabbing';
      }, 500);
    }
  };

  const rotStep = Math.PI / 9;
  const dollHeight = poseScale * (renderedPose === 'stand' ? 2.1 : 1.6);
  const arrowY = dollHeight * 0.5;
  const arrowX = poseScale * 0.8;

  return (
    <group
      ref={groupRef}
      position={position}
      onPointerDown={handlePointerDown}
    >
      {/* 선택 링 (회전 안 함, 항상 중심) */}
      {selected && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
          <ringGeometry args={[poseScale * 0.6, poseScale * 0.7, 48]} />
          <meshBasicMaterial color="#4fc3f7" transparent opacity={0.7} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* 인형 모델 (회전 적용, 모델 중심을 원점에 맞춤) */}
      <group ref={modelContainerRef} rotation={[0, rotation + POSE_CONFIG[renderedPose].baseRotation, 0]}>
        <group position={[-modelCenter[0], 0, -modelCenter[1]]}>
          <group rotation={[-Math.PI / 2, 0, 0]} position={[0, (BOTTOM_OVERRIDE[dollKey]?.[renderedPose] ?? POSE_CONFIG[renderedPose].bottomZ) * poseScale, 0]}>
            <primitive object={model} scale={poseScale} />
          </group>
        </group>
      </group>

      {/* 역할 라벨 (머리 위) */}
      {isMe && (
        <Html position={[0, dollHeight + poseScale * (renderedPose === 'sit' ? 0.9 : 0.3), 0]} center sprite>
          <div style={{
            color: '#333',
            fontSize: 14,
            fontWeight: 'bold',
            fontFamily: 'sans-serif',
            whiteSpace: 'nowrap',
            textShadow: '0 0 4px rgba(255,255,255,0.8)',
          }}>{figureType.label}</div>
        </Html>
      )}

      {/* 회전 화살표 (회전 안 함, 항상 좌우 고정) */}
      {selected && (
        <>
          <Html position={[-arrowX, arrowY, 0]} center sprite>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); if (navigator.vibrate) navigator.vibrate(30); onRotate(rotation - rotStep); }}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(0,0,0,0.35)', color: 'rgba(255,255,255,0.7)',
                border: '2px solid rgba(79,195,247,0.5)', cursor: 'pointer',
                fontSize: 24, lineHeight: '42px', textAlign: 'center',
                padding: 0, userSelect: 'none',
              }}
            >&#9664;</button>
          </Html>
          <Html position={[arrowX, arrowY, 0]} center sprite>
            <button
              onPointerDown={e => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); if (navigator.vibrate) navigator.vibrate(30); onRotate(rotation + rotStep); }}
              style={{
                width: 48, height: 48, borderRadius: '50%',
                background: 'rgba(0,0,0,0.35)', color: 'rgba(255,255,255,0.7)',
                border: '2px solid rgba(79,195,247,0.5)', cursor: 'pointer',
                fontSize: 24, lineHeight: '42px', textAlign: 'center',
                padding: 0, userSelect: 'none',
              }}
            >&#9654;</button>
          </Html>
        </>
      )}
    </group>
  );
}
