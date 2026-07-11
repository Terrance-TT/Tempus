import { useColorScheme } from "react-native";

import colors from "@/constants/colors";

export function useColors() {
  const scheme = useColorScheme();
  const palette: typeof colors.light = scheme === "dark" ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
