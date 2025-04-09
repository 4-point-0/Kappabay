export interface AgentConfig {
  name: string;
  clients: string[];
  modelProvider: string;
  system: string;
  settings: {
    voice: {
      model: string;
    };
  };
  plugins: any[];
  bio: string[];
  lore: string[];
  knowledge: string[];
  messageExamples: {
    user: string;
    content: {
      text: string;
    };
  }[][];
  postExamples: string[];
  topics: string[];
  style: {
    all: string[];
    chat: string[];
    post: string[];
  };
  adjectives: string[];
}

export interface DeploymentData {
  agentConfig: AgentConfig;
  onChainData: {
    agentObjectId: string;
    agentCapId: string;
    ownerWallet: string;
    txDigest: string;
  };
}
