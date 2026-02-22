/**
 * Agent Network Tools
 * Inter-agent communication (in-memory for MVP)
 */

import { AgentId } from '../genome/types.js';

export type SignalType = 'distress' | 'breed_request' | 'breed_accept' | 'cooperation_offer' | 'cooperation_accept' | 'info_share';

export interface Signal {
  id: string;
  from: AgentId;
  to: AgentId | 'broadcast';
  type: SignalType;
  payload: unknown;
  timestamp: number;
}

const messageQueue = new Map<AgentId, Signal[]>();

export const sendSignal = (from: AgentId, to: AgentId | 'broadcast', type: SignalType, payload: unknown = {}): void => {
  const signal: Signal = {
    id: Math.random().toString(36).substring(2, 15),
    from,
    to,
    type,
    payload,
    timestamp: Date.now(),
  };
  
  if (to === 'broadcast') {
    for (const [agentId, queue] of messageQueue) {
      if (agentId !== from) {
        queue.push(signal);
      }
    }
  } else {
    const queue = messageQueue.get(to) || [];
    queue.push(signal);
    messageQueue.set(to, queue);
  }
};

export const getSignals = (agentId: AgentId): Signal[] => {
  const queue = messageQueue.get(agentId) || [];
  messageQueue.set(agentId, []);
  return queue;
};

export const peekSignals = (agentId: AgentId): Signal[] => {
  return messageQueue.get(agentId) || [];
};

export const initializeAgentQueue = (agentId: AgentId): void => {
  messageQueue.set(agentId, []);
};

export const clearAgentQueue = (agentId: AgentId): void => {
  messageQueue.delete(agentId);
};
