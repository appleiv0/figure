import { useEffect } from "react";
import axios from "axios";
import ButtonEnd from "../../../components/molecules/Widget/ButtonEnd";
import useStore from "../../../store";
import { getItemLocalStorage } from "../../../utils/helper";
import { USER } from "../../../constants/common.constant";

const Result = () => {
  const response = useStore((state: any) => state.response);
  const setResponse = useStore((state: any) => state.setResponse);
  const userInfo = getItemLocalStorage(USER) || {};

  // Auto-fetch report if response is empty (session resume case)
  useEffect(() => {
    if ((!response || !response.message) && userInfo.receiptNo) {
      const apiBase = (import.meta as any).env?.VITE_ENV_API_BACKEND_DOMAIN || '/api';
      axios.post(`${apiBase}/getReport`, {
        kidName: userInfo.kidname,
        receiptNo: `${userInfo.receiptNo}`,
      }).then(res => {
        if (res.data) setResponse(res.data);
      }).catch(() => {});
    }
  }, []);

  if (!response || !response.message) {
    return (
      <div className="h-screen w-full z-20 text-center font-bold relative flex flex-col justify-center">
        <h2 className="text-2xl">결과를 불러오는 중입니다...</h2>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen w-full z-20 text-center font-bold relative flex flex-col justify-center">
        <h2 className="text-[2.5rem] mb-[8.125rem]">검사결과</h2>
        <img
          className="w-[11.25rem] mx-auto mb-[2.1875rem]"
          src={`${import.meta.env.BASE_URL}assets/images/02.png`}
          alt="User"
        />
        <h3 className="text-2xl">{response.message}</h3>
        {response?.result?.tension && (
          <h3 className="text-xl mt-4 text-gray-600">{response.result.tension}</h3>
        )}
        <div className="mx-auto mt-8">
          <ButtonEnd />
        </div>
      </div>
    </>
  );
};

export default Result;
