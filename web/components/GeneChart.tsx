'use client';

import { useState, useEffect } from 'react';

interface GeneData {
  name: string;
  value: number;
}

export function GeneChart() {
  const [geneData, setGeneData] = useState<GeneData[]>([
    { name: '风险偏好', value: 0.6 },
    { name: '链上亲和', value: 0.4 },
    { name: '合作倾向', value: 0.5 },
    { name: '创造力', value: 0.3 },
    { name: '分析力', value: 0.7 },
    { name: '适应速度', value: 0.5 },
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setGeneData(prev => prev.map(g => ({
        ...g,
        value: Math.max(0.1, Math.min(1, g.value + (Math.random() - 0.5) * 0.1))
      })));
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const maxValue = Math.max(...geneData.map(g => g.value));

  return (
    <div className="bg-axo-panel rounded-lg border border-gray-800 p-4">
      <h3 className="text-lg font-semibold mb-4">基因表达分布</h3>
      <div className="space-y-3">
        {geneData.map((gene) => (
          <div key={gene.name}>
            <div className="flex justify-between text-sm mb-1">
              <span className="text-gray-400">{gene.name}</span>
              <span className="text-axo-accent">{(gene.value * 100).toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-800 rounded-full h-2">
              <div
                className="bg-gradient-to-r from-axo-accent to-blue-500 h-2 rounded-full transition-all duration-500"
                style={{ width: `${(gene.value / maxValue) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
