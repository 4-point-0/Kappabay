import type { Plugin } from "@elizaos/core";
import { actions, providers } from "./imports";

export const hotPotatoPlugin: Plugin = {
    name: "Hot Potato",
    description: "Hot Potato Plugin",
    actions,
    providers,
    evaluators: [],
    services: [],
    clients: [],
};

export default hotPotatoPlugin;
