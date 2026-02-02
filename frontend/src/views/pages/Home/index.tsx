import dayjs from "dayjs";
import "dayjs/locale/ko";
import { useNavigate } from "react-router-dom";
import SubmitButton from "../../../components/atoms/Form/Button/SubmitButton";
import Icon from "../../../components/atoms/Icon";
import { USER } from "../../../constants/common.constant";
import { getItemLocalStorage } from "../../../utils/helper";

const Home = () => {
  const userInfo = getItemLocalStorage(USER);
  const navigator = useNavigate();

  const selectedDate = userInfo.selectedDate
    ? dayjs(userInfo.selectedDate)
    : null;

  if (!selectedDate) {
    return null;
  }

  const age = dayjs().diff(selectedDate, "year");
  const formattedDate = selectedDate.format("YYYY년 MM월 DD일 [") + age + "세]";
  const currentDateString = dayjs().format("M월 D일");

  const handleConfirm = () => {
    navigator("/stage0");
  };

  return (
    <div className="h-screen w-full flex flex-col justify-center z-20">
      <div className="text-center font-bold px-5 mx-auto max-w-[52rem]">
        <img
          className="w-[9.25rem] h-[9.25rem] mx-auto rounded-full"
          src="/assets/images/user.png"
          alt="User"
        />
        <h1 className="text-3xl mt-8 font-extrabold">{userInfo.kidname}</h1>
        <h2 className="text-2xl mt-3">{formattedDate}</h2>
        <h3 className="text-2xl font-bold border border-[#FFFFFF] bg-[#FFFFFF] rounded-md px-5 py-5 text-center mt-10 inline-flex">
          오늘은
          <span className="text-greenDark">{currentDateString}</span>
          입니다. {userInfo?.kidname}
          {userInfo?.endWord.kwaVSwa}의 면담을 시작하겠습니다.
        </h3>
        <SubmitButton
          className="text-2xl font-extrabold mx-auto mt-10 flex gap-2 items-center border border-primary bg-primary text-white px-7 py-5 rounded-md"
          onClick={handleConfirm}
        >
          시작하기
          <Icon icon="arrowRight" width={24} height={24} className="max-w-6" />
        </SubmitButton>
      </div>
    </div>
  );
};

export default Home;
