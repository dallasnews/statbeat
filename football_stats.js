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
              logoUrl
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
              logoUrl
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
  const game = gameData.data.GameByID;
  if (!game) {
    throw new Error("No game data found");
  }

  // Extract basic game info from plays
  // const lastPlay =
  //   game.playsBlob?.summary[game.playsBlob.summary.length - 1] || {};
  const homeScore = game.playsBlob?.home.teamStats.totalPoints || 0;
  const awayScore = game.playsBlob?.away.teamStats.totalPoints || 0;
  const gameDate = new Date(game.gameDateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Parse plays to find teams and players
  const plays = game.playsBlob?.summary || [];
  const teamIds = new Set(plays.map((play) => play.teamInPossessionId));
  const homeTeam = game.home.season.team;
  const homeTeamId = Array.from(teamIds)[0];
  const awayTeam = game.away.season.team;
  const awayTeamId = Array.from(teamIds)[1];

  // Helper function to get player name from ID
  const getPlayerName = (playerId) => {
    // Look in home team players
    const homePlayer = game.home?.players?.find(
      (p) => p.player.id === playerId
    );
    if (homePlayer) {
      return homePlayer.player.person.name;
    }

    // Look in away team players
    const awayPlayer = game.away?.players?.find(
      (p) => p.player.id === playerId
    );
    if (awayPlayer) {
      return awayPlayer.player.person.name;
    }

    // Fallback to player1Name if available
    const play = plays.find((p) => p.player1Id === playerId);
    return play?.player1Name || `Player ${playerId}`;
  };

  // Extract player performances from plays
  const playerStats = {};
  plays.forEach((play) => {
    if (play.player1Id) {
      const playerId = play.player1Id;
      if (!playerStats[playerId]) {
        playerStats[playerId] = {
          name: getPlayerName(playerId),
          team: play.teamInPossessionId === homeTeamId ? homeTeam : awayTeam,
          rushingYards: 0,
          passingYards: 0,
          receivingYards: 0,
          touchdowns: 0,
          receptions: 0,
          completions: 0,
          attempts: 0,
          interceptions: 0,
        };
      }

      // Update stats based on play type
      switch (play.playType) {
        case "run":
          playerStats[playerId].rushingYards += play.lengthOfPlay || 0;
          if (play.includesTouchdown) playerStats[playerId].touchdowns++;
          break;
        case "pass":
          playerStats[playerId].passingYards += play.lengthOfPlay || 0;
          playerStats[playerId].attempts++;
          if (play.completion) playerStats[playerId].completions++;
          if (play.includesTouchdown) playerStats[playerId].touchdowns++;
          break;
        case "reception":
          playerStats[playerId].receivingYards += play.lengthOfPlay || 0;
          playerStats[playerId].receptions++;
          if (play.includesTouchdown) playerStats[playerId].touchdowns++;
          break;
        case "interception":
          playerStats[playerId].interceptions++;
          break;
      }
    }
  });

  // Find top performers
  const topPerformers = Object.values(playerStats)
    .filter(
      (player) =>
        player.rushingYards > 50 ||
        player.passingYards > 50 ||
        player.receivingYards > 50
    )
    .map((player) => ({
      name: player.name,
      team: player.team,
      statline: [
        player.rushingYards > 0 ? `${player.rushingYards} rushing yards` : null,
        player.passingYards > 0 ? `${player.passingYards} passing yards` : null,
        player.receivingYards > 0
          ? `${player.receivingYards} receiving yards`
          : null,
        player.touchdowns > 0
          ? `${player.touchdowns} TD${player.touchdowns > 1 ? "s" : ""}`
          : null,
        player.receptions > 0
          ? `${player.receptions} reception${player.receptions > 1 ? "s" : ""}`
          : null,
        player.attempts > 0
          ? `${player.completions}/${player.attempts} passing`
          : null,
        player.interceptions > 0
          ? `${player.interceptions} interception${
              player.interceptions > 1 ? "s" : ""
            }`
          : null,
      ]
        .filter(Boolean)
        .join(", "),
    }))
    .sort((a, b) => {
      // Sort by total yards (rushing + passing + receiving)
      const aYards = parseInt(a.statline.match(/\d+/)?.[0] || "0");
      const bYards = parseInt(b.statline.match(/\d+/)?.[0] || "0");
      return bYards - aYards;
    })
    .slice(0, 4);

  // Turn into text paragraph:
  const contentText = topPerformers
    .map((p, i) => {
      const intro =
        i === 0
          ? `${p.name} led ${p.team}`
          : i === 1
          ? `${p.name} followed for ${p.team}`
          : `${p.name} also contributed for ${p.team}`;
      return `${intro} with ${p.statline}.`;
    })
    .join(" ");

  // Find key moments from plays
  const keyMoments = [];
  const quarters = {};
  plays.forEach((play) => {
    if (play.includesTouchdown || play.playType === "interception") {
      const quarter = play.quarter;
      if (!quarters[quarter]) {
        quarters[quarter] = [];
      }
      quarters[quarter].push(play);
    }
  });

  // Add one key moment per quarter with full player names
  Object.entries(quarters).forEach(([quarter, plays]) => {
    if (plays.length > 0) {
      const play = plays[0];
      let moment = "";
      const playerName = getPlayerName(play.player1Id);
      if (play.includesTouchdown) {
        moment = `${quarter} Quarter: ${playerName} ${play.playType.toLowerCase()}ed for a ${
          play.lengthOfPlay
        }-yard touchdown`;
      } else if (play.playType === "interception") {
        moment = `${quarter} Quarter: ${playerName} intercepted a pass`;
      }
      if (moment) keyMoments.push(moment);
    }
  });

  // Find longest scoring play with full player name
  const scoringPlays = plays.filter((play) => play.includesTouchdown);
  console.log("scoring", scoringPlays);
  const longestScoringPlay = [...scoringPlays].sort(
    (a, b) => b.lengthOfPlay - a.lengthOfPlay
  )[0];

  // Generate game comment
  const winningTeam =
    homeScore > awayScore ? homeTeam.school.name : awayTeam.school.name;
  const losingTeam =
    homeScore > awayScore ? awayTeam.school.name : homeTeam.school.name;
  const gameComment =
    game.gameStory ||
    `${winningTeam} defeated ${losingTeam} ${homeScore}-${awayScore} on ${gameDate}. ` +
      `The game was highlighted by ${topPerformers[0]?.name}'s performance with ${topPerformers[0]?.statline}.`;

  return {
    headlines: { basic: `${awayTeam} vs ${homeTeam}` },
    subheadlines: {
      basic: `${winningTeam} defeated ${losingTeam} ${homeScore}-${awayScore} on ${gameDate}`,
    },
    content_elements: [
      // {
      //   type: "Best Play",
      //   description: longestScoringPlay
      //     ? `${getPlayerName(
      //         longestScoringPlay?.player1Id
      //       )} scored the longest touchdown of the night on a ${
      //         longestScoringPlay?.lengthOfPlay
      //       }-yard ${longestScoringPlay?.playType?.toLowerCase()} in the ${longestScoringPlay?.quarter?.toLowerCase()}.`
      //     : "No scoring plays recorded.",
      // },
      {
        type: "text",
        content: "Key Moments",
      },
      {
        type: "text",
        content: keyMoments,
      },

      {
        type: "text",
        content: "Top Performers",
      },
      {
        type: "text",
        content: contentText,
      },
    ],
    home_team: { ...game.home.season.team },
    away_team: { ...game.away.season.team },
    game_comment: gameComment,
  };
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
