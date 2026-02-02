import Intro from "../../../components/molecules/Intro/Intro";
import ChooseAnimal from "../../../components/organisms/ChooseAnimal";
import Header from "../../../components/organisms/Header";
import useStore from "../../../store";

const Stage1 = () => {
  const chooseAnimal = useStore((state: any) => state.chooseAnimal);
  const setChooseAnimal = useStore((state: any) => state.setChooseAnimal);

  const handleChooseAnimal = () => {
    setChooseAnimal(true);
  };

  return (
    <>
      <Header />
      {!chooseAnimal && (
        <Intro
          children={
            <>
              다음 화면에서 나오는 동물들 중에서
              <br />
              <span className="text-greenDark">나라고 생각하는 동물 4가지</span>
              를 골라보자. <br />{" "}
              <p>고르는게 힘들다면, 어떤 동물이 나와 닮았는지 찾아보자.</p>
              <br />
              <br />
              <p><span className="text-greenDark">확인 버튼</span>을 누르면 다음 화면으로 이동할 거야.</p>
            </>
          }
          handleChooseAnimal={handleChooseAnimal}
        />
      )}
      {chooseAnimal && <ChooseAnimal />}
    </>
  );
};
export default Stage1;
