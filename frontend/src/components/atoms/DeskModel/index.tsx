import { useMemo } from 'react';
import * as THREE from 'three';

// 페브릭 텍스처 생성
function createFabricTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 베이스 색상
  ctx.fillStyle = '#e8e4dc';
  ctx.fillRect(0, 0, 512, 512);

  // 직물 패턴 (가로/세로 교차)
  const weaveSize = 8;
  for (let y = 0; y < 512; y += weaveSize) {
    for (let x = 0; x < 512; x += weaveSize) {
      const brightness = Math.random() * 0.1 - 0.05;
      const color = Math.floor((232 + brightness * 255));
      ctx.fillStyle = `rgb(${color}, ${color - 4}, ${color - 8})`;

      if ((x / weaveSize + y / weaveSize) % 2 === 0) {
        ctx.fillRect(x, y, weaveSize, weaveSize);
      }
    }
  }

  // 노이즈 추가
  const imageData = ctx.getImageData(0, 0, 512, 512);
  for (let i = 0; i < imageData.data.length; i += 4) {
    const noise = Math.random() * 10 - 5;
    imageData.data[i] += noise;
    imageData.data[i + 1] += noise;
    imageData.data[i + 2] += noise;
  }
  ctx.putImageData(imageData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);

  return texture;
}

// 펠트 텍스처 생성
function createFeltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // 베이스 컬러
  ctx.fillStyle = '#5c8a3f';
  ctx.fillRect(0, 0, 512, 512);

  // 펠트 섬유 느낌 노이즈
  for (let i = 0; i < 80000; i++) {
    const x = Math.random() * 512;
    const y = Math.random() * 512;
    const brightness = Math.random() * 30 - 15;
    const r = Math.min(255, Math.max(0, 92 + brightness));
    const g = Math.min(255, Math.max(0, 138 + brightness));
    const b = Math.min(255, Math.max(0, 63 + brightness));
    ctx.fillStyle = `rgb(${r},${g},${b})`;
    ctx.fillRect(x, y, 1.2, 1.2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);

  return texture;
}

export default function DeskModel() {
  const fabricTexture = useMemo(() => createFabricTexture(), []);
  const feltTexture = useMemo(() => createFeltTexture(), []);
  return (
    <group>
      {/* 초록 펠트 매트 */}
      <mesh
        name="desk-surface"
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.01, 1.0]}
        receiveShadow
      >
        <planeGeometry args={[2.5, 2.5]} />
        <meshStandardMaterial
          map={feltTexture}
          roughness={0.97}
          metalness={0}
        />
      </mesh>

      {/* 바닥 - 페브릭 텍스처 */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
      >
        <planeGeometry args={[10, 10]} />
        <meshStandardMaterial
          map={fabricTexture}
          roughness={0.95}
          metalness={0}
        />
      </mesh>
    </group>
  );
}
