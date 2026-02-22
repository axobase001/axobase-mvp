'use client';

import { useState, useEffect } from 'react';

interface EventRecord {
  id: string;
  agentId: string;
  agentName: string;
  eventName: string;
  impact: number;
  description: string;
  timestamp: Date;
}

export function RecentEvents() {
  const [events, setEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    const descriptions = [
      { event: 'DEX套利机会', good: '成功套利赚取', bad: '套利失败损失' },
      { event: '内容创作', good: '内容获打赏', bad: '内容无人问津' },
      { event: '数据分析任务', good: '完成分析任务获得', bad: '分析错误被扣款' },
      { event: '合作提议', good: '合作成功分成', bad: '合作失败损失' },
      { event: '市场恐慌', good: '做空获利', bad: '资产缩水' },
      { event: '钓鱼诈骗', good: '识破骗局避免损失', bad: '被骗点击损失' },
      { event: '空投领取', good: '领取空投价值', bad: '错过空投' },
      { event: 'Gas费暴涨', good: '节省Gas', bad: '支付高额Gas费' },
    ];

    const agents = ['Agent-0x1234', 'Agent-0x2345', 'Agent-0x3456', 'Agent-0x4567', 'Agent-0x5678'];

    const interval = setInterval(() => {
      if (Math.random() > 0.4) {
        const desc = descriptions[Math.floor(Math.random() * descriptions.length)];
        const isGood = Math.random() > 0.4;
        const amount = parseFloat((Math.random() * 3 + 0.1).toFixed(2));
        
        const newEvent: EventRecord = {
          id: Math.random().toString(36).substring(7),
          agentId: agents[Math.floor(Math.random() * agents.length)],
          agentName: `Agent-${Math.floor(Math.random() * 1000)}`,
          eventName: desc.event,
          impact: isGood ? amount : -amount,
          description: isGood ? `${desc.good} $${amount}` : `${desc.bad} $${amount}`,
          timestamp: new Date(),
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, 20));
      }
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-axo-panel rounded-lg border border-gray-800 p-4">
      <h3 className="text-lg font-semibold mb-4">📜 最新事件记录</h3>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">
            等待事件发生...
          </div>
        ) : (
          events.map((event) => (
            <div 
              key={event.id}
              className="flex items-center justify-between p-2 rounded-lg bg-gray-800/30 text-sm"
            >
              <div className="flex items-center space-x-2">
                <span className={event.impact > 0 ? 'text-green-400' : 'text-red-400'}>
                  {event.impact > 0 ? '▲' : '▼'}
                </span>
                <span className="text-gray-400">{event.agentName}</span>
                <span className="text-gray-300">{event.description}</span>
              </div>
              <span className={`font-mono ${event.impact > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {event.impact > 0 ? '+' : ''}{event.impact.toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
