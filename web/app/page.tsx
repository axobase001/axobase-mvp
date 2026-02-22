'use client';

import { useState, useEffect } from 'react';
import { PopulationStats } from '../lib/types';
import { fetchStats, fetchAgents, controlSimulation } from '../lib/api';
import { StatsPanel } from '../components/StatsPanel';
import { AgentList } from '../components/AgentList';
import { GeneChart } from '../components/GeneChart';
import { ControlPanel } from '../components/ControlPanel';
import { EventLog } from '../components/EventLog';
import { EventsPanel } from '../components/EventsPanel';
import { RecentEvents } from '../components/RecentEvents';

// Mock data generators
const generateMockStats = (): PopulationStats => ({
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
});

const generateMockAgents = () => [
  { id: '0x1234...5678', balance: 12.5, age: 45, stage: 'adult', status: 'alive', strategy: 'dex_arbitrage' },
  { id: '0x2345...6789', balance: 8.2, age: 32, stage: 'juvenile', status: 'alive', strategy: 'explore_web' },
  { id: '0x3456...7890', balance: 15.8, age: 78, stage: 'adult', status: 'alive', strategy: 'content_creation' },
  { id: '0x4567...8901', balance: 0.05, age: 120, stage: 'senescent', status: 'critical', strategy: 'idle_conservation' },
  { id: '0x5678...9012', balance: 3.1, age: 156, stage: 'senescent', status: 'alive', strategy: 'breed_seek' },
];

export default function Home() {
  const [stats, setStats] = useState<PopulationStats | null>(null);
  const [agents, setAgents] = useState<any[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const [events, setEvents] = useState<string[]>([]);
  const [useRealData, setUseRealData] = useState(false);
  const [backendConnected, setBackendConnected] = useState(false);
  const [tickSpeed, setTickSpeed] = useState(10);

  useEffect(() => {
    const checkBackend = async () => {
      const realStats = await fetchStats();
      if (realStats) {
        setBackendConnected(true);
        setUseRealData(true);
        setStats(realStats);
        addEvent('✅ 已连接到真实后端');
      } else {
        setStats(generateMockStats());
        setAgents(generateMockAgents());
        addEvent('ℹ️ 使用演示模式（后端未启动）');
      }
    };
    checkBackend();
  }, []);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (useRealData) {
        const realStats = await fetchStats();
        const realAgents = await fetchAgents();
        
        if (realStats) {
          setStats(realStats);
          setBackendConnected(true);
        } else {
          setBackendConnected(false);
        }
        
        if (realAgents) {
          setAgents(realAgents);
        }
      } else {
        setStats(generateMockStats());
        if (agents.length === 0) {
          setAgents(generateMockAgents());
        }
      }
    }, tickSpeed * 1000);

    return () => clearInterval(interval);
  }, [useRealData, agents.length, tickSpeed]);

  const addEvent = (message: string) => {
    setEvents(prev => [`${new Date().toLocaleTimeString()} - ${message}`, ...prev].slice(0, 50));
  };

  const handleStart = async () => {
    if (useRealData) {
      const success = await controlSimulation('start');
      if (success) {
        setIsRunning(true);
        addEvent('✅ 真实模拟已启动');
      } else {
        addEvent('❌ 启动失败');
      }
    } else {
      setIsRunning(true);
      addEvent('🎮 演示模式已启动');
    }
  };

  const handleStop = async () => {
    if (useRealData) {
      const success = await controlSimulation('stop');
      if (success) {
        setIsRunning(false);
        addEvent('✅ 真实模拟已暂停');
      }
    } else {
      setIsRunning(false);
      addEvent('🎮 演示模式已暂停');
    }
  };

  const handleReset = async () => {
    if (useRealData) {
      await controlSimulation('reset');
    }
    setIsRunning(false);
    setStats(generateMockStats());
    setAgents(generateMockAgents());
    addEvent('🔄 已重置');
  };

  return (
    <main className="min-h-screen p-6">
      {/* Header */}
      <header className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold text-axo-accent mb-2">
              🧬 Axobase 数字生命观测台
            </h1>
            <p className="text-gray-400">
              实时观察 AI Agent 在区块链经济中的进化过程
            </p>
          </div>
          <div className="text-right space-y-2">
            <div className={`inline-flex items-center px-4 py-2 rounded-lg ${
              backendConnected 
                ? 'bg-green-500/20 text-green-400 border border-green-500/50' 
                : 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/50'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${backendConnected ? 'bg-green-400 animate-pulse' : 'bg-yellow-400'}`} />
              {backendConnected ? '真实数据模式' : '演示模式'}
            </div>
            <div className="text-sm text-gray-500">
              Tick 间隔: {tickSpeed}s 
              <button 
                onClick={() => setTickSpeed(s => s === 10 ? 2 : 10)}
                className="ml-2 text-axo-accent hover:underline"
              >
                {tickSpeed === 10 ? '(加速)' : '(减速)'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Control Panel */}
      <ControlPanel 
        isRunning={isRunning}
        onStart={handleStart}
        onStop={handleStop}
        onReset={handleReset}
      />

      {/* Backend Status Banner */}
      {!backendConnected && (
        <div className="mb-6 bg-axo-panel border border-yellow-500/30 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <span className="text-2xl">ℹ️</span>
              <div>
                <div className="font-semibold text-yellow-400">演示模式运行中</div>
                <div className="text-sm text-gray-400">
                  当前显示模拟数据。要启动真实 Agent 模拟，请运行 START_REAL.bat
                </div>
              </div>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition-colors"
            >
              🔄 检测后端
            </button>
          </div>
        </div>
      )}

      {/* Stats Grid */}
      {stats && <StatsPanel stats={stats} />}

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
        {/* Left: Agent List */}
        <div className="lg:col-span-2">
          <AgentList agents={agents} />
        </div>

        {/* Middle: Events */}
        <div className="space-y-6">
          <EventsPanel />
          <RecentEvents />
        </div>

        {/* Right: Gene & Log */}
        <div className="space-y-6">
          <GeneChart />
          <EventLog events={events} />
        </div>
      </div>
    </main>
  );
}
