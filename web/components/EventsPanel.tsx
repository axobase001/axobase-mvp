'use client';

import { useState, useEffect } from 'react';

interface Event {
  id: string;
  name: string;
  description: string;
  type: string;
  duration: number;
  riskLevel: number;
}

export function EventsPanel() {
  const [events, setEvents] = useState<Event[]>([]);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  useEffect(() => {
    // 模拟事件数据
    const mockEvents: Event[] = [
      { id: '1', name: 'DEX套利机会', description: 'Uniswap和SushiSwap之间有5%价差', type: 'market_opportunity', duration: 3, riskLevel: 0.4 },
      { id: '2', name: '市场恐慌', description: '大盘下跌15%，资产缩水', type: 'market_crash', duration: 8, riskLevel: 0.8 },
      { id: '3', name: 'Gas费暴涨', description: '网络拥堵，交易成本增加300%', type: 'gas_spike', duration: 4, riskLevel: 0.3 },
    ];

    const interval = setInterval(() => {
      // 随机显示事件
      if (Math.random() > 0.6) {
        const randomEvent = mockEvents[Math.floor(Math.random() * mockEvents.length)];
        setEvents(prev => {
          const exists = prev.find(e => e.id === randomEvent.id);
          if (exists) return prev;
          return [randomEvent, ...prev].slice(0, 5);
        });
      }
      setLastUpdate(new Date());
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const getEventEmoji = (type: string) => {
    const emojis: Record<string, string> = {
      market_opportunity: '📈',
      content_demand: '📝',
      data_request: '📊',
      cooperation_offer: '🤝',
      market_crash: '📉',
      scam_attempt: '🎣',
      hack_attempt: '🥷',
      gas_spike: '⛽',
      liquidity_crunch: '🏜️',
      lucky_find: '🍀',
      competition: '⚔️',
      regulatory_news: '📋',
    };
    return emojis[type] || '❓';
  };

  const getRiskColor = (level: number) => {
    if (level < 0.3) return 'text-green-400';
    if (level < 0.6) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="bg-axo-panel rounded-lg border border-gray-800 p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">🌍 环境事件</h3>
        <span className="text-xs text-gray-500">
          更新: {lastUpdate.toLocaleTimeString()}
        </span>
      </div>
      
      {events.length === 0 ? (
        <div className="text-gray-500 text-sm text-center py-4">
          市场环境平静
          <div className="text-xs mt-1">等待新事件...</div>
        </div>
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <div 
              key={event.id} 
              className="bg-gray-800/50 rounded-lg p-3 border-l-4 border-axo-accent"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-xl">{getEventEmoji(event.type)}</span>
                  <div>
                    <div className="font-medium text-white">{event.name}</div>
                    <div className="text-xs text-gray-400">{event.description}</div>
                  </div>
                </div>
                <div className="text-right text-xs">
                  <div className={getRiskColor(event.riskLevel)}>
                    风险: {Math.round(event.riskLevel * 100)}%
                  </div>
                  <div className="text-gray-500">持续: {event.duration} ticks</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="text-xs text-gray-500">
          💡 Agent 会根据自身基因特质决定是否利用这些事件
        </div>
      </div>
    </div>
  );
}
