'use client';

interface Agent {
  id: string;
  name?: string;
  balance: number;
  liquidCapital?: number;
  lockedCapital?: number;
  age: number;
  stage: string;
  status: string;
  strategy?: string;
  llmStats?: {
    totalCalls: number;
    callsThisTick: number;
    lastThinkingAgo: string;
  };
}

interface Props {
  agents: Agent[] | { maternalHealth?: any; agents: Agent[] };
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
  // Handle both old format (array) and new format (object with agents property)
  const agentList = Array.isArray(agents) ? agents : agents?.agents || [];
  
  return (
    <div className="bg-axo-panel rounded-lg border border-gray-800 overflow-hidden">
      <div className="p-4 border-b border-gray-800">
        <h2 className="text-xl font-semibold text-white">Agent 列表</h2>
      </div>
      <div className="divide-y divide-gray-800">
        {agentList.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            暂无 Agent 数据
          </div>
        ) : (
          agentList.map((agent) => (
            <div key={agent.id} className="p-4 hover:bg-gray-800/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`w-3 h-3 rounded-full ${getStatusColor(agent.status)}`} />
                  <span className="text-2xl">{getStageIcon(agent.stage)}</span>
                  <div>
                    <div className="font-semibold text-white">
                      {agent.name || `Bot-${agent.id.slice(0, 6)}`}
                    </div>
                    <div className="font-mono text-xs text-gray-400">{agent.id.slice(0, 16)}...</div>
                    <div className="text-xs text-gray-500">
                      {agent.stage} • {agent.age} ticks
                      {agent.llmStats && (
                        <span className="ml-2 text-blue-400">
                          🧠 {agent.llmStats.totalCalls}次思考
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xl font-bold ${getBalanceColor(agent.balance)}`}>
                    ${agent.balance.toFixed(2)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {agent.lockedCapital && agent.lockedCapital > 0 ? (
                      <span>锁定: ${agent.lockedCapital.toFixed(2)}</span>
                    ) : (
                      <span>策略: {agent.strategy || 'idle'}</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
