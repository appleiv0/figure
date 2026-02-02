import dayjs from "dayjs";
import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { USER } from "../../../constants/common.constant";
import { useCreatReceipt } from "../../../services/hooks/hookAuth";
import {
  removeItemLocalStorage,
  setItemLocalStorage,
} from "../../../utils/helper";
import SubmitButton from "../../atoms/Form/Button/SubmitButton";
import DateInput from "../../atoms/Form/DateInput";
import FormLayout from "../../atoms/Form/FormLayout";
import TextField from "../../atoms/Form/InputField/TextField";

interface AuthInterface {
  kidname: string;
  gender: "Male" | "Female" | null;
  counselor: string;
  name_counselor: string;
  selectedDate: Date | any;
}

const InforUser: React.FC = () => {
  const [, setSelectedDate] = useState<Date | null>(new Date());
  const [selectedDatecolor, setSelectedDatecolor] = useState<string | null>(
    null
  );
  const navigator = useNavigate();
  const { fetchReceipt } = useCreatReceipt();

  const form = useForm<AuthInterface>({
    defaultValues: {
      kidname: "",
      gender: null,
      counselor: "",
      name_counselor: "",
      selectedDate: null,
    },
  });

  const formWatch = form.watch();
  const checkDisable =
    !formWatch.kidname ||
    !formWatch.gender ||
    !formWatch.counselor ||
    !formWatch.name_counselor ||
    !formWatch.selectedDate;

  const handleChangeDateFilter = (date: Date) => {
    setSelectedDate(date);
    form.setValue("selectedDate", date, { shouldValidate: true, shouldDirty: true });
    setSelectedDatecolor("Green");
  };

  const handleClear = () => {
    form.reset();
    setSelectedDate(new Date());
  };

  const handleRegister = async () => {
    const formData = form.getValues();
    const birthDate = formData.selectedDate
      ? dayjs(formData.selectedDate, "yyyyMMdd")
      : "";
    try {
      const response = await fetchReceipt({
        counselor: {
          name: formData.name_counselor,
          organization: formData.counselor,
        },
        kid: {
          birth: birthDate,
          name: formData.kidname,
          sex: formData.gender,
        },
        agree: true,
      });

      if (!response) {
        console.error("API Error: No response received");
        toast.error("서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
        return;
      }

      if (response) {
        setItemLocalStorage(USER, {
          kidname: formData.kidname,
          selectedDate: formData.selectedDate,
          receiptNo: response.receiptNo,
          endWord: response.endWord,
        });
        navigator("/information");
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      toast.error("오류가 발생했습니다: " + error.message);
    }
  };

  useEffect(() => {
    removeItemLocalStorage(USER);
  }, []);

  return (
    <div className="container-xs mx-auto px-4 md:px-0">
      <div className="w-full min-h-screen flex flex-col justify-center font-bold py-8 md:py-0">
        {/* 제목 - 모바일에서 더 작은 폰트 */}
        <h1 className="text-center text-grey-800 mb-6 md:mb-10 text-xl md:text-[2.5rem] font-extrabold tracking-widest">
          상담 정보를 입력하세요
        </h1>

        <FormLayout>
          {/* 이름 필드 */}
          <TextField
            className="text-left md:text-end mb-4 md:mb-5"
            form={form}
            name="kidname"
            placeholder="이름을 입력해주세요"
            type="text"
            required
            label="이름"
          />

          {/* 성별 필드 - 모바일 대응 */}
          <div
            className={`border-[0.125rem] border-solid rounded-[0.625rem] ${form.getValues("gender") ? "border-[#2EB500]" : "border-white"
              } w-full bg-white px-4 py-3 md:px-6 md:py-[1.375rem] mb-4 md:mb-5`}
          >
            {/* 모바일: 세로 배치, PC: 가로 배치 */}
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0">
              <label className="text-xl md:text-3xl text-grey-600">
                성별
              </label>

              <div className="flex justify-start md:justify-end gap-6 md:gap-10 text-base md:text-2xl">
                <label
                  className={`cursor-pointer radio-input text-grey-500 flex items-center ${formWatch.gender === "Male" ? "active" : ""
                    }`}
                >
                  <input
                    className="mr-2"
                    type="radio"
                    value="Male"
                    {...form.register("gender")}
                    style={{ transform: "scale(1.25)" }}
                  />
                  남자
                </label>

                <label
                  className={`cursor-pointer radio-input text-grey-500 flex items-center ${formWatch.gender === "Female" ? "active" : ""
                    }`}
                >
                  <input
                    className="mr-2"
                    type="radio"
                    value="Female"
                    {...form.register("gender")}
                    style={{ transform: "scale(1.25)" }}
                  />
                  여자
                </label>
              </div>
            </div>
          </div>

          {/* 생년월일 필드 - 모바일 대응 */}
          <div
            className={`border-[0.125rem] border-solid rounded-[0.625rem] ${selectedDatecolor === "Green"
              ? "border-[#2EB500]"
              : form.formState.isSubmitted &&
                form.watch("selectedDate") === null
                ? "border-red"
                : "border-white"
              } w-full bg-white px-4 py-3 md:px-6 md:py-[1.375rem] mb-4 md:mb-5`}
          >
            <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-3 md:gap-0">
              <label className="text-xl md:text-3xl text-grey-600">
                생년월일
              </label>
              <DateInput
                className="cursor-pointer w-full md:max-w-[13.125rem] text-left md:text-right"
                handleDateSelect={handleChangeDateFilter}
              />
            </div>
          </div>

          {/* 상담기관 필드 */}
          <TextField
            className="text-left md:text-end mb-4 md:mb-5"
            form={form}
            name="counselor"
            placeholder="상담기관명을 입력해주세요"
            type="text"
            required
            label="상담기관"
          />

          {/* 상담사 필드 */}
          <TextField
            className="text-left md:text-end mb-4 md:mb-5"
            form={form}
            name="name_counselor"
            placeholder="상담사명을 입력해주세요"
            type="text"
            required
            label="상담사"
          />

          {/* 버튼 영역 - 모바일에서 전체 너비 */}
          <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-5 pt-4 md:pt-5">
            <SubmitButton
              className="py-3 md:py-4 px-8 md:px-10 text-white text-xl md:text-3xl font-extrabold rounded-[0.625rem] bg-grey-600 focus:outline-none hover:bg-grey-700 w-full md:w-auto"
              onClick={handleClear}
            >
              취소
            </SubmitButton>
            <SubmitButton
              className={`py-3 md:py-4 px-8 md:px-10 text-white text-xl md:text-3xl font-extrabold border rounded-[0.625rem] focus:outline-none w-full md:w-auto min-h-[48px] ${checkDisable
                ? "border-grey-300 bg-grey-300 cursor-not-allowed"
                : "border-primary bg-primary hover:bg-white hover:text-greenDark active:bg-green-600"
                }`}
              onClick={!checkDisable ? form.handleSubmit(handleRegister) : undefined}
              disabled={checkDisable}
            >
              확인
            </SubmitButton>
          </div>
        </FormLayout>
      </div>
      <ToastContainer />
    </div>
  );
};

export default InforUser;
