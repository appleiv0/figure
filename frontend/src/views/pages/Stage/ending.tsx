import { useEffect } from "react";
import axios from "axios";
import "dayjs/locale/ko";
import { USER } from "../../../constants/common.constant";
import { getItemLocalStorage } from "../../../utils/helper";

const Ending = () => {
  const userInfo = getItemLocalStorage(USER) || { kidname: '', endWord: { kwaVSwa: '와' } };

  useEffect(() => {
    const completeSession = async () => {
      try {
        const apiBase = import.meta.env.VITE_ENV_API_BACKEND_DOMAIN || '/api';
        await axios.post(`${apiBase}/public/complete-session`, { receiptNo: userInfo.receiptNo });
      } catch (e) {
        console.error("Failed to complete session:", e);
      }
    };
    if (userInfo.receiptNo) completeSession();
  }, []);

  return (
    <div className="mx-auto max-w-screen-xl">
      <div className="h-screen w-full z-20 text-center font-bold relative flex flex-col justify-center">
        <h1 className="text-[2.5rem] mb-[4.375rem]">
          즐거운 시간이였어, {userInfo.kidname}!
        </h1>
        <img
          className="mx-auto w-[12.5rem] mb-[3.125rem] rounded-full"
          src={`${import.meta.env.BASE_URL}assets/images/01.png`}
          alt="User"
        />
        <h2 className="text-2xl mb-[2.875rem]">
          포기하지 않고 끝까지 해줘서 고마워. <br />
          열심히 하는 네 모습이 정말 대단하다. <br />
          아주 잘했어. 안녕!
        </h2>
        <div className="border border-[#FFFFFF] bg-[#FFFFFF] rounded-md px-5 py-5 text-center justify-center text-black text-2xl font-bold mx-auto lg:w-[49.375rem] w-[85%]">
          검사가 종료되었습니다. 수고했습니다!
        </div>
      </div>
    </div>
  );
};

export default Ending;
