import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';

interface VersionInfo {
  version: string;
  build: number;
  changes: string[];
  download: { windows: string; android: string };
}

const CURRENT_VERSION = '1.0.0';
const CURRENT_BUILD = 1;

export function useUpdateChecker() {
  const [newVersion, setNewVersion] = useState<VersionInfo | null>(null);
  const [showUpdateModal, setShowUpdateModal] = useState(false);

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('/version.json?t=' + Date.now());
        const data: VersionInfo = await res.json();
        if (data.build > CURRENT_BUILD) {
          setNewVersion(data);
          setShowUpdateModal(true);
          toast.custom((t) => (
            `🚀 Yangi versiya: ${data.version}`
          ) as any, { duration: 8000 });
        }
      } catch {}
    };

    check();
    const interval = setInterval(check, 30 * 60 * 1000); // 30 min
    return () => clearInterval(interval);
  }, []);

  return { newVersion, showUpdateModal, setShowUpdateModal };
}
