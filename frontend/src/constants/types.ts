export interface AuthInterface {
  email: string;
  password: string;
  name?: string;
}

export interface UserInfoInterface {
  kidname: string;
  gender: "Male" | "Female" | null;
  counselor: string;
  name_counselor: string;
  selectedDate: Date | null;
}

export interface SelectCardInterface {
  name: string;
  index: number;
  img: string;
}

export interface SelectCardNewInterface {
  name: string;
  index: number;
  img: string;
}

export interface SelectCardNew6Interface {
  name: string;
  index: number;
  img: string;
}

export interface FigureInterface {
  figure: string;
  message: string;
  relation: string;
}

export interface SelectFamilyInterface {
  name: string;
  index: number;
}

export interface BrandInterface {
  brandName: string;
  brandImage: string;
  category: string;
  category_number: number;
}

export interface SelectListFigure {
  figure: string;
  relation: string;
}
