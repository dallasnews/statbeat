const { readFile } = require("fs").promises;
const util = require("./util");

// ======================================================================
// MAIN
// ======================================================================

let CMD = null;

if (process.argv.length > 2) CMD = process.argv[2];

async function run() {
  if (CMD === "query-game") {
    const GAME_ID = process.argv[3];
    console.error("Querying football game:", GAME_ID);
    try {
      // TODO: Implement actual game query logic
      const gameData = await queryFootballGame(GAME_ID);
      console.error(
        "======================================================================"
      );
      console.log(JSON.stringify(gameData, null, 2));
      console.error(
        "======================================================================"
      );
    } catch (err) {
      handleError(err);
    }
  } else if (CMD === "transform-game") {
    const GAME_ID = process.argv[3];
    console.error("Transforming football game:", GAME_ID);
    try {
      const gameData = await queryFootballGame(GAME_ID);
      const transformedData = transformFootballGame(gameData);
      console.error(
        "======================================================================"
      );
      console.log(JSON.stringify(transformedData, null, 2));
      console.error(
        "======================================================================"
      );
    } catch (err) {
      handleError(err);
    }
  } else if (CMD === "query-transform-upload") {
    const GAME_ID = process.argv[3];
    const TEST_FLAG = process.argv[4];
    console.error("Query, transform and upload football game:", GAME_ID);
    try {
      const gameData = await queryFootballGame(GAME_ID);
      const transformedData = transformFootballGame(gameData);
      await uploadGameData(transformedData, !!TEST_FLAG);
      console.error(
        "======================================================================"
      );
      console.log("Successfully processed and uploaded game data");
      console.error(
        "======================================================================"
      );
    } catch (err) {
      handleError(err);
    }
  } else {
    throw new Error(
      "Invalid command. Available commands: query-game, transform-game, query-transform-upload"
    );
  }
}

// Helper functions
async function queryFootballGame(gameId) {
  // TODO: Implement actual API call to fetch game data
  throw new Error("queryFootballGame not implemented");
}

function transformFootballGame(gameData) {
  // TODO: Implement game data transformation logic
  throw new Error("transformFootballGame not implemented");
}

async function uploadGameData(transformedData, isTest) {
  // TODO: Implement upload logic
  throw new Error("uploadGameData not implemented");
}

function handleError(err) {
  console.error(
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  );
  console.error(err);
  console.error(
    "XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
  );
}

run()
  .then(() => {
    console.error("DONE.");
  })
  .catch((err) => {
    console.error("ERROR:", err);
    process.exit(1);
  });
