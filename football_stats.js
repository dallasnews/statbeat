require("dotenv").config();
const { readFile } = require("fs").promises;
const util = require("./util");
const { gql, ApolloQueryResult } = require("@apollo/client");
const React = require("react");
const ReactDOMServer = require("react-dom/server");
const _ = require("lodash");
const { initClient, upload } = require("./util");

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
  const client = await initClient();
  const Q = gql`
  query {
    GameByID(
      id: "${gameId}"
    ) {
      id
      gameDateString
      gameTimeString
      gameIsDistrict
      gameStatus
      gameStory
      playsBlob
      location {
        name
      }
      
      home {
        season {
          
          team {
            name
            teamCode
            school {
              name
               
            }
          }
          
          district {
            districtCode
            conferenceCode
            label
          } 
        }
        
        players {
          player {
             id
             person {
               name
            }
          }
          football {
             id
             passingCompletions
             passingAttempts
             passingInterceptions 
             passingYards
             rushingAttempts
             rushingYards
             receptions
             receivingYards
          }
        }
        
        football {
           totalPoints
           firstQuarterPoints
           secondQuarterPoints
           thirdQuarterPoints
           fourthQuarterPoints
           overtimePoints
           overtime2Points
           overtime3Points
           passingCompletions
           passingAttempts
           passingYards
           passingTouchdowns
           passingInterceptions
           rushingAttempts
           rushingYards
           rushingTouchdowns
           fumbles
           fumblesLost
           receptions
           receivingYards
           receivingTouchdowns
           fieldGoalsMade
           fieldGoalAttempts
           pointAfterTouchdown
           pointAfterTouchdownAttempts
           interceptionTouchdowns
           pointAfterTouchdownTwoPoints
           returnTouchdowns
           pointAfterTouchdownReturns
           firstDowns
           penalties
           penaltyYards
           pointsAllowed
           puntingYards
           punts
           touchdownPasses
           touchdownReceptions
           totalYards
           yardsAllowed
        }
      }
      away {
        season {  
          team {
            id
            name
            teamCode
            school {
              id
              name
            }
          }
          district {
            districtCode
            conferenceCode
            label
          }
        }
        
        players {
          player {
             id
             person {
               name
            }
          }
          football {
             id
             passingCompletions
             passingAttempts
             passingInterceptions 
             passingYards
             rushingAttempts
             rushingYards
             receptions
             receivingYards
          }
        }
        
        football {
           totalPoints
           firstQuarterPoints
           secondQuarterPoints
           thirdQuarterPoints
           fourthQuarterPoints
           overtimePoints
           overtime2Points
           overtime3Points
           passingCompletions
           passingAttempts
           passingYards
           passingTouchdowns
           passingInterceptions
           rushingAttempts
           rushingYards
           rushingTouchdowns
           fumbles
           fumblesLost
           receptions
           receivingYards
           receivingTouchdowns
           fieldGoalsMade
           fieldGoalAttempts
           pointAfterTouchdown
           pointAfterTouchdownAttempts
           interceptionTouchdowns
           pointAfterTouchdownTwoPoints
           returnTouchdowns
           pointAfterTouchdownReturns
           firstDowns
           penalties
           penaltyYards
           pointsAllowed
           puntingYards
           punts
           touchdownPasses
           touchdownReceptions
           totalYards
           yardsAllowed
        }
      }
    }
  }
  `;
  try {
    const response = await client.query({ query: Q });
    if (response.data.GameByID.playsBlob)
      response.data.GameByID.playsBlob = JSON.parse(
        response.data.GameByID.playsBlob
      );
    return response;
  } catch (err) {
    console.error(JSON.stringify(err, null, 2));
    return null;
  }
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
