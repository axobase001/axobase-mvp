'use client';

interface Agent {
  id: string;
  balance: number;
  age: number;
  stage: string;
  status: string;
  strategy: string;
}

interface Props {
  agents: Agent[];
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'alive': return 'bg-green-500';
    case 'critical': return 'bg-red-500 animate-pulse';
    case 'dead': return 'bg-gray-600';
    default: return 'bg-blue-500';
  }
};

const getStageIcon = (stage: string) => {
  switch (stage) {
    case 'neonate': return '👶';
    case 'juvenile': return '🧒';
    case 'adult': return '🧑';
    case 'senescent': return '👴';
    default: return '❓';
  }
};

const getBalanceColor = (balance: number) => {
  if (balance < 1) return 'text-red-400';
  if (balance < 5) return 'text-yellow-400';
  return 'text-green-400';
};

export function AgentList({ agents }: Props) {
  return (
    <div className="bg-axo-panel rounded-lg border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-xl font-semibold text-white">Agent 列表</h2>
      </div>
      <div className="divide-y divide-gray-800">
        {agents.map((agent) => (
          <div key={agent.id} className="p-4 hover:bg-gray-800/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
                <span className="text-2xl">{getStageIcon(agent.stage)}</span>
                <div>
                  <div className="font-mono text-sm text-gray-300">{agent.id}</div>
                  <div className="text-xs text-gray-500">
                    {agent.stage} • {agent.age} ticks
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-xl font-bold ${getBalanceColor(agent.balance)}`}>
                  ${agent.balance.toFixed(2)}
                </div>
                <div className="text-xs text-gray-500">
                  策略: {agent.strategy}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
