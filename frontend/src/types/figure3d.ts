export type FigureCategory = 'adult' | 'child' | 'infant' | 'teenager';
export type Gender = 'male' | 'female';
export type FigureVariant = 1 | 2;

export type DollPose = 'stand' | 'sit';

const B = import.meta.env.BASE_URL || '/';

export const DOLL_MODELS: Record<string, Record<DollPose, string>> = {
  adult_male: {
    stand: `${B}figures/male_stand_s3.glb`,
    sit: `${B}figures/male_sit_s4.glb`,
  },
  adult_female: {
    stand: `${B}figures/mom_stand_s2.glb`,
    sit: `${B}figures/mom_sit_s2.glb`,
  },
  child_male: {
    stand: `${B}figures/boy_stand_s5.glb`,
    sit: `${B}figures/boy_sit_s8.glb`,
  },
  child_female: {
    stand: `${B}figures/girl_stand_s0.glb`,
    sit: `${B}figures/girl_sit_s0.glb`,
  },
  infant: {
    stand: `${B}figures/baby_stand_new.glb`,
    sit: `${B}figures/baby_sit_new.glb`,
  },
  baby: {
    stand: `${B}figures/baby_stand_new.glb`,
    sit: `${B}figures/baby_sit_new.glb`,
  },
  grand_fa: {
    stand: `${B}figures/Grandfa_stand_s2.glb`,
    sit: `${B}figures/Grandfa_sit_s5.glb`,
  },
  grand_ma: {
    stand: `${B}figures/Granma_stand_s0.glb`,
    sit: `${B}figures/Grandma_sit_s9.glb`,
  },
  teenager_male: {
    stand: `${B}figures/Teenager_boy_stand_s0.glb`,
    sit: `${B}figures/Teenager_boy_sit_s0.glb`,
  },
  teenager_female: {
    stand: `${B}figures/Teenager_girl_stand_s0.glb`,
    sit: `${B}figures/Teenager_girl_sit_s0.glb`,
  },
};

// 하위호환용
export const DOLL_POSES: Record<DollPose, string> = DOLL_MODELS.adult_male;

export interface Figure3DType {
  id: string;
  enabled: boolean;
  label: string;
  category: FigureCategory;
  gender: Gender;
  variant: FigureVariant;
  size: number;
  hasImages: boolean;
  modelPath?: string;
  dollModel?: string; // DOLL_MODELS key
}

export interface Position3D {
  x: number;
  y: number;
  z: number;
}

export interface FigureInstance {
  id: string;
  figureType: Figure3DType;
  position: Position3D;
  rotation: number; // radians
  selected: boolean;
  pose: DollPose;
  isMe?: boolean;
  dragCount: number; // 드래그 완료 횟수
  initialPosition: Position3D; // 최초 배치 위치
  rotationChanged: boolean; // 회전이 변경되었는지
  poseChanged: boolean; // 포즈(stand/sit)가 변경되었는지
  sizeChanged: boolean; // 크기가 변경되었는지
  interactionCount: number; // 총 인터랙션 횟수 (드래그+회전+포즈+크기 변경 합계)
}

export interface FiguresConfig {
  figures: Figure3DType[];
  rotationAngles: number[];
}

// DB 저장용 직렬화 데이터
export interface DollInstanceData {
  dollModel: string;
  label: string;
  pose: DollPose;
  rotation: number;
  position: Position3D;
  size: number;
  dragCount: number; // 드래그 완료 횟수
  initialPosition: Position3D; // 최초 배치 위치
  rotationChanged: boolean; // 회전이 변경되었는지
  poseChanged: boolean; // 포즈(stand/sit)가 변경되었는지
  sizeChanged: boolean; // 크기가 변경되었는지
  interactionCount: number; // 총 인터랙션 횟수 (드래그+회전+포즈+크기 변경 합계)
}

export const ROTATION_ANGLES = [
  0, 20, 40, 60, 80, 100, 120, 140, 160,
  180, 200, 220, 240, 260, 280, 300, 320, 340
];

// Get nearest angle from rotation
export function getNearestAngle(rotation: number): number {
  const normalized = ((rotation % 360) + 360) % 360;
  return ROTATION_ANGLES.reduce((prev, curr) => {
    const prevDiff = Math.abs(prev - normalized);
    const currDiff = Math.abs(curr - normalized);
    return currDiff < prevDiff ? curr : prev;
  });
}
