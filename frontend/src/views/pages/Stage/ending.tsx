import "dayjs/locale/ko";
import { USER } from "../../../constants/common.constant";
import { getItemLocalStorage } from "../../../utils/helper";
import ButtonEnd from "../../../components/molecules/Widget/ButtonEnd";
// import useStore from "../../../store";

const Ending = () => {
  const userInfo = getItemLocalStorage(USER);

  return (
    <div className="mx-auto max-w-screen-xl">
      <div className="h-screen w-full z-20 text-center font-bold relative flex flex-col justify-center">
        <h1 className="text-[2.5rem] mb-[4.375rem]">
          즐거운 시간이였어, {userInfo.kidname}!
        </h1>
        <img
          className="mx-auto w-[12.5rem] mb-[3.125rem] rounded-full"
          src="assets/images/01.png"
          alt="User"
        />
        <h2 className="text-2xl mb-[2.875rem]">
          포기하지 않고 끝까지 해줘서 고마워. <br />
          열심히 하는 네 모습이 정말 대단하다. 아주 잘했어. 안녕!
        </h2>
        <div className="border border-[#FFFFFF] bg-[#FFFFFF] rounded-md px-5 py-5 text-center justify-center text-black text-2xl font-bold mx-auto lg:w-[49.375rem] w-[85%]">
          {userInfo.kidname}{userInfo.endWord.kwaVSwa}의 면담이 종료되었습니다.
        </div>
        <div className="mx-auto mt-8">
          <ButtonEnd />
        </div>
      </div>
    </div>
  );
};

export default Ending;
