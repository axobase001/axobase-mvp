'use client';

import { useState, useEffect } from 'react';

interface Event {
  id: string;
  name: string;
  description: string;
  type: string;
  emoji: string;
}

export function EventsPanel() {
  const [events, setEvents] = useState<Event[]>([]);

  useEffect(() => {
    const allEvents = [
      // DeFi opportunities
      { id: '1', name: 'DEX套利机会', description: '价差套利，收益≤5%余额', type: 'defi', emoji: '📈' },
      { id: '2', name: 'Aave存款收益', description: 'USDC活期，稳定低收益', type: 'defi', emoji: '🏦' },
      { id: '3', name: 'ETH/USDC LP', description: '流动性挖矿，有锁仓期', type: 'defi', emoji: '💧' },
      { id: '4', name: '高收益农场', description: '高风险高回报，可能归零', type: 'defi', emoji: '🌾' },
      // Human tasks - REALISTIC micro-task rates (max 5% of 10U = $0.5)
      { id: '5', name: '数据标注', description: '$0.1-0.3 微任务', type: 'task', emoji: '🏷️' },
      { id: '6', name: '内容点赞', description: '$0.05-0.1 社交任务', type: 'task', emoji: '👍' },
      { id: '7', name: 'Discord活跃', description: '$0.3-1 社区互动', type: 'task', emoji: '💬' },
      { id: '8', name: '问卷调查', description: '$0.5-1.5 偶尔出现', type: 'task', emoji: '📋' },
      // Risks
      { id: '9', name: '市场回调', description: '大盘下跌10%', type: 'risk', emoji: '📉' },
      { id: '10', name: '无常损失', description: 'LP头寸价值下降', type: 'risk', emoji: '⚠️' },
      { id: '11', name: '钓鱼攻击', description: '恶意链接尝试', type: 'risk', emoji: '🎣' },
      { id: '12', name: '项目方跑路', description: '协议Rug Pull', type: 'risk', emoji: '🏃' },
    ];

    const interval = setInterval(() => {
      const shuffled = [...allEvents].sort(() => 0.5 - Math.random());
      setEvents(shuffled.slice(0, 5));
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'defi': return 'border-green-500/50 bg-green-500/10';
      case 'task': return 'border-blue-500/50 bg-blue-500/10';
      case 'risk': return 'border-red-500/50 bg-red-500/10';
      default: return 'border-gray-500/50';
    }
  };

  return (
    <div className="bg-axo-panel rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🌍 市场动态</h3>
        <div className="flex space-x-2 text-xs">
          <span className="px-2 py-1 rounded bg-green-500/20 text-green-400">DeFi</span>
          <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400">任务</span>
          <span className="px-2 py-1 rounded bg-red-500/20 text-red-400">风险</span>
        </div>
      </div>
      
      <div className="space-y-2">
        {events.map((event) => (
          <div 
            key={event.id} 
            className={`p-3 rounded-lg border ${getTypeColor(event.type)} transition-all`}
          >
            <div className="flex items-center space-x-3">
              <span className="text-xl">{event.emoji}</span>
              <div className="flex-1">
                <div className="font-medium text-sm">{event.name}</div>
                <div className="text-xs text-gray-400">{event.description}</div>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 text-xs text-gray-500">
        💡 Agent 根据基因特质自动选择参与/规避风险
      </div>
    </div>
  );
}
