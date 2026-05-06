import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  FigureInterface,
  SelectCardInterface,
  SelectCardNew6Interface,
  SelectCardNewInterface,
  SelectFamilyInterface,
  UserInfoInterface,
} from "../constants/types";

type State = {
  accessToken: string;
  userInfo: UserInfoInterface;
  isLogout: boolean;
  selectedCards: SelectCardInterface[];
  selectedCardsNew: SelectCardNewInterface[];
  selectedCardsNew6: SelectCardNew6Interface[];
  selectedFamily: SelectFamilyInterface[];
  selectedFamilyJosa: [];
  figure: FigureInterface[];
  response: [];

  hidden: boolean;
  chooseAnimal: boolean;
  currentIndex: number;
  currentStep: number;
  currentMemberIndex: number;
  lastHydratedReceiptNo: number | string | null;
  message: string;
};

const initialState: State = {
  accessToken: "",
  isLogout: false,
  userInfo: {
    kidname: "",
    gender: null,
    counselor: "",
    name_counselor: "",
    selectedDate: null,
  },
  selectedCards: [],
  selectedCardsNew: [],
  selectedCardsNew6: [],
  selectedFamily: [],
  selectedFamilyJosa: [],
  figure: [],
  response: [],
  hidden: true,
  chooseAnimal: false,
  currentIndex: 0,
  currentStep: 0,
  currentMemberIndex: 0,
  lastHydratedReceiptNo: null,
  message: "",
};

const useStore = create(
  persist(
    (set) => ({
      ...initialState,
      setAccessToken: (accessToken: string) => set({ accessToken }),

      setUserInfo: (userInfo: UserInfoInterface) =>
        set((state: any) => ({
          ...state,
          userInfo: { ...state.userInfo, ...userInfo },
        })),

      setSelectedCards: (selectedCards: SelectCardInterface[]) =>
        set((state: any) => ({
          ...state,
          selectedCards: selectedCards,
        })),

      setSelectedCardsNew: (selectedCardsNew: SelectCardInterface[]) =>
        set((state: any) => ({
          ...state,
          selectedCardsNew: selectedCardsNew,
        })),

      setSelectedCardsNew6: (selectedCardsNew6: SelectCardNew6Interface[]) =>
        set((state: any) => ({
          ...state,
          selectedCardsNew6: selectedCardsNew6,
        })),

      setSelectedFamily: (selectedFamily: SelectFamilyInterface[]) =>
        set((state: any) => ({
          ...state,
          selectedFamily: selectedFamily,
        })),

      setFigure: (figure: FigureInterface[]) =>
        set((state: any) => ({
          ...state,
          figure: figure,
        })),

      setResponse: (response: []) => set(() => ({ response })),

      setHidden: (hidden: boolean) => set({ hidden }),

      setSelectedFamilyJosa: (selectedFamilyJosa: []) =>
        set(() => ({ selectedFamilyJosa })),

      setCurrentIndex: (currentIndex: number) => set({ currentIndex }),

      setChooseAnimal: (chooseAnimal: boolean) => set({ chooseAnimal }),

      setCurrentStep: (currentStep: number) => set({ currentStep }),

      setCurrentMemberIndex: (currentMemberIndex: number) => set({ currentMemberIndex }),

      setLastHydratedReceiptNo: (lastHydratedReceiptNo: number | string | null) => set({ lastHydratedReceiptNo }),

      setMessageUser: (message: string) => set({ message }),

      setIsLogout: (isLogout: boolean) => set({ isLogout }),
    }),
    {
      name: 'abuse-therapy-store',
      storage: {
        getItem: (name: string) => {
          const str = localStorage.getItem(name);
          return str ? JSON.parse(str) : null;
        },
        setItem: (name: string, value: unknown) => {
          localStorage.setItem(name, JSON.stringify(value));
        },
        removeItem: (name: string) => {
          localStorage.removeItem(name);
        },
      },
      partialize: (state: any) => ({
        currentStep: state.currentStep,
        currentMemberIndex: state.currentMemberIndex,
        selectedFamily: state.selectedFamily,
        selectedFamilyJosa: state.selectedFamilyJosa,
        response: state.response,
        selectedCards: state.selectedCards,
        selectedCardsNew: state.selectedCardsNew,
        selectedCardsNew6: state.selectedCardsNew6,
        figure: state.figure,
        currentIndex: state.currentIndex,
      }),
    }
  )
);

export default useStore;
