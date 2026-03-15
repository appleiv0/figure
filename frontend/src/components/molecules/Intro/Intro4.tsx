
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
        <div className="relative mx-auto mt-6 md:mt-8 max-w-[22rem] px-4">
          <div className="bg-yellow-200 border border-yellow-300 rounded-2xl p-4 text-center text-lg md:text-2xl font-bold leading-relaxed">
            가족을 선택해서
            <br />
            <span className="text-greenDark">원하는 위치에 세워보세요.</span>
          </div>
          <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 bg-yellow-200 border-l border-t border-yellow-300 rotate-45" />
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
