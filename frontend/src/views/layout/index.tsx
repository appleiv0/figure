import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { USER } from "../../constants/common.constant";
import useStore from "../../store";
import { getItemLocalStorage } from "../../utils/helper";
import { useSessionProgress } from "../../services/hooks/hookSessionProgress";

const Layout = () => {
  const { fetchProgress } = useSessionProgress();

  useEffect(() => {
    const hydrate = async () => {
      const userInfo = getItemLocalStorage(USER);
      const store = useStore.getState() as any;

      // 인증 정보 없으면 hydrate 안 함 (로그인/마케팅 페이지 등)
      if (!userInfo?.receiptNo || !userInfo?.sessionToken) return;

      // 이미 같은 receiptNo로 hydrate된 상태면 skip (중복 호출 방지)
      if (store.lastHydratedReceiptNo === userInfo.receiptNo) return;

      const data = await fetchProgress(userInfo.receiptNo);
      if (!data) return;

      // 백엔드 권위 데이터로 store 덮어쓰기
      store.setCurrentStep(data.progress.stage);
      store.setCurrentMemberIndex(data.progress.memberIndex || 0);

      if (data.family_members && data.family_members.length > 0) {
        store.setSelectedFamily(data.family_members);
        store.setSelectedFamilyJosa(
          data.family_members.map((name: string) => {
            const last = name.charAt(name.length - 1);
            if (last >= "\uAC00" && last <= "\uD7A3") {
              return (last.charCodeAt(0) - 0xAC00) % 28 > 0 ? 1 : 0;
            }
            return 1;
          })
        );
      }

      store.setLastHydratedReceiptNo(userInfo.receiptNo);
    };

    hydrate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="main-content">
      <Outlet />
    </main>
  );
};

export default Layout;
