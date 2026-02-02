import "flatpickr/dist/flatpickr.css";
import { useState } from "react";
import Flatpickr from "react-flatpickr";
import Icon from "../../Icon";

type DateInputProps = {
  className: string;
  handleDateSelect: (date: Date) => void;
};

const DateInput: React.FC<DateInputProps> = ({
  className,
  handleDateSelect,
}) => {
  const [date, setDate] = useState<Date>();
  const flatpickrOptions = {
    altInput: true,
    altFormat: "Y년 m월 d일",
    dateFormat: "Y년 m월 d일",
    disableMobile: false,
    clickOpens: true,
    locale: {
      weekdays: {
        shorthand: ["일", "월", "화", "수", "목", "금", "토"],
        longhand: [
          "일요일",
          "월요일",
          "화요일",
          "수요일",
          "목요일",
          "금요일",
          "토요일",
        ],
      },
      months: {
        shorthand: [
          "1월",
          "2월",
          "3월",
          "4월",
          "5월",
          "6월",
          "7월",
          "8월",
          "9월",
          "10월",
          "11월",
          "12월",
        ],
        longhand: [
          "1월",
          "2월",
          "3월",
          "4월",
          "5월",
          "6월",
          "7월",
          "8월",
          "9월",
          "10월",
          "11월",
          "12월",
        ],
      },
    },
  };

  const handleDateChange = (selectedDates: Date[]) => {
    if (selectedDates.length > 0) {
      handleDateSelect(selectedDates[0]);
      setDate(selectedDates[0]);
    }
  };

  return (
    <>
      <div className="flex justify-end items-center" style={{ touchAction: 'manipulation' }}>
        <Flatpickr
          placeholder="생년월일 입력"
          options={flatpickrOptions as any}
          value={date}
          onChange={handleDateChange}
          className={`text-base md:text-2xl font-semibold focus-visible:outline-0 focus:border-primary inline-block ${className}`}
        />
        <Icon icon="dropDown" width={24} height={24} className="max-w-6" />
      </div>
    </>
  );
};

export default DateInput;
