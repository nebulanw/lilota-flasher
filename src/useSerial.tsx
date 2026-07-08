import { useContext } from "react";
import { SerialContext } from "./SerialContext";

export const useSerial = () => {
  const context = useContext(SerialContext);
  if (!context) throw new Error('useSerial must be used within a SerialProvider');
  return context;
}
