import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useState } from "react";

const DEVICE_ID_KEY = "studyflow_device_id";

function generateId() {
  return (
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 15)
  );
}

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDeviceId() {
      try {
        const stored = await AsyncStorage.getItem(DEVICE_ID_KEY);
        if (stored) {
          setDeviceId(stored);
        } else {
          const newId = generateId();
          await AsyncStorage.setItem(DEVICE_ID_KEY, newId);
          setDeviceId(newId);
        }
      } catch (e) {
        // Fallback for memory if async storage fails
        setDeviceId(generateId());
      } finally {
        setIsLoading(false);
      }
    }
    loadDeviceId();
  }, []);

  return { deviceId, isLoading };
}
