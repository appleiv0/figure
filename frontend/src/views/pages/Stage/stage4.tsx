import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Intro4 from "../../../components/molecules/Intro/Intro4";
import Header from "../../../components/organisms/Header";
import DeskScene3D from "../../../components/organisms/DeskScene3D";
import useStore from "../../../store";
import { useSetPosition } from "../../../services/hooks/hookFigures";
import { USER } from "../../../constants/common.constant";
import { getItemLocalStorage } from "../../../utils/helper";
import { DollInstanceData } from "../../../types/figure3d";

const Stage4 = () => {
  // phase 0: Intro4, phase 1: 배치만 (가족추가 없음), phase 2: 가족추가 가능
  const [phase, setPhase] = useState<number>(0);
  const navigator = useNavigate();
  const { setCurrentIndex, setCurrentStep, selectedFamily: _selectedFamily, selectedFamilyJosa: _selectedFamilyJosa, figure } = useStore() as any;
  const { fetchPosition } = useSetPosition();
  const userInfo = getItemLocalStorage(USER);

  const handleActiveFigurePosition = () => {
    setPhase(1);
  };

  const handleNext = async (canvasImage: string, dollInstances: DollInstanceData[]) => {
    try {
      // 3D 인형 위치를 2D 픽셀 좌표로 변환 (get_friendly 호환)
      const centerH = 215;
      const centerV = 400;
      const scale = 100; // 3D→2D 스케일 팩터
      const boxSize = 40; // 가상 카드 크기 (px)

      // stage3에서 선택한 동물 데이터 (relation→figure 매핑)
      const animalMap: Record<string, any> = {};
      (figure || []).forEach((f: any) => {
        animalMap[f.relation] = f;
      });

      // dollInstances의 3D 좌표를 2D figures 형식으로 변환
      const figures = dollInstances.map((doll) => {
        const pixelX = Math.round(doll.position.x * scale + centerH);
        const pixelY = Math.round(doll.position.z * scale + centerV);
        const animal = animalMap[doll.label];
        return {
          relation: doll.label,
          figure: animal?.figure || doll.label,
          message: animal?.message || "",
          direction: 0,
          position: {
            p1: [pixelX - boxSize / 2, pixelY - boxSize / 2],
            p2: [pixelX + boxSize / 2, pixelY + boxSize / 2],
          },
        };
      });

      const data = {
        kidName: userInfo?.kidname || "",
        receiptNo: userInfo?.receiptNo || "",
        centerH,
        centerV,
        figures,
        canvasImage,
        dollInstances,
      };
      const result = await fetchPosition(data);
      if (!result) {
        alert("인형 배치 데이터 저장에 실패했습니다. 다시 시도해주세요.");
        return;
      }
    } catch (error: any) {
      console.error("Position save error:", error.message);
      alert("인형 배치 데이터 저장에 실패했습니다. 다시 시도해주세요.");
      return;
    }

    setCurrentIndex(0);
    setCurrentStep(7);

    // Save step to backend for resume capability (fire and forget)
    try {
      const apiBase = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || '/api';
      fetch(`${apiBase}/public/save-step`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ receiptNo: userInfo?.receiptNo, currentStep: 7 }) }).catch(() => {});
    } catch {}

    // Check if results should be shown
    try {
      const apiBase = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || '/api';
      const settingsRes = await fetch(`${apiBase}/public/settings/show-result`).then(r => r.json());
      if (settingsRes?.showResultToUser) {
        // 결과 페이지로 가기 전에 리포트 데이터를 먼저 가져옴
        try {
          const reportRes = await fetch(`${apiBase}/getReport`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              kidName: userInfo?.kidname,
              receiptNo: Number(userInfo?.receiptNo),
            }),
          });
          const reportData = await reportRes.json();
          if (reportData) {
            (useStore.getState() as any).setResponse(reportData);
          }
        } catch (e) {
          console.error("Report fetch error:", e);
        }
        navigator("/result");
      } else {
        navigator("/ending");
      }
    } catch {
      navigator("/ending");
    }
  };

  return (
    <>
      {phase === 0 ? (
        <>
          <Header />
          <Intro4 handleActivePosition={handleActiveFigurePosition} />
        </>
      ) : (
        <DeskScene3D
          onNext={handleNext}
          phase={phase}
          onPhaseChange={setPhase}
        />
      )}
    </>
  );
};

export default Stage4;
