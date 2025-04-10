// setup-final.mjs - Hot Potato Game setup script based on actual CLI output format
import { execSync } from "child_process";
import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Constants
const PACKAGE_ID =
  "0xd40628bac089616b1120705e843491f1ec3382f47828fb12bdf035057d06163d";
const CLOCK_ID = "0x6";
const RANDOM_ID = "0x8";
const GAME_DURATION_HOURS = 48; // Game duration in hours
const DEFAULT_IMAGE_URL =
  "https://placehold.co/600x400/FF5733/FFFFFF?text=HOT+POTATO+AGENT"; // Default image URL for agent

// Helper function to execute a command and return the output
function execCommand(command, description = "Command") {
  try {
    console.log(`\n[${description}] Executing: ${command}`);
    const output = execSync(command, { encoding: "utf-8" });
    console.log(`[${description}] Command completed successfully`);
    return { success: true, output };
  } catch (error) {
    console.error(`[${description}] Command failed`);
    if (error.stdout) console.log("[STDOUT]", error.stdout.toString());
    if (error.stderr) console.error("[STDERR]", error.stderr.toString());
    throw new Error(`${description} failed: ${error.message}`);
  }
}

// Function to get a gas object ID using text-based parsing
function getGasObjectId() {
  console.log("\nGetting gas objects...");
  const { output } = execCommand("sui client gas", "Get Gas");

  // Parse the gas objects output - looking for table format with IDs and balances
  const gasLines = output.split("\n").filter((line) => line.includes("0x"));
  if (gasLines.length === 0) {
    throw new Error("No gas objects available");
  }

  // Extract the first coin ID that appears in the output
  const firstCoinMatch = gasLines[0].match(/(0x[a-fA-F0-9]+)/);
  if (!firstCoinMatch) {
    throw new Error("Failed to parse gas coin ID");
  }

  const gasId = firstCoinMatch[1];
  console.log(`Selected gas object: ${gasId}`);
  return gasId;
}

// Function to extract transaction digest from command output
function extractTxDigest(output) {
  const match = output.match(/Transaction Digest: ([a-zA-Z0-9]+)/);
  if (match && match[1]) {
    return match[1];
  }
  throw new Error("Could not find transaction digest in output");
}

