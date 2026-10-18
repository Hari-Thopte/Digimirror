import { createContext, useContext } from "react";
import { useReducedMotion } from "framer-motion";
export const MotionPreference = createContext(false);
export const useMotionPreference = () => useContext(MotionPreference);
export const useAppReducedMotion = () => {
  const os = useReducedMotion();
  const chosen = useMotionPreference();
  return !!os || chosen;
};
