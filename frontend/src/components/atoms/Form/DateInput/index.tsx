import { useState } from "react";
import Icon from "../../Icon";

type DateInputProps = {
  className: string;
  handleDateSelect: (date: Date) => void;
};

type Step = "year" | "month" | "day";

const currentYear = new Date().getFullYear();
const years = Array.from({ length: currentYear - 1920 + 1 }, (_, i) => currentYear - i);

const getDaysInMonth = (year: number, month: number): number => {
  return new Date(year, month, 0).getDate();
};

const DateInput: React.FC<DateInputProps> = ({
  className,
  handleDateSelect,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<Step>("year");
  const [selectedYear, setSelectedYear] = useState<number | null>(null);
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null);
  const [selectedDay, setSelectedDay] = useState<number | null>(null);

  const handleOpen = () => {
    setStep("year");
    setIsOpen(true);
  };

  const handleClose = () => {
    setIsOpen(false);
  };

  const handleYearSelect = (year: number) => {
    setSelectedYear(year);
    setStep("month");
  };

  const handleMonthSelect = (month: number) => {
    setSelectedMonth(month);
    setStep("day");
  };

  const handleDaySelect = (day: number) => {
    setSelectedDay(day);
    if (selectedYear && selectedMonth) {
      handleDateSelect(new Date(selectedYear, selectedMonth - 1, day));
    }
    setIsOpen(false);
  };

  const handleBack = () => {
    if (step === "month") {
      setStep("year");
    } else if (step === "day") {
      setStep("month");
    }
  };

  const formatDate = (): string => {
    if (selectedYear && selectedMonth && selectedDay) {
      return `${selectedYear}년 ${String(selectedMonth).padStart(2, "0")}월 ${String(selectedDay).padStart(2, "0")}일`;
    }
    return "";
  };

  return (
    <>
      <div
        className={`flex justify-end items-center cursor-pointer ${className}`}
        style={{ touchAction: "manipulation" }}
        onClick={handleOpen}
      >
        <span className={`text-base md:text-2xl font-semibold ${selectedDay ? "" : "text-gray-400"}`}>
          {selectedDay ? formatDate() : "생년월일 입력"}
        </span>
        <Icon icon="dropDown" width={24} height={24} className="max-w-6 ml-2" />
      </div>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={handleClose}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-[90vw] max-w-[28rem] p-5 md:p-6"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
              {step !== "year" ? (
                <button
                  onClick={handleBack}
                  className="text-sm md:text-base font-semibold text-gray-500 hover:text-gray-800"
                >
                  ← 뒤로
                </button>
              ) : (
                <div />
              )}
              <h3 className="text-lg md:text-xl font-bold text-gray-800">
                {step === "year" && "연도 선택"}
                {step === "month" && `${selectedYear}년`}
                {step === "day" && `${selectedYear}년 ${selectedMonth}월`}
              </h3>
              <button
                onClick={handleClose}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Year grid */}
            {step === "year" && (
              <div className="grid grid-cols-4 md:grid-cols-5 gap-2 max-h-[15rem] overflow-y-auto pr-1">
                {years.map((year) => (
                  <button
                    key={year}
                    onClick={() => handleYearSelect(year)}
                    className={`rounded-lg px-2 py-2.5 text-sm md:text-base font-semibold transition-colors ${
                      selectedYear === year
                        ? "bg-[#2EB500] text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {year}
                  </button>
                ))}
              </div>
            )}

            {/* Month grid */}
            {step === "month" && (
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => (
                  <button
                    key={month}
                    onClick={() => handleMonthSelect(month)}
                    className={`rounded-lg px-3 py-3 text-sm md:text-base font-semibold transition-colors ${
                      selectedMonth === month
                        ? "bg-[#2EB500] text-white"
                        : "bg-gray-100 hover:bg-gray-200 text-gray-700"
                    }`}
                  >
                    {month}월
                  </button>
                ))}
              </div>
            )}

            {/* Day grid */}
            {step === "day" && selectedYear && selectedMonth && (
              <div className="grid grid-cols-7 gap-1.5">
                {Array.from(
                  { length: getDaysInMonth(selectedYear, selectedMonth) },
                  (_, i) => i + 1
                ).map((day) => (
                  <button
                    key={day}
                    onClick={() => handleDaySelect(day)}
                    className="rounded-lg px-1 py-2.5 text-sm md:text-base font-semibold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
                  >
                    {day}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DateInput;
