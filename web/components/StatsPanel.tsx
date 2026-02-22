'use client';

import { PopulationStats } from '../lib/types';

interface Props {
  stats: PopulationStats;
}

export function StatsPanel({ stats }: Props) {
  const statCards = [
    { label: '存活 Agent', value: stats.aliveAgents, total: stats.totalAgents, color: 'text-axo-accent' },
    { label: '平均余额', value: `$${stats.averageBalance.toFixed(2)}`, color: 'text-blue-400' },
    { label: '繁殖事件', value: stats.breedingEvents, color: 'text-pink-400' },
    { label: '死亡事件', value: stats.deathEvents, color: 'text-axo-danger' },
    { label: '最高龄', value: `${stats.oldestAgent} ticks`, color: 'text-yellow-400' },
    { label: '余额范围', value: `$${stats.minBalance.toFixed(2)} - $${stats.maxBalance.toFixed(2)}`, color: 'text-purple-400' },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
      {statCards.map((card, idx) => (
        <div key={idx} className="bg-axo-panel rounded-lg p-4 border border-gray-800">
          <div className="text-gray-400 text-sm">{card.label}</div>
          <div className={`text-2xl font-bold ${card.color}`}>
            {card.value}
            {card.total && (
              <span className="text-gray-500 text-sm"> / {card.total}</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
