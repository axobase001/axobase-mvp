'use client';

import { useState, useEffect } from 'react';
import { PopulationStats } from '../lib/types';
import { StatsPanel } from '../components/StatsPanel';
import { AgentList } from '../components/AgentList';
import { GeneChart } from '../components/GeneChart';
import { ControlPanel } from '../components/ControlPanel';
import { EventLog } from '../components/EventLog';

export default function Home() {
  const [stats, setStats] = useState<PopulationStats | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

  // 模拟数据获取
  useEffect(() => {
    const interval = setInterval(() => {
      // 生成模拟数据
      const mockStats: PopulationStats = {
        timestamp: Date.now(),
        totalAgents: 5,
        aliveAgents: Math.floor(Math.random() * 2) + 3,
        deadAgents: Math.floor(Math.random() * 2),
        averageBalance: parseFloat((Math.random() * 15 + 2).toFixed(2)),
        medianBalance: parseFloat((Math.random() * 10 + 2).toFixed(2)),
        minBalance: parseFloat((Math.random() * 3).toFixed(2)),
        maxBalance: parseFloat((Math.random() * 20 + 5).toFixed(2)),
        averageAge: Math.floor(Math.random() * 100),
        oldestAgent: Math.floor(Math.random() * 200 + 50),
        breedingEvents: Math.floor(Math.random() * 3),
        deathEvents: Math.floor(Math.random() * 2),
        strategyDistribution: {
          idle_conservation: 2,
          explore_web: 1,
          dex_arbitrage: 1,
          content_creation: 1,
        },
      };

      const mockAgents = [
        { id: '0x1234...5678', balance: 12.5, age: 45, stage: 'adult', status: 'alive', strategy: 'dex_arbitrage' },
        { id: '0x2345...6789', balance: 8.2, age: 32, stage: 'juvenile', status: 'alive', strategy: 'explore_web' },
        { id: '0x3456...7890', balance: 15.8, age: 78, stage: 'adult', status: 'alive', strategy: 'content_creation' },
        { id: '0x4567...8901', balance: 0.05, age: 120, stage: 'senescent', status: 'critical', strategy: 'idle_conservation' },
        { id: '0x5678...9012', balance: 3.1, age: 156, stage: 'senescent', status: 'alive', strategy: 'breed_seek' },
      ];

      setStats(mockStats);
      setAgents(mockAgents);
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const handleStart = () => {
    setIsRunning(true);
    addEvent('种群模拟已启动');
  };

  const handleStop = () => {
    setIsRunning(false);
    addEvent('种群模拟已暂停');
  };

  const handleReset = () => {
    setIsRunning(false);
    addEvent('种群已重置');
  };

  const addEvent = (message: string) => {
    setEvents(prev => [ `${new Date().toLocaleTimeString()} - ${message}`, ...prev ].slice(0, 50));
  };

  return (
    <main className="min-h-screen p-6">
      {/* Header */}
      <header className="mb-8">
        <h1 className="text-4xl font-bold text-axo-accent mb-2">
          🧬 Axobase 数字生命观测台
        </h1>
        <p className="text-gray-400">
          实时观察 AI Agent 在区块链经济中的进化过程
        </p>
      </header>

      {/* Control Panel */}
      <ControlPanel 
        isRunning={isRunning}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
      />

      {/* Stats Grid */}
      {stats && <StatsPanel stats={stats} />}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
        {/* Agent List */}
        <div className="lg:col-span-2">
          <AgentList agents={agents} />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          <GeneChart />
          <EventLog events={events} />
        </div>
      </div>
    </main>
  );
}
