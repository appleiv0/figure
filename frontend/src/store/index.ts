import { create } from "zustand";
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
  message: "",
};

const useStore = create((set) => ({
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

  setMessageUser: (message: string) => set({ message }),

  setIsLogout: (isLogout: boolean) => set({ isLogout }),
}));

export default useStore;
