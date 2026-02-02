import { ReactNode } from "react";

import Icon from "../../atoms/Icon";

type IntroTypes = {
  children: ReactNode;
  handleChooseAnimal: () => void;
};

const Intro = ({ children, handleChooseAnimal }: IntroTypes) => {

  return (
    <div className="container mx-auto px-4 md:px-0">
      <img
        className="w-[3.5rem] md:w-[4.5rem] flex justify-center mx-auto items-center mt-[1.5rem] md:mt-[2rem]"
        src="/assets/images/01.png"
      />
      <h1 className="text-center text-xl md:text-3xl font-extrabold mt-6 md:mt-8 mb-6 md:mb-10">
        [ 진행 방법 ]
      </h1>
      <div className="text-center text-lg md:text-2xl leading-normal md:leading-9 font-bold mb-6 md:mb-10 max-w-full md:max-w-[39rem] mx-auto">
        {children}
      </div>
      {/* <div className="background-container">
        <div className="animal-cards-container grid grid-cols-6 gap-3 justify-center text-center">
          {filteredAnimalsIntro.map((animal) => (
            <div key={animal.index} className="animal-card">
              <div className="animal-card-content w-full bg-white rounded-xl p-3">
                <img
                  src={animal.img}
                  alt={animal.name}
                  className="animal-image w-32 mx-auto object-contain mb-2"
                />
                <span className="animal-name xl:text-xl font-bold">
                  {animal.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div> */}

      <div className="w-full relative z-20 text-center font-bold mt-10">
        <button
          type="button"
          className="flex flex-col gap-1 items-center justify-center text-[0.9375rem] mx-auto mt-4 border border-primary w-[5.75rem] h-[5.75rem] bg-primary hover:bg-grey-100 hover:text-greenDark text-white px-5 py-4 rounded-full cursor-pointer select-none"
          onClick={handleChooseAnimal}
        >
          <Icon icon="check" width={20} height={20} className="max-w-5" />
          확인
        </button>
      </div>
    </div>
  );
};

export default Intro;
