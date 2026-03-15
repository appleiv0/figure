import React, { useState, useEffect, useRef } from 'react';
import { ThreeEvent } from '@react-three/fiber';
import { FigureInstance } from '../../../types/figure3d';
import * as THREE from 'three';

interface Props {
  figure: FigureInstance;
  onRotate: (angle: number) => void;
}

export default function RotationControl({ figure, onRotate }: Props) {
  const [isActive, setIsActive] = useState(false);
  const rotationIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const pressTimerRef = useRef<NodeJS.Timeout | null>(null);

  // 회전 함수
  const rotate = (deltaRadians: number) => {
    const newRotation = figure.rotation + deltaRadians;
    onRotate(newRotation);
  };

  // 연속 회전 시작
  const startContinuousRotation = (direction: 'left' | 'right') => {
    const deltaRadians = (direction === 'left' ? -15 : 15) * Math.PI / 180;

    rotationIntervalRef.current = setInterval(() => {
      rotate(deltaRadians);
    }, 100);
  };

  // 연속 회전 중지
  const stopContinuousRotation = () => {
    if (rotationIntervalRef.current) {
      clearInterval(rotationIntervalRef.current);
      rotationIntervalRef.current = null;
    }
    if (pressTimerRef.current) {
      clearTimeout(pressTimerRef.current);
      pressTimerRef.current = null;
    }
  };

  // 화살표 버튼 클릭/터치 핸들러
  const handleArrowDown = (e: ThreeEvent<PointerEvent>, direction: 'left' | 'right') => {
    e.stopPropagation();

    // 즉시 30도 회전
    const deltaRadians = (direction === 'left' ? -30 : 30) * Math.PI / 180;
    rotate(deltaRadians);

    // 300ms 후에 연속 회전 시작
    pressTimerRef.current = setTimeout(() => {
      startContinuousRotation(direction);
    }, 300);
  };

  const handleArrowUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    stopContinuousRotation();
  };

  // 컴포넌트 언마운트 시 타이머 정리
  useEffect(() => {
    return () => {
      stopContinuousRotation();
    };
  }, []);

  // 드래그 회전
  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    setIsActive(true);
  };

  const handlePointerUp = () => {
    setIsActive(false);
  };

  const handlePointerMove = (e: ThreeEvent<PointerEvent>) => {
    if (!isActive) return;
    e.stopPropagation();

    const point = e.point;
    const angle = Math.atan2(
      point.x - figure.position.x,
      point.z - figure.position.z
    );

    onRotate(angle);
  };

  // 마우스 휠 회전
  const handleWheel = (e: ThreeEvent<WheelEvent>) => {
    e.stopPropagation();
    const deltaRadians = (e.deltaY > 0 ? 15 : -15) * Math.PI / 180;
    rotate(deltaRadians);
  };

  const scale = figure.figureType.size * 2;

  return (
    <group>
      {/* 투명한 바닥 - 드래그 회전용 */}
      <mesh
        position={[0, 0, 0]}
        rotation={[-Math.PI / 2, 0, 0]}
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerMove={handlePointerMove}
        onWheel={handleWheel}
      >
        <circleGeometry args={[10, 64]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* 시각적 회전 링 */}
      <mesh
        position={[figure.position.x, 0.02, figure.position.z]}
        rotation={[-Math.PI / 2, 0, 0]}
      >
        <ringGeometry args={[0.3, 0.36, 64]} />
        <meshBasicMaterial
          color="#4a9eff"
          transparent
          opacity={0.5}
        />
      </mesh>

      {/* 방향 표시 삼각형 */}
      <mesh
        position={[
          figure.position.x + Math.sin(figure.rotation) * 0.25,
          figure.position.y + scale * 0.15,
          figure.position.z + Math.cos(figure.rotation) * 0.25
        ]}
        rotation={[0, figure.rotation, 0]}
      >
        <coneGeometry args={[0.04, 0.08, 3]} />
        <meshBasicMaterial color="#ff4a4a" />
      </mesh>

      {/* 왼쪽 화살표 버튼 (반시계) */}
      <group position={[figure.position.x - 0.5, figure.position.y + scale * 0.15, figure.position.z]}>
        {/* 터치 영역 확대용 투명 박스 */}
        <mesh
          onPointerDown={(e) => handleArrowDown(e, 'left')}
          onPointerUp={handleArrowUp}
          onPointerLeave={handleArrowUp}
        >
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        {/* 시각적 삼각형 */}
        <mesh rotation={[0, -Math.PI / 2, 0]}>
          <coneGeometry args={[0.06, 0.12, 3]} />
          <meshBasicMaterial color="#4a9eff" transparent opacity={0.8} />
        </mesh>
      </group>

      {/* 오른쪽 화살표 버튼 (시계) */}
      <group position={[figure.position.x + 0.5, figure.position.y + scale * 0.15, figure.position.z]}>
        {/* 터치 영역 확대용 투명 박스 */}
        <mesh
          onPointerDown={(e) => handleArrowDown(e, 'right')}
          onPointerUp={handleArrowUp}
          onPointerLeave={handleArrowUp}
        >
          <boxGeometry args={[0.15, 0.15, 0.15]} />
          <meshBasicMaterial transparent opacity={0} />
        </mesh>
        {/* 시각적 삼각형 */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <coneGeometry args={[0.06, 0.12, 3]} />
          <meshBasicMaterial color="#4a9eff" transparent opacity={0.8} />
        </mesh>
      </group>
    </group>
  );
}
