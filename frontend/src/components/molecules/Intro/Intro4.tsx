
import Icon from "../../atoms/Icon";

type Intro4Props = {
  handleActivePosition: () => void;
};

const Intro4 = ({ handleActivePosition }: Intro4Props) => {
  return (
    <div>
      <div>
        <img
          className="w-[3.5rem] md:w-[4.5rem] flex justify-center mx-auto items-center mt-[1.5rem] md:mt-[2rem]"
          src="./assets/images/01.png"
        />
        <h1 className="text-center text-xl md:text-3xl font-bold mt-6 md:mt-8">[ 진행 방법 ]</h1>
        <div className="text-center text-lg md:text-2xl font-bold mt-6 md:mt-10 max-w-full md:max-w-[39rem] mx-auto px-4 md:px-0 leading-relaxed">
          동물 중에서 누구 누구가 서로 친한지
          <br />
          <span className="text-greenDark">
            친한 동물들끼리 가까이 옮겨보자.
          </span>
          <br /><br />
          손가락으로 동물 카드를 움직일 수 있어요!
          <br />
          동물을 더블클릭하면 동물의 방향이 바뀌어요.
          <br /><br />
          <span className="text-greenDark">확인 버튼</span>을 누르면 다음 화면으로 이동할 거야.
        </div>
      </div>
      <div className="mt-[1.75rem] relative">
        <div className="relative flex flex-col items-center">
          <button
            // className="relative z-10 mt-[6rem] text-[0.9375rem] text-white font-extrabold w-[5.75rem] h-[5.75rem] rounded-[2.875rem] border border-green bg-green flex flex-col items-center justify-center hover:bg-white hover:text-green"
            className="text-[0.9375rem] text-white font-extrabold w-[5.75rem] h-[5.75rem] rounded-[2.875rem] border border-green bg-green flex flex-col items-center justify-center hover:bg-white hover:text-green"
            onClick={handleActivePosition}
          >
            <Icon icon="check" width={20} height={20} className="max-w-5" />
            <p>확인</p>
          </button>
          {/* <p> </p>
          <br />
          <button className="text-[0.9375rem] font-extrabold w-[5.75rem] h-[5.75rem] rounded-[2.875rem] border border-green flex flex-col items-center justify-center">
            <img
              src="/assets/images/icons/icon-flip.svg"
              className="inline-block max-w-[1.875rem] mb-1"
              alt="icon-flip"
            />
            <p>반전</p>
          </button>
          <h3 className="text-grey-600 text-xl font-bold mt-5">
            반전 버튼으로 카드 방향을 바꿀 수 있어!
          </h3> */}
        </div>
        {/* <div className="figure-list figure-4">
          {defaultStage4Figures.map((figure: any, index: number) => {
            return (
              <Card
                key={`figure-${index}`}
                className={`figure-animal figure-${index + 1}`}
                imgUrl={figure.imageUrl}
                name={figure.name}
              />
            );
          })}
        </div> */}
      </div>
    </div>
  );
};

export default Intro4;
