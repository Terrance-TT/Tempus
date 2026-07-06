import { useState, useEffect } from "react";

export function useDeviceId() {
  const [deviceId, setDeviceId] = useState<string | null>(null);

  useEffect(() => {
    let id = localStorage.getItem("studyflow_device_id");
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem("studyflow_device_id", id);
    }
    setDeviceId(id);
  }, []);

  return deviceId;
}
