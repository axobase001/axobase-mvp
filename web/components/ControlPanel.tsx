'use client';

interface Props {
  isRunning: boolean;
  onStart: () => void;
  onStop: () => void;
  onReset: () => void;
}

export function ControlPanel({ isRunning, onStart, onStop, onReset }: Props) {
  return (
    <div className="bg-axo-panel rounded-lg border border-gray-800 p-4 mb-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className={`w-3 h-3 rounded-full ${isRunning ? 'bg-green-500 animate-pulse' : 'bg-gray-500'}`} />
          <span className="text-gray-300">
            状态: {isRunning ? '运行中' : '已暂停'}
          </span>
        </div>

        <div className="flex space-x-3">
          {!isRunning ? (
            <button
              onClick={onStart}
              className="px-6 py-2 bg-axo-accent text-black font-semibold rounded-lg hover:bg-teal-400 transition-colors"
            >
              ▶ 开始模拟
            </button>
          ) : (
            <button
              onClick={onStop}
              className="px-6 py-2 bg-axo-warning text-black font-semibold rounded-lg hover:bg-yellow-400 transition-colors"
            >
              ⏸ 暂停
            </button>
          )}
          
          <button
            onClick={onReset}
            className="px-6 py-2 bg-gray-700 text-white font-semibold rounded-lg hover:bg-gray-600 transition-colors"
          >
            🔄 重置
          </button>
        </div>

        <div className="text-sm text-gray-500">
          <span className="mr-4">⏱️ 刷新: 2s</span>
          <span>🔗 Base Sepolia</span>
        </div>
      </div>
    </div>
  );
}
