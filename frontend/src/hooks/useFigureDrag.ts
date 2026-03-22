import { useThree } from '@react-three/fiber';
import { useCallback, useRef } from 'react';
import * as THREE from 'three';

export function useFigureDrag(onDrag: (position: { x: number; y: number; z: number }) => void) {
  const { camera, scene } = useThree();
  const raycaster = useRef(new THREE.Raycaster());
  const isDragging = useRef(false);

  const handlePointerDown = useCallback(() => {
    isDragging.current = true;
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
  }, []);

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!isDragging.current) return;

    // 마우스 위치를 정규화된 좌표로 변환 (-1 ~ 1)
    const mouse = new THREE.Vector2(
      (event.clientX / window.innerWidth) * 2 - 1,
      -(event.clientY / window.innerHeight) * 2 + 1
    );

    raycaster.current.setFromCamera(mouse, camera);

    // 책상 표면과의 교차점 찾기
    const deskPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.75);
    const intersectPoint = new THREE.Vector3();
    raycaster.current.ray.intersectPlane(deskPlane, intersectPoint);

    if (intersectPoint) {
      // 책상 범위 제한
      const clampedX = Math.max(-0.9, Math.min(0.9, intersectPoint.x));
      const clampedZ = Math.max(-0.5, Math.min(0.5, intersectPoint.z));

      onDrag({ x: clampedX, y: 0.18, z: clampedZ });
    }
  }, [camera, onDrag]);

  return {
    handlePointerDown,
    handlePointerUp,
    handlePointerMove
  };
}
