import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Icon from "../../../components/atoms/Icon";
import { USER } from "../../../constants/common.constant";
import { chooseFamily } from "../../../data";
import useStore from "../../../store";
import { getItemLocalStorage } from "../../../utils/helper";
import Modal from "../../atoms/Modal";
import { useSetFigure } from "../../../services/hooks/hookFigures";

const ChooseFamily = () => {
  const setSelectedCards = useStore((state: any) => state.setSelectedCards);
  const selectedFamily = useStore((state: any) => state.selectedFamily);
  const setSelectedFamily = useStore((state: any) => state.setSelectedFamily);
  const setCurrentStep = useStore((state: any) => state.setCurrentStep);
  const currentStep = useStore((state: any) => state.currentStep);
  const figure = useStore((state: any) => state.figure);
  const setFigure = useStore((state: any) => state.setFigure);

  const hidden = useStore((state: any) => state.hidden);
  const navigator = useNavigate();
  const userInfo = getItemLocalStorage(USER);

  const { fetchFigure } = useSetFigure();

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [inputError, setInputError] = useState(false);
  const [addedMembers, setAddedMembers] = useState<string[]>([]);
  const [isShow, setIsShow] = useState<boolean>(false);
  const setSelectedFamilyJosa = useStore(
    (state: any) => state.setSelectedFamilyJosa
  );
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);
  const openModal = () => {
    setIsShow(!isShow);
  };

  const handleButtonClick = (figure: any) => {
    const isSelected = selectedFamily.includes(figure.name);

    if (isSelected) {
      const updatedFamily = selectedFamily.filter(
        (name: any) => name !== figure.name
      );
      const updatedJosa = selectedFamilyJosa.filter(
        (_josa: any, index: number) =>
          index !== selectedFamily.indexOf(figure.name)
      );
      setSelectedFamily(updatedFamily);
      setSelectedFamilyJosa(updatedJosa);
    } else {
      setSelectedFamily([...selectedFamily, figure.name]);
      setSelectedFamilyJosa([...selectedFamilyJosa, figure.josa]);
    }
  };

  const handleMemberClick = (member: string) => {
    const memberIndex = selectedFamily.indexOf(member);

    if (memberIndex !== -1) {
      const updatedFamily = [...selectedFamily];
      const updatedJosa = [...selectedFamilyJosa];

      updatedFamily.splice(memberIndex, 1);
      updatedJosa.splice(memberIndex, 1);

      setSelectedFamily(updatedFamily);
      setSelectedFamilyJosa(updatedJosa);

      setAddedMembers(addedMembers.filter((name: string) => name !== member));
    }
  };

  const handleAddMember = () => {
    if (newMemberName.trim() === "") {
      setInputError(true);
      return;
    }
    const updatedMembers = [...addedMembers, newMemberName];
    setAddedMembers(updatedMembers);
    setSelectedFamily([...selectedFamily, newMemberName]);
    setSelectedFamilyJosa([...selectedFamilyJosa, 0]);
    setShowAddMember(false);
    setNewMemberName("");
    setIsShow(false);
  };

  const handleStartChat = async () => {
    if (location.pathname === "/stage1" || location.pathname === "/stage2") {
      try {
        const response = await fetchFigure({
          kidName: userInfo.kidname,
          receiptNo: `${userInfo.receiptNo}`,
          stage: `${currentStep}`,
          figures: figure,
        });

        if (!response) {
          console.error("API Error:", response.statusText);
        } else {
          setCurrentStep(currentStep + 1);
          if (location.pathname === "/stage2") {
            navigator("/stage3");
            setSelectedCards([]);
            setFigure([]);
          }
        }
      } catch (error: any) {
        console.error("Error:", error.message);
      }
    }
  };

  const handleClick = () => {
    setSelectedFamily([...selectedFamily, userInfo.kidname]);
    setSelectedFamilyJosa([...selectedFamilyJosa, 0]);

    handleStartChat();
  };

  return (
    <>
      <div className="relative bg-white rounded-lg ml-4 sm:ml-20 flex flex-col justify-top p-3">
        <div className="flex flex-wrap gap-2 w-full max-w-[45.25rem]">
          {chooseFamily.map((figure: any) => {
            const isSelected = selectedFamily.includes(figure.name);

            return (
              <div
                key={figure.name}
                className={`flex gap-2 rounded-[0.625rem] cursor-pointer ${
                  isSelected ? "bg-[#000000]" : "bg-[#DDDDDD]"
                } p-2`}
                onClick={() => handleButtonClick(figure)}
              >
                <p
                  className={`text-xl font-bold ${
                    isSelected ? "text-white" : ""
                  }`}
                >
                  {figure.name}
                </p>
                {hidden && isSelected && (
                  <Icon
                    icon="cancel"
                    width={20}
                    height={20}
                    className="max-w-5"
                  />
                )}
              </div>
            );
          })}
          {showAddMember && (
            <div className="flex gap-2 rounded-[0.625rem] bg-[#000000] p-2 cursor-pointer">
              <p className="text-xl font-bold text-white">{newMemberName}</p>
              <Icon icon="cancel" width={20} height={20} className="max-w-5" />
            </div>
          )}
          {addedMembers.map((member: string, index: number) => (
            <div
              key={`member_item${index}`}
              className="flex gap-2 rounded-[0.625rem] bg-[#000000] p-2 cursor-pointer "
              onClick={() => handleMemberClick(member)}
            >
              <p className="text-xl font-bold text-white">{member}</p>
              <Icon icon="cancel" width={20} height={20} className="max-w-5" />
            </div>
          ))}
        </div>
        <div className="flex gap-2 justify-end items-center mt-2">
          <button
            className="text-xl font-bold flex items-center border border-[#CCCCCC] bg-[#FFFFFF] hover:bg-[#f3f3f3] text-black px-2 py-2 rounded-xl ml-6    "
            onClick={openModal}
          >
            <Icon
              icon="plus"
              width={20}
              height={18}
              className="max-w-5 hover:text-white"
            />
            <p>추가</p>
          </button>
          {selectedFamily.length > 0 && (
            <button
              type="button"
              className="text-xl font-bold flex border border-primary bg-primary text-white px-2 py-2 rounded-xl hover:bg-white hover:text-grey-800 cursor-pointer select-none"
              onClick={handleClick}
            >
              선택 완료
            </button>
          )}
        </div>
      </div>
      <Modal
        isShowing={isShow}
        hide={openModal}
        children={
          <div className="fixed inset-0 flex items-center justify-center font-bold">
            <div className="bg-white px-9 py-7  flex rounded-lg">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => {
                  setNewMemberName(e.target.value);
                  setInputError(false);
                }}
                placeholder="회원 이름을 입력해주세요."
                className={`w-full max-w-[20rem] border ${
                  inputError ? "border-red" : "border-grey-300"
                } rounded-md px-4 py-2 mr-3 focus:outline-none focus:border-blue-500`}
              />

              <div className="flex justify-center space-x-2">
                <button
                  type="button"
                  className="px-4 py-2 bg-[#2EB500] text-white rounded-lg hover:bg-[#16A34A] focus:outline-none focus:bg-[#16A34A] cursor-pointer select-none"
                  onClick={handleAddMember}
                >
                  추가하다
                </button>
                <button
                  type="button"
                  className="px-4 py-2 bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] focus:outline-none focus:bg-[#DC2626] cursor-pointer select-none"
                  onClick={() => setIsShow(false)}
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        }
      />
    </>
  );
};

export default ChooseFamily;
