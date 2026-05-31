import { X, Download, RefreshCw } from 'lucide-react';
import { useUpdateChecker } from '../hooks/useUpdateChecker';

export default function UpdateBanner() {
  const { newVersion, showUpdateModal, setShowUpdateModal } = useUpdateChecker();

  if (!showUpdateModal || !newVersion) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 max-w-md mx-auto">
      <div className="bg-gradient-to-r from-red-600 to-red-500 rounded-xl shadow-2xl p-4 border border-red-400/30">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <RefreshCw size={18} className="text-white flex-shrink-0 animate-spin" />
            <div>
              <p className="text-white font-semibold text-sm">
                Yangi versiya: {newVersion.version}
              </p>
              <p className="text-red-100 text-xs mt-0.5">
                {newVersion.changes[0]}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowUpdateModal(false)}
            className="text-red-200 hover:text-white"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex gap-2 mt-3">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 bg-white text-red-600 font-semibold text-xs py-2 rounded-lg hover:bg-red-50"
          >
            Sahifani yangilash
          </button>
          <a
            href={newVersion.download.windows}
            className="flex items-center gap-1 bg-red-700 text-white text-xs py-2 px-3 rounded-lg hover:bg-red-800"
          >
            <Download size={12} /> EXE
          </a>
          <a
            href={newVersion.download.android}
            className="flex items-center gap-1 bg-red-700 text-white text-xs py-2 px-3 rounded-lg hover:bg-red-800"
          >
            <Download size={12} /> APK
          </a>
        </div>
      </div>
    </div>
  );
}
