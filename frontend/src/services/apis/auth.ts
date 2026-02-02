import { restTransport } from "../../utils/api";

const { post } = restTransport();

export const CreateReceipt = async (body: any) => {
  return await post("/createReceiptNo", body);
};

// export const createAccountAndSignIn = async (body: any) => {
//   return await post("/createAccountAndSignIn", body);
// };
