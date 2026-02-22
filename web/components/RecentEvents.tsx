'use client';

import { useState, useEffect } from 'react';

interface EventRecord {
  id: string;
  agentId: string;
  type: 'defi' | 'task' | 'risk';
  description: string;
  amount: number;
  timestamp: Date;
}

export function RecentEvents() {
  const [events, setEvents] = useState<EventRecord[]>([]);

  useEffect(() => {
    const positiveEvents = [
      { type: 'defi' as const, desc: 'DEX套利成功', min: 0.5, max: 3 },
      { type: 'defi' as const, desc: 'Aave存款收益', min: 0.01, max: 0.5 },
      { type: 'defi' as const, desc: 'LP手续费收入', min: 0.1, max: 1.5 },
      { type: 'defi' as const, desc: '流动性挖矿奖励', min: 0.5, max: 5 },
      { type: 'task' as const, desc: '完成博客撰写', min: 5, max: 30 },
      { type: 'task' as const, desc: '数据分析任务', min: 10, max: 50 },
      { type: 'task' as const, desc: '社区管理报酬', min: 15, max: 80 },
      { type: 'task' as const, desc: '代码审查完成', min: 30, max: 200 },
    ];
    
    const negativeEvents = [
      { type: 'risk' as const, desc: '无常损失', min: -2, max: -0.5 },
      { type: 'risk' as const, desc: '滑点损失', min: -0.5, max: -0.1 },
      { type: 'risk' as const, desc: '被抢先交易', min: -1, max: -0.2 },
      { type: 'risk' as const, desc: '市场回调影响', min: -3, max: -0.5 },
      { type: 'risk' as const, desc: '交易失败损失Gas', min: -0.1, max: -0.01 },
      { type: 'risk' as const, desc: '遇到诈骗(已识别)', min: 0, max: 0 },
    ];

    const agents = ['Agent-1234', 'Agent-2345', 'Agent-3456', 'Agent-4567', 'Agent-5678'];

    const interval = setInterval(() => {
      if (Math.random() > 0.3) {
        const isPositive = Math.random() > 0.4;
        const eventList = isPositive ? positiveEvents : negativeEvents;
        const event = eventList[Math.floor(Math.random() * eventList.length)];
        const amount = parseFloat((event.min + Math.random() * (event.max - event.min)).toFixed(2));
        
        const newEvent: EventRecord = {
          id: Math.random().toString(36).substring(7),
          agentId: agents[Math.floor(Math.random() * agents.length)],
          type: event.type,
          description: event.desc,
          amount,
          timestamp: new Date(),
        };
        
        setEvents(prev => [newEvent, ...prev].slice(0, 15));
      }
    }, 1500);

    return () => clearInterval(interval);
  }, []);

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'defi': return 'text-green-400 bg-green-400/10';
      case 'task': return 'text-blue-400 bg-blue-400/10';
      case 'risk': return 'text-red-400 bg-red-400/10';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="bg-axo-panel rounded-lg border border-gray-800 p-4">
      <h3 className="text-lg font-semibold mb-4">📜 实时交易记录</h3>
      
      <div className="space-y-2 max-h-72 overflow-y-auto">
        {events.length === 0 ? (
          <div className="text-gray-500 text-sm text-center py-4">
            等待交易发生...
          </div>
        ) : (
          events.map((event) => (
            <div 
              key={event.id}
              className="flex items-center justify-between p-2 rounded bg-gray-800/30 text-sm"
            >
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-0.5 rounded text-xs ${getTypeStyle(event.type)}`}>
                  {event.type.toUpperCase()}
                </span>
                <span className="text-gray-400">{event.agentId}</span>
                <span className="text-gray-300">{event.description}</span>
              </div>
              <span className={`font-mono ${event.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {event.amount >= 0 ? '+' : ''}{event.amount.toFixed(2)}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
