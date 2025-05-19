// get-wallet-caps.js
const { SuiClient } = require("@mysten/sui/client");

/**
 * Gets all capability objects for a wallet address
 */
async function getWalletCapabilities(address) {
  // Create client
  const suiClient = new SuiClient({
    url: "https://fullnode.testnet.sui.io:443",
  });

  // Default capability types to check
  const defaultTypes = [
    "AdminCap",
    "AgentCap",
    "OvenCap",
    "GameManagerCap",
    "KioskOwnerCap",
  ];

  try {
    // Query objects owned by address
    const { data } = await suiClient.getOwnedObjects({
      owner: address,
      options: {
        showType: true,
        showContent: true,
      },
    });

    // Initialize result object
    const capsByType = {};
    defaultTypes.forEach((type) => {
      capsByType[type] = [];
    });

    // Filter objects by type
    for (const obj of data) {
      if (obj.data?.type) {
        for (const type of defaultTypes) {
          if (obj.data.type.includes(type)) {
            if (!capsByType[type]) capsByType[type] = [];
            capsByType[type].push(obj.data.objectId);
            break;
          }
        }
      }
    }

    return capsByType;
  } catch (error) {
    console.error(`Failed to get capabilities for address ${address}:`, error);
    // Return empty result on error
    const emptyResult = {};
    defaultTypes.forEach((type) => {
      emptyResult[type] = [];
    });
    return emptyResult;
  }
}

// Get command line argument for address
const address = process.argv[2];
if (!address) {
  console.error("Please provide a wallet address as an argument");
  process.exit(1);
}

// Run the function
getWalletCapabilities(address)
  .then((result) => {
    console.log(JSON.stringify(result, null, 2));
  })
  .catch((error) => {
    console.error("Error:", error);
    process.exit(1);
  });