function extractObjectIds(output, objectTypePatterns) {
  const result = {};
  const typeToKeyMap = {
    Agent: "id",
    AdminCap: "adminCapId",
    AgentCap: "agentCapId",
    GameManager: "id",
    GameManagerCap: "gameManagerCapId",
    Oven: "id",
    OvenCap: "ovenCapId",
  };

  try {
    const objectChangesSection =
      output.split("Object Changes")[1]?.split("Balance Changes")[0] || "";

    if (!objectChangesSection) {
      console.warn("Warning: Could not find Object Changes section in output");
      return result;
    }

    const createdObjectsSection =
      objectChangesSection
        .split("Created Objects:")[1]
        ?.split("Mutated Objects:")[0] || "";

    if (createdObjectsSection) {
      const objectMatches = createdObjectsSection.matchAll(
        /ObjectID: (0x[a-fA-F0-9]+)[\s\S]*?ObjectType: ([^\n]+)/g
      );

      for (const match of objectMatches) {
        const [, objectId, objectType] = match;

        // Extract the last part of the type (after the last ::)
        const simplifiedType = objectType
          .split("::")
          .pop()
          .replace(/[│\s]/g, "");

        // Find the most specific type match
        const matchedKey = typeToKeyMap[simplifiedType];

        if (matchedKey) {
          // Ensure we don't overwrite existing keys
          if (!result[matchedKey]) {
            result[matchedKey] = objectId;
            console.log(`Matched ${matchedKey}: ${objectId}`);
          }
        }

        // Special handling for GameStatus dynamic field
        if (
          objectType.includes("0x2::dynamic_field::Field") &&
          objectType.includes("game_manager::GameStatus")
        ) {
          result.gameStatusId = objectId;
          console.log(`Found GameStatus object ID: ${objectId}`);
        }
      }
    }

    // Try to extract game ID from events if not found in object changes
    const eventsSection = output.split("Transaction Block Events")[1] || "";
    const gameCreatedEventMatch = eventsSection.match(
      /game_id[" :]+([0-9a-fx]+)/i
    );
    if (gameCreatedEventMatch) {
      result.gameId = gameCreatedEventMatch[1].trim();
      console.log(`Found Game ID in events: ${result.gameId}`);
    }
  } catch (error) {
    console.warn(`Warning: Error extracting object IDs: ${error.message}`);
  }

  return result;
}

// Save the setup info to a file
function saveSetupInfo(setupInfo) {
  const filePath = path.join(__dirname, "hot-potato-setup.json");
  fs.writeFileSync(filePath, JSON.stringify(setupInfo, null, 2));
  console.log(`\nSetup information saved to ${filePath}`);
}

// Main function
async function main() {
  console.log("Starting Hot Potato Game Setup...");
  console.log(`Using Package ID: ${PACKAGE_ID}`);

  // Setup will store all the objects we create
  const setup = {
    packageId: PACKAGE_ID,
    agent: {
      id: null,
      adminCapId: null,
      agentCapId: null,
      txDigest: null,
      imageUrl: null,
    },
    oven: {
      id: null,
      ovenCapId: null,
      txDigest: null,
    },
    gameManager: {
      id: null,
      gameManagerCapId: null,
      txDigest: null,
    },
    game: {
      id: null,
      txDigest: null,
      durationHours: GAME_DURATION_HOURS,
    },
    constants: {
      clockId: CLOCK_ID,
      randomId: RANDOM_ID,
    },
  };

  try {
    // Step 1: Create an Agent
    console.log("\n=== Creating Agent ===");

    // Get gas object
    const gasCoin = getGasObjectId();

    // Create agent with image URL parameter
    const imageUrl = process.env.AGENT_IMAGE_URL || DEFAULT_IMAGE_URL;
    console.log(`Using image URL: ${imageUrl}`);

    const createAgentCmd = `sui client call --package ${PACKAGE_ID} --module agent --function create_agent --args "[0]" "${gasCoin}" "${imageUrl}" --gas-budget 20000000`;
    const { output: agentOutput } = execCommand(createAgentCmd, "Create Agent");

    // Extract transaction digest
    const agentTxDigest = extractTxDigest(agentOutput);
    console.log(`Agent creation transaction: ${agentTxDigest}`);
    setup.agent.txDigest = agentTxDigest;
    setup.agent.imageUrl = imageUrl;

    // Extract object IDs directly from the output
    const agentObjectTypes = [
      { name: "id", typePattern: "::agent::Agent" },
      { name: "adminCapId", typePattern: "::agent::AdminCap" },
      { name: "agentCapId", typePattern: "::agent::AgentCap" },
    ];

    const agentObjects = extractObjectIds(agentOutput, agentObjectTypes);
    setup.agent.id = agentObjects.id;
    setup.agent.adminCapId = agentObjects.adminCapId;
    setup.agent.agentCapId = agentObjects.agentCapId;

    console.log(`\nAgent created successfully:
    - Agent ID: ${setup.agent.id || "Not found in output"}
    - AdminCap ID: ${setup.agent.adminCapId || "Not found in output"}
    - AgentCap ID: ${setup.agent.agentCapId || "Not found in output"}
    `);

    // Check if we have the required objects
    if (!setup.agent.id || !setup.agent.agentCapId) {
      console.warn(
        "WARNING: Could not extract all Agent object IDs. Setup may be incomplete."
      );
      // Try to extract from transaction output or other means
      // For now, save what we have
      saveSetupInfo(setup);
      throw new Error("Failed to extract Agent object IDs");
    }

    // Step 2: Create an Oven
    console.log("\n=== Creating Oven ===");

    const createOvenCmd = `sui client call --package ${PACKAGE_ID} --module hot_potato --function create_oven --args "${setup.agent.id}" "${setup.agent.agentCapId}" --gas-budget 20000000`;
    const { output: ovenOutput } = execCommand(createOvenCmd, "Create Oven");

    // Extract transaction digest
    const ovenTxDigest = extractTxDigest(ovenOutput);
    console.log(`Oven creation transaction: ${ovenTxDigest}`);
    setup.oven.txDigest = ovenTxDigest;

    // Extract object IDs directly from the output
    const ovenObjectTypes = [
      { name: "id", typePattern: "::hot_potato::Oven" },
      { name: "ovenCapId", typePattern: "::hot_potato::OvenCap" },
    ];

    const ovenObjects = extractObjectIds(ovenOutput, ovenObjectTypes);
    setup.oven.id = ovenObjects.id;
    setup.oven.ovenCapId = ovenObjects.ovenCapId;

    console.log(`\nOven created successfully:
    - Oven ID: ${setup.oven.id || "Not found in output"}
    - OvenCap ID: ${setup.oven.ovenCapId || "Not found in output"}
    `);

    // Check if we have the required objects
    if (!setup.oven.id) {
      console.warn(
        "WARNING: Could not extract Oven object ID. Setup may be incomplete."
      );
      saveSetupInfo(setup);
      throw new Error("Failed to extract Oven object ID");
    }

    // Step 3: Create a GameManager
    console.log("\n=== Creating GameManager ===");

    // Get a different gas coin for prize pool
    const prizePoolCoin = getGasObjectId();

    const createGameManagerCmd = `sui client call --package ${PACKAGE_ID} --module game_manager --function create_game_manager --args "${setup.oven.id}" "${prizePoolCoin}" --gas-budget 20000000`;
    const { output: gameManagerOutput } = execCommand(
      createGameManagerCmd,
      "Create GameManager"
    );

    // Extract transaction digest
    const gameManagerTxDigest = extractTxDigest(gameManagerOutput);
    console.log(`GameManager creation transaction: ${gameManagerTxDigest}`);
    setup.gameManager.txDigest = gameManagerTxDigest;

    // Extract object IDs directly from the output
    const gameManagerObjectTypes = [
      { name: "id", typePattern: "::game_manager::GameManager" },
      {
        name: "gameManagerCapId",
        typePattern: "::game_manager::GameManagerCap",
      },
    ];

    const gameManagerObjects = extractObjectIds(
      gameManagerOutput,
      gameManagerObjectTypes
    );
    setup.gameManager.id = gameManagerObjects.id;
    setup.gameManager.gameManagerCapId = gameManagerObjects.gameManagerCapId;

    console.log(`\nGameManager created successfully:
    - GameManager ID: ${setup.gameManager.id || "Not found in output"}
    - GameManagerCap ID: ${
      setup.gameManager.gameManagerCapId || "Not found in output"
    }
    `);

    // Check if we have the required objects
    if (!setup.gameManager.id || !setup.gameManager.gameManagerCapId) {
      console.warn(
        "WARNING: Could not extract GameManager object IDs. Setup may be incomplete."
      );
      saveSetupInfo(setup);
      throw new Error("Failed to extract GameManager object IDs");
    }

    // Step 4: Create a Game
    console.log("\n=== Creating Game ===");

    const createGameCmd = `sui client call --package ${PACKAGE_ID} --module game_manager --function create_game --args "${setup.gameManager.id}" "${setup.gameManager.gameManagerCapId}" "[${GAME_DURATION_HOURS}]" --gas-budget 20000000`;
    const { output: gameOutput } = execCommand(createGameCmd, "Create Game");

    // Extract transaction digest
    const gameTxDigest = extractTxDigest(gameOutput);
    console.log(`Game creation transaction: ${gameTxDigest}`);
    setup.game.txDigest = gameTxDigest;

    // Try to extract game ID from events
    const gameObjects = extractObjectIds(gameOutput, []);
    setup.game.id = gameObjects.gameId;

    console.log(`\nGame created successfully:
    - Game ID: ${
      setup.game.id || "Not found in output (check transaction manually)"
    }
    - Transaction Digest: ${setup.game.txDigest}
    `);

    // Save setup info
    saveSetupInfo(setup);

    console.log("\n======== SETUP COMPLETE ========");
    console.log("All objects have been created successfully.");
    console.log("Setup information has been saved to hot-potato-setup.json");
    console.log("You can now use these objects to play the Hot Potato game.");

    // Print a summary of all created objects
    console.log("\nCREATED OBJECTS SUMMARY:");
    console.log(`- Agent ID: ${setup.agent.id || "Not found"}`);
    console.log(`- AdminCap ID: ${setup.agent.adminCapId || "Not found"}`);
    console.log(`- AgentCap ID: ${setup.agent.agentCapId || "Not found"}`);
    console.log(`- Oven ID: ${setup.oven.id || "Not found"}`);
    console.log(`- OvenCap ID: ${setup.oven.ovenCapId || "Not found"}`);
    console.log(`- GameManager ID: ${setup.gameManager.id || "Not found"}`);
    console.log(
      `- GameManagerCap ID: ${
        setup.gameManager.gameManagerCapId || "Not found"
      }`
    );
    console.log(`- Game ID: ${setup.game.id || "Not found"}`);
  } catch (error) {
    console.error("\nError during setup:");
    console.error(error.message);

    // Save whatever information we have so far
    saveSetupInfo(setup);

    process.exit(1);
  }
}

// Run the main function
main().catch((error) => {
  console.error("Uncaught error:", error.message);
  process.exit(1);
});
