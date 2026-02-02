import Intro from "../../../components/molecules/Intro/Intro";
import ChooseAnimal from "../../../components/organisms/ChooseAnimal";
import Header from "../../../components/organisms/Header";

import useStore from "../../../store";

const Stage2 = () => {
  const chooseAnimal = useStore((state: any) => state.chooseAnimal);
  const setChooseAnimal = useStore((state: any) => state.setChooseAnimal);

  const handleChooseAnimal = () => {
    setChooseAnimal(false);
  };

  return (
    <>
      <Header />
      {chooseAnimal && (
        <Intro
          children={
            <>
              다음 화면에서 나오는 동물들 중에서
              <br />
              <span className="text-greenDark">내가 되고싶은 동물 4가지</span>를
              골라보자.
              <p> </p>
              <br />
              <br />
              <p><span className="text-greenDark">확인 버튼</span>을 누르면 다음 화면으로 이동할 거야.</p>
            </>
          }
          handleChooseAnimal={handleChooseAnimal}
        />
      )}
      {!chooseAnimal && <ChooseAnimal />}
    </>
  );
};
export default Stage2;
