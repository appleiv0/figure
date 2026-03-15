import React, { useMemo, useState } from 'react';
import { Canvas } from '@react-three/fiber';
import { useGLTF, Environment, OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';

const SEEDS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
const SPACING = 1.2;

interface DollEntry {
  key: string;
  label: string;
  fixedPose?: boolean;
}

const DOLLS: DollEntry[] = [
  { key: 'mom', label: '엄마 (new)' },
  { key: 'Grandfa', label: '할아버지 (new)' },
  { key: 'Granma_stand', label: '할머니 stand (new)', fixedPose: true },
  { key: 'Grandma_sit', label: '할머니 sit (new)', fixedPose: true },
  { key: 'boy', label: '남자 어린이' },
  { key: 'girl', label: '여자 어린이' },
  { key: 'grand_fa', label: '할아버지 (old)' },
  { key: 'grand_ma', label: '할머니 (old)' },
  { key: 'baby', label: '아기' },
  { key: 'male', label: '아빠' },
  { key: 'Teenager_boy', label: '남자 청소년' },
  { key: 'Teenager_girl', label: '여자 청소년' },
];

const POSES = [
  { key: 'stand', label: 'Stand' },
  { key: 'sit', label: 'Sit' },
];

function SeedModel({ prefix, seed, x }: { prefix: string; seed: number; x: number }) {
  const path = `/figures/${prefix}_s${seed}.glb`;
  const { scene } = useGLTF(path);
  const model = useMemo(() => {
    const cloned = scene.clone(true);
    cloned.traverse((child: any) => {
      if (child.isMesh) {
        child.material = child.material.clone();
        child.material.roughness = 0.85;
        child.material.metalness = 0.0;
      }
    });
    return cloned;
  }, [scene]);

  return (
    <group position={[x, 0, 0]}>
      <group rotation={[-Math.PI / 2, 0, 0]} position={[0, 1.05 * 0.5, 0]}>
        <primitive object={model} scale={0.5} />
      </group>
      <Html position={[0, -0.1, 0]} center>
        <div style={{
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '2px 8px',
          borderRadius: 4,
          fontSize: 14,
          fontWeight: 'bold',
          whiteSpace: 'nowrap'
        }}>
          seed {seed}
        </div>
      </Html>
    </group>
  );
}

export default function SeedCompare() {
  const [dollIdx, setDollIdx] = useState(0);
  const [poseIdx, setPoseIdx] = useState(0);

  const doll = DOLLS[dollIdx];
  const pose = POSES[poseIdx];
  const prefix = doll.fixedPose ? doll.key : `${doll.key}_${pose.key}`;

  const totalWidth = (SEEDS.length - 1) * SPACING;
  const startX = -totalWidth / 2;

  return (
    <div style={{ width: '100dvw', height: '100dvh', background: '#f0ebe3' }}>
      <Canvas
        key={prefix}
        dpr={[1, 2]}
        gl={{
          antialias: true,
          toneMapping: THREE.NoToneMapping,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        camera={{
          position: [0, 1.5, 8],
          fov: 40
        }}
      >
        <ambientLight intensity={0.9} />
        <directionalLight position={[3, 5, 4]} intensity={1.2} />
        <pointLight position={[-2, 2, 2]} intensity={0.4} />
        <Environment preset="apartment" />

        {SEEDS.map((seed, i) => (
          <SeedModel key={`${prefix}-${seed}`} prefix={prefix} seed={seed} x={startX + i * SPACING} />
        ))}

        <OrbitControls enablePan enableZoom enableRotate minDistance={2} maxDistance={20} />

        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]}>
          <planeGeometry args={[20, 10]} />
          <meshStandardMaterial color="#d4cfc7" />
        </mesh>
      </Canvas>

      {/* 컨트롤 패널 */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        zIndex: 10,
      }}>
        {/* 인형 선택 */}
        {DOLLS.map((d, i) => (
          <button
            key={d.key}
            onClick={() => setDollIdx(i)}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: dollIdx === i ? 'bold' : 'normal',
              background: dollIdx === i ? 'white' : 'rgba(0,0,0,0.7)',
              color: dollIdx === i ? '#333' : 'white',
              border: '2px solid white',
              borderRadius: 6,
              cursor: 'pointer',
            }}
          >
            {d.label}
          </button>
        ))}

        <span style={{ color: 'white', margin: '0 4px' }}>|</span>

        {/* 포즈 선택 (fixedPose일 때 비활성) */}
        {POSES.map((p, i) => (
          <button
            key={p.key}
            onClick={() => !doll.fixedPose && setPoseIdx(i)}
            disabled={!!doll.fixedPose}
            style={{
              padding: '6px 12px',
              fontSize: 13,
              fontWeight: !doll.fixedPose && poseIdx === i ? 'bold' : 'normal',
              background: doll.fixedPose ? 'rgba(0,0,0,0.3)' : poseIdx === i ? 'white' : 'rgba(0,0,0,0.7)',
              color: doll.fixedPose ? 'rgba(255,255,255,0.4)' : poseIdx === i ? '#333' : 'white',
              border: '2px solid white',
              borderRadius: 6,
              cursor: doll.fixedPose ? 'not-allowed' : 'pointer',
              opacity: doll.fixedPose ? 0.5 : 1,
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      <div style={{
        position: 'absolute',
        bottom: 10,
        left: '50%',
        transform: 'translateX(-50%)',
        color: 'white',
        background: 'rgba(0,0,0,0.7)',
        padding: '6px 14px',
        borderRadius: 8,
        fontFamily: 'monospace',
        fontSize: 13
      }}>
        {doll.label} {doll.fixedPose ? '' : pose.label} Seeds 0~9 | 드래그: 회전, 스크롤: 줌
      </div>
    </div>
  );
}
