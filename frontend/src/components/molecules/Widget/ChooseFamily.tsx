import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
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
  const location = useLocation();
  const userInfo = getItemLocalStorage(USER);

  const { fetchFigure } = useSetFigure();

  const SELF_LABEL = '나';

  const [showAddMember, setShowAddMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState("");
  const [inputError, setInputError] = useState(false);
  const [addedMembers, setAddedMembers] = useState<string[]>([]);
  const [isShow, setIsShow] = useState<boolean>(false);
  const [showRelatives, setShowRelatives] = useState(false);
  const [phase, setPhase] = useState<'select' | 'confirm'>('select');
  const setSelectedFamilyJosa = useStore(
    (state: any) => state.setSelectedFamilyJosa
  );
  const selectedFamilyJosa = useStore((state: any) => state.selectedFamilyJosa);
  const openModal = () => {
    setIsShow(!isShow);
  };

  // 본인 성별에 맞는 호칭만 표시 (친척은 B-2에서 펼침 메뉴로 별도 처리)
  const userGender: 'M' | 'F' = userInfo?.gender === 'Female' ? 'F' : 'M';
  const visibleOptions = chooseFamily.filter(
    (f: any) => f.visibleFor.includes(userGender) && f.group !== 'relatives'
  );
  const relativeOptions = chooseFamily.filter(
    (f: any) => f.group === 'relatives'
  );

  // 같은 라벨이 selectedFamily에 몇 개 있는지 카운트
  const getCount = (name: string) =>
    selectedFamily.filter((n: string) => n === name).length;

  // X 버튼 클릭 시 카운트 -1 (마지막 인덱스 1개 제거)
  const handleRemoveOne = (e: React.MouseEvent, name: string) => {
    e.stopPropagation();
    const lastIndex = selectedFamily.lastIndexOf(name);
    if (lastIndex === -1) return;
    const newFamily = [...selectedFamily];
    const newJosa = [...selectedFamilyJosa];
    newFamily.splice(lastIndex, 1);
    newJosa.splice(lastIndex, 1);
    setSelectedFamily(newFamily);
    setSelectedFamilyJosa(newJosa);
  };

  // 호칭 버튼 클릭 → 카운트 +1 (selectedFamily 끝에 라벨 push, 중복 허용)
  const handleButtonClick = (figure: any) => {
    // maxCount 제한 — 1명만 가능한 호칭(부모/조부모)이 이미 max이면 무시
    if (figure.maxCount !== undefined && getCount(figure.name) >= figure.maxCount) {
      return;
    }
    setSelectedFamily([...selectedFamily, figure.name]);
    setSelectedFamilyJosa([...selectedFamilyJosa, figure.josa]);
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
    const trimmed = newMemberName.trim();

    if (trimmed === "") {
      setInputError(true);
      return;
    }

    // 예약 라벨 차단
    if (trimmed === SELF_LABEL) {
      setInputError(true);
      return;
    }

    // 호칭 라벨과 중복 차단 (예: "형"을 자유 입력에 또 적는 케이스)
    if (selectedFamily.includes(trimmed) || addedMembers.includes(trimmed)) {
      setInputError(true);
      return;
    }

    const updatedMembers = [...addedMembers, trimmed];
    setAddedMembers(updatedMembers);
    setSelectedFamily([...selectedFamily, trimmed]);
    setSelectedFamilyJosa([...selectedFamilyJosa, 0]);
    setShowAddMember(false);
    setNewMemberName("");
    setIsShow(false);
  };

  const handleStartChat = async (familyForBackend?: string[]) => {
    if (location.pathname.endsWith("/stage1") || location.pathname.endsWith("/stage2")) {
      try {
        const payload: any = {
          kidName: userInfo.kidname,
          receiptNo: `${userInfo.receiptNo}`,
          stage: `${currentStep}`,
          figures: figure,
        };
        if (familyForBackend && familyForBackend.length > 0) {
          payload.family_members = familyForBackend;
        }
        const response = await fetchFigure(payload);

        if (!response) {
          console.error("API Error: No response received");
        } else {
          setCurrentStep(currentStep + 1);
          if (location.pathname.endsWith("/stage2")) {
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

  // 한국어 카운트 자연어 (1명 → "한", 2명 → "두" ...)
  const koreanCountWord = (n: number): string => {
    const map = ['', '한', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
    return map[n] || `${n}`;
  };

  // 확인 메시지 자연어 빌더 (입력순 유지)
  const buildConfirmMessage = (family: string[]): string => {
    const counts: Record<string, number> = {};
    const order: string[] = [];
    family.forEach((name) => {
      if (!(name in counts)) order.push(name);
      counts[name] = (counts[name] || 0) + 1;
    });

    const parts = order.map(name =>
      counts[name] === 1 ? name : `${name} ${koreanCountWord(counts[name])} 명`
    );
    return parts.join(', ');
  };

  // 후처리 분기: 같은 라벨이 2개 이상이면 "첫째 ○○/둘째 ○○" 식으로 unique화
  const processFamilyForBackend = (family: string[], josa: number[]) => {
    const counts: Record<string, number> = {};
    family.forEach(name => { counts[name] = (counts[name] || 0) + 1; });

    const ordinalKor = ['', '첫째 ', '둘째 ', '셋째 ', '넷째 ', '다섯째 ', '여섯째 ', '일곱째 '];

    const seenIndex: Record<string, number> = {};
    const newFamily: string[] = [];
    const newJosa: number[] = [];

    family.forEach((name, idx) => {
      if (counts[name] === 1) {
        newFamily.push(name);
        newJosa.push(josa[idx]);
      } else {
        seenIndex[name] = (seenIndex[name] || 0) + 1;
        const ordinal = ordinalKor[seenIndex[name]] || `${seenIndex[name]}번째 `;
        newFamily.push(`${ordinal}${name}`);
        newJosa.push(josa[idx]);
      }
    });

    return { newFamily, newJosa };
  };

  // "선택 완료" 클릭 → 확인 화면으로 전환
  const handleClick = () => {
    if (selectedFamily.length === 0) return;
    setPhase('confirm');
  };

  // "다시 고를래" 클릭 → 입력 화면으로 복귀 (카운트 보존)
  const handleEdit = () => {
    setPhase('select');
  };

  // "맞아" 클릭 → 본인 자동 push + 후처리 분기 + 백엔드 호출 + next stage
  const handleConfirm = async () => {
    let familyToProcess = [...selectedFamily];
    let josaToProcess = [...selectedFamilyJosa];

    // 본인을 "나"로 통일 (기존: userInfo.kidname → "나")
    if (!familyToProcess.includes(SELF_LABEL)) {
      familyToProcess = [...familyToProcess, SELF_LABEL];
      josaToProcess = [...josaToProcess, 0];
    }

    // 후처리 분기 — 같은 라벨이 둘 이상이면 첫째/둘째로 unique화
    const { newFamily, newJosa } = processFamilyForBackend(
      familyToProcess,
      josaToProcess
    );

    // 스토어 업데이트 (이후 stage들이 unique 라벨로 사용)
    setSelectedFamily(newFamily);
    setSelectedFamilyJosa(newJosa);

    // 백엔드 호출 + family_members와 함께 push
    await handleStartChat(newFamily);
  };

  return (
    <>
      <div className="relative bg-white rounded-lg ml-4 sm:ml-20 flex flex-col justify-top p-3">
        {phase === 'select' ? (
          <>
            <div className="flex flex-wrap gap-2 w-full max-w-[45.25rem]">
              {visibleOptions.map((figure: any) => {
                const count = getCount(figure.name);
                const isSelected = count > 0;
                const isMaxed = figure.maxCount !== undefined && count >= figure.maxCount;
                return (
                  <div
                    key={figure.name}
                    className={`flex gap-2 rounded-[0.625rem] ${
                      isSelected ? "bg-[#000000]" : "bg-[#DDDDDD]"
                    } ${isMaxed ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} p-2 transition-opacity`}
                    onClick={() => handleButtonClick(figure)}
                  >
                    <p
                      className={`text-xl font-bold ${
                        isSelected ? "text-white" : ""
                      }`}
                    >
                      {isSelected && figure.maxCount === undefined ? `${figure.name} ${count}명` : figure.name}
                    </p>
                    {hidden && isSelected && (
                      <span
                        onClick={(e) => handleRemoveOne(e, figure.name)}
                        className="cursor-pointer flex items-center"
                      >
                        <Icon
                          icon="cancel"
                          width={20}
                          height={20}
                          className="max-w-5"
                        />
                      </span>
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

            {/* 친척 펼침 토글 */}
            <div className="mt-3">
              <button
                type="button"
                className="text-base text-gray-600 hover:text-gray-900 underline"
                onClick={() => setShowRelatives(!showRelatives)}
              >
                {showRelatives ? '친척 접기 ▲' : '다른 친척 추가하기 ▼'}
              </button>
              {showRelatives && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {relativeOptions.map((figure: any) => {
                    const count = getCount(figure.name);
                    const isSelected = count > 0;
                    const isMaxed = figure.maxCount !== undefined && count >= figure.maxCount;
                    return (
                      <div
                        key={figure.name}
                        className={`flex gap-2 rounded-[0.625rem] ${
                          isSelected ? "bg-[#000000]" : "bg-[#DDDDDD]"
                        } ${isMaxed ? "opacity-60 cursor-not-allowed" : "cursor-pointer"} p-2 transition-opacity`}
                        onClick={() => handleButtonClick(figure)}
                      >
                        <p
                          className={`text-xl font-bold ${
                            isSelected ? "text-white" : ""
                          }`}
                        >
                          {isSelected && figure.maxCount === undefined ? `${figure.name} ${count}명` : figure.name}
                        </p>
                        {hidden && isSelected && (
                          <span
                            onClick={(e) => handleRemoveOne(e, figure.name)}
                            className="cursor-pointer flex items-center"
                          >
                            <Icon
                              icon="cancel"
                              width={20}
                              height={20}
                              className="max-w-5"
                            />
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
          </>
        ) : (
          // ─── 확인 화면 ───
          <div className="flex flex-col gap-4 p-2">
            <p className="text-xl font-bold leading-relaxed">
              {userInfo?.kidname}의 가족:<br />
              {buildConfirmMessage(selectedFamily)}<br />
              <span className="text-[#2EB500]">이게 맞아?</span>
            </p>
            <div className="flex gap-2 justify-end items-center">
              <button
                type="button"
                className="text-xl font-bold flex border border-[#CCCCCC] bg-[#FFFFFF] hover:bg-[#f3f3f3] text-black px-4 py-2 rounded-xl cursor-pointer select-none"
                onClick={handleEdit}
              >
                다시 고를래
              </button>
              <button
                type="button"
                className="text-xl font-bold flex border border-primary bg-primary text-white px-4 py-2 rounded-xl hover:bg-white hover:text-grey-800 cursor-pointer select-none"
                onClick={handleConfirm}
              >
                맞아
              </button>
            </div>
          </div>
        )}
      </div>
      <Modal
        isShowing={isShow}
        hide={openModal}
        children={
          <div className="fixed inset-0 flex items-center justify-center font-bold">
            <div className="bg-white px-9 py-7 flex flex-col rounded-lg">
              <div className="flex">
              <input
                type="text"
                value={newMemberName}
                onChange={(e) => {
                  setNewMemberName(e.target.value);
                  setInputError(false);
                }}
                placeholder="예: 새엄마, 새아빠, 위탁부모"
                className={`w-full max-w-[20rem] border ${
                  inputError ? "border-red-500" : "border-grey-300"
                } rounded-md px-4 py-2 mr-3 focus:outline-none focus:border-blue-500`}
              />

              <div className="flex space-x-2 shrink-0">
                <button
                  type="button"
                  className="px-6 py-2 bg-[#2EB500] text-white rounded-lg hover:bg-[#16A34A] focus:outline-none focus:bg-[#16A34A] cursor-pointer select-none whitespace-nowrap"
                  onClick={handleAddMember}
                >
                  추가
                </button>
                <button
                  type="button"
                  className="px-6 py-2 bg-[#EF4444] text-white rounded-lg hover:bg-[#DC2626] focus:outline-none focus:bg-[#DC2626] cursor-pointer select-none whitespace-nowrap"
                  onClick={() => setIsShow(false)}
                >
                  취소
                </button>
              </div>
              </div>
              {inputError && (
                <p className="text-red-500 text-sm mt-1">
                  이름을 적어주세요. 이미 있는 이름은 다르게 적어주세요.
                </p>
              )}
            </div>
          </div>
        }
      />
    </>
  );
};

export default ChooseFamily;
