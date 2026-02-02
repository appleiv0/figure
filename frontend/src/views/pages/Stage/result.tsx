import ButtonEnd from "../../../components/molecules/Widget/ButtonEnd";
import useStore from "../../../store";

const Result = () => {
  const response = useStore((state: any) => state.response);

  return (
    <>
      <div className="h-screen w-full z-20 text-center font-bold relative flex flex-col justify-center">
        <h2 className="text-[2.5rem] mb-[8.125rem]">검사결과</h2>
        <img
          className="w-[11.25rem] mx-auto mb-[2.1875rem]"
          src="assets/images/02.png"
          alt="User"
        />
        <h3 className="text-2xl">{response.message}</h3>{" "}
        <div className="mx-auto mt-8">
          <ButtonEnd />
        </div>
      </div>
    </>
  );
};

export default Result;
