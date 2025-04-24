import AgentDeployer from "@/components/agent-deployer";
import Header from "@/components/header";

export default function Home() {
	return (
		<main className="min-h-screen bg-gray-50">
			<div className="container mx-auto px-4 py-8">
				<h1 className="text-3xl font-bold mb-6">Agent Launchpad Deployer</h1>
				<p className="text-gray-600 mb-8">Configure and deploy your AI agent with customizable parameters.</p>
				<AgentDeployer />
			</div>
		</main>
	);
}
