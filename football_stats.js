require("dotenv").config();
const { gql } = require("@apollo/client");
const { initClient } = require("./util");
const { publishStory } = require("./create_story");

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
    console.error("Query, transform and upload football game:", GAME_ID);
    try {
      const gameData = await queryFootballGame(GAME_ID);
      const transformedData = transformFootballGame(gameData);
      console.log("transformedData:", transformedData);
      await uploadGameData(transformedData);
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

/**
 * Transforms raw football game data into a structured format for publishing to ARC CMS
 * This function processes the raw GraphQL response and extracts key game elements:
 * - Team and player statistics
 * - Key moments and scoring plays
 * - Game narrative and headlines
 * - Featured images and content structure
 *
 * @param {Object} gameData - Raw game data from GraphQL query
 * @returns {Object} Transformed data ready for publishing
 */
function transformFootballGame(gameData) {
  // Extract the main game object from the GraphQL response
  const game = gameData.data.GameByID;
  if (!game) {
    throw new Error("No game data found");
  }

  // Extract basic game information
  const homeScore = game.playsBlob?.home.teamStats.totalPoints || 0;
  const awayScore = game.playsBlob?.away.teamStats.totalPoints || 0;
  const gameDate = new Date(game.gameDateString).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  // Parse plays to identify teams and players involved
  // The plays array contains the chronological sequence of game events
  const plays = game.playsBlob?.summary || [];
  const lastPlay = plays[plays.length - 1];
  const teamIds = new Set(plays.map((play) => play.teamInPossessionId));
  const homeTeam = game.home.season.team;
  const homeTeamId = Array.from(teamIds)[0];
  const awayTeam = game.away.season.team;
  const awayTeamId = Array.from(teamIds)[1];

  /**
   * Helper function to resolve player names from player IDs
   * Searches through both home and away team rosters to find player information
   * Falls back to play data if player not found in rosters
   */
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

    // Fallback to player1Name if available in play data
    const play = plays.find((p) => p.player1Id === playerId);
    return play?.player1Name || `Player ${playerId}`;
  };

  /**
   * Process and aggregate player statistics from play-by-play data
   * Tracks various statistics for each player:
   * - Rushing yards and attempts
   * - Passing yards, completions, and attempts
   * - Receiving yards and receptions
   * - Touchdowns and interceptions
   */
  const playerStats = {};
  plays.forEach((play) => {
    if (play.player1Id) {
      const playerId = play.player1Id;
      // Initialize player stats object if not exists
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

      // Update player statistics based on play type
      // Each play type has specific statistics to track
      switch (play.playType) {
        case "run":
          // Track rushing yards and touchdowns for running plays
          playerStats[playerId].rushingYards += play.lengthOfPlay || 0;
          if (play.includesTouchdown) playerStats[playerId].touchdowns++;
          break;
        case "pass":
          // Track passing statistics including completions and attempts
          playerStats[playerId].passingYards += play.lengthOfPlay || 0;
          playerStats[playerId].attempts++;
          if (play.completion) playerStats[playerId].completions++;
          if (play.includesTouchdown) playerStats[playerId].touchdowns++;
          break;
        case "reception":
          // Track receiving statistics for completed passes
          playerStats[playerId].receivingYards += play.lengthOfPlay || 0;
          playerStats[playerId].receptions++;
          if (play.includesTouchdown) playerStats[playerId].touchdowns++;
          break;
        case "interception":
          // Track defensive interceptions
          playerStats[playerId].interceptions++;
          break;
      }
    }
  });

  /**
   * Identify and format top performers based on statistical thresholds
   * Players are considered top performers if they have:
   * - More than 50 rushing yards, OR
   * - More than 50 passing yards, OR
   * - More than 50 receiving yards
   */
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
      // Format player statistics into readable text
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
    // Sort by total yards (rushing + passing + receiving)
    .sort((a, b) => {
      const aYards = parseInt(a.statline.match(/\d+/)?.[0] || "0");
      const bYards = parseInt(b.statline.match(/\d+/)?.[0] || "0");
      return bYards - aYards;
    })
    .slice(0, 4); // Take top 4 performers

  // Turn into text paragraph:
  const contentText = topPerformers
    .map((p, i) => {
      const intro =
        i === 0
          ? `<strong>${p.name}</strong> led ${p.team.school.name}`
          : i === 1
          ? `<strong>${p.name}</strong> followed for ${p.team.school.name}`
          : `<strong>${p.name}</strong> also contributed for ${p.team.school.name}`;
      return `${intro} with ${p.statline}.`;
    })
    .join("<br>");

  /**
   * Process and format key moments from the game
   * Key moments include:
   * - Touchdowns
   * - Interceptions
   * - Fumbles
   * - Field goals
   * - Long plays (35+ yards)
   * - Special teams plays (muffed punts)
   */
  const keyMoments = [];
  const quarters = {};
  plays.forEach((play) => {
    if (
      play.includesTouchdown ||
      play.playType === "interception" ||
      play.playType === "fumble" ||
      play.playType === "fieldGoal" ||
      play.lengthOfPlay >= 35 ||
      play.playType === "muffedPunt"
    ) {
      const quarter = play.quarter;
      if (!quarters[quarter]) {
        quarters[quarter] = [];
      }
      quarters[quarter].push(play);
    }
  });

  /**
   * Helper function to convert play types into past tense verbs
   * Used for natural language generation of play descriptions
   */
  const formPlayTense = (playType) => {
    if (playType === "run") return "ran";
    if (playType === "pass") return "passed";
    if (playType === "reception") return "caught a pass";
    if (playType === "interception") return "intercepted";
    if (playType === "fumble") return "fumbled";
    if (playType === "fieldGoal") return "kicked a field goal";
    if (playType === "muffedPunt") return "muffed a punt";
    return playType.toLowerCase();
  };

  // Helper function to get team name from ID
  const getTeamName = (teamId) => {
    return teamId === homeTeamId ? homeTeam.school.name : awayTeam.school.name;
  };
  const quarterNames = {
    1: "first",
    2: "second",
    3: "third",
    4: "final",
  };

  // Add key moments for each quarter with full player names and <h2> for quarter
  const quarterMoments = [];

  Object.entries(quarters).forEach(([quarter, plays]) => {
    if (plays.length > 0) {
      // Add quarter header only once
      //  keyMoments.push(`<h2>${quarter} Quarter</h2>`);
      const quarterText = quarterNames[quarter] || `${quarter}th`;
      const momentsInQuarter = [];

      // Process all plays in the quarter
      plays.forEach((play) => {
        let moment = "";
        const playerName = getPlayerName(play.player1Id);
        const secondPlayerName = play.player2Id
          ? getPlayerName(play.player2Id)
          : null;

        if (play.includesTouchdown) {
          moment = `<strong>${playerName}</strong> ${formPlayTense(
            play.playType
          )}${
            secondPlayerName ? ` to <strong>${secondPlayerName}</strong>` : ""
          } for a ${play.lengthOfPlay}-yard touchdown`;
        } else if (play.playType === "interception") {
          moment = `<strong>${playerName}</strong> intercepted a pass`;
        } else if (play.playType === "fumble") {
          moment = `<strong>${playerName}</strong> fumbled the ball`;
        } else if (play.playType === "fieldGoal") {
          moment = `<strong>${playerName}</strong> kicked a ${play.lengthOfPlay}-yard field goal`;
        } else if (play.playType === "muffedPunt") {
          const recoveringTeam = getTeamName(play.muffedPuntRecoveredByTeamId);
          moment = `${getTeamName(
            play.teamInPossessionId
          )} muffed a punt, recovered by ${recoveringTeam}`;
        } else if (play.lengthOfPlay >= 35) {
          // Handle long plays
          if (play.playType === "run") {
            moment = `<strong>${playerName}</strong> had a long ${play.lengthOfPlay}-yard run`;
          } else if (
            play.playType === "pass" ||
            play.playType === "reception"
          ) {
            const passerName =
              play.playType === "reception"
                ? getPlayerName(play.player2Id)
                : playerName;
            const receiverName =
              play.playType === "pass"
                ? getPlayerName(play.player2Id)
                : playerName;
            moment = `<strong>${passerName}</strong> connected with <strong>${receiverName}</strong> for a ${play.lengthOfPlay}-yard pass`;
          }
        }

        if (moment) momentsInQuarter.push(moment);
      });
      if (momentsInQuarter.length > 0) {
        // Combine all moments into one sentence with commas and "and"
        const joined =
          momentsInQuarter.length === 1
            ? momentsInQuarter[0]
            : momentsInQuarter.slice(0, -1).join(", ") +
              ", and " +
              momentsInQuarter.slice(-1);

        quarterMoments.push(`In the ${quarterText} quarter, ${joined}.`);
      }
    }
  });

  const keyMomentsHtml = quarterMoments.join(" ");

  // Find longest scoring play with full player name
  const scoringPlays = plays.filter((play) => play.includesTouchdown);
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

  // Linking Game Page Url
  const url = "";
  const gamePageLink = `<a href="${url}"><strong><u><i>View the full game summary here</i></u></strong></a>`;

  const winningImage =
    homeScore > awayScore ? homeTeam.school : awayTeam.school;

  // Extract image ID from logoUrl using regex
  const extractImageId = (url) => {
    if (!url) return null;
    const match = url.match(/\/([^/]+)\.png$/);
    return match ? match[1] : null;
  };

  const featuredImageId = extractImageId(winningImage.logoUrl);

  const formatQuarter = (quarter) => {
    if (quarter === 1) return "first";
    if (quarter === 2) return "second";
    if (quarter === 3) return "third";
    if (quarter === 4) return "fourth";
  };

  const formLongestScoreText = (longestScoringPlay) => {
    const playerName = getPlayerName(longestScoringPlay.player1Id);
    const playType = longestScoringPlay.playType;
    const yardage = longestScoringPlay.lengthOfPlay;
    const quarter = longestScoringPlay.quarter;
    return `${playerName} scored the longest touchdown of the night on a ${yardage}-yard ${playType.toLowerCase()} in the ${formatQuarter(
      quarter
    )}.`;
  };

  const setSubheadline = () => {
    if (game.gameStatus === "FINAL") {
      return `The football game was played on ${gameDate} at ${homeTeam.school.name}.`;
    } else
      return `The football game is currently being played at ${homeTeam.school.name}.`;
  };

  const setHeadline = () => {
    const higherScore = Math.max(homeScore, awayScore);
    const lowerScore = Math.min(homeScore, awayScore);
    const quarter = formatQuarter(lastPlay.quarter);
    if (game.gameStatus === "FINAL") {
      return `${winningTeam} defeats ${losingTeam} ${higherScore}-${lowerScore}`;
    } else if (game.gameStatus === "HALFTIME") {
      return `${winningTeam} leads ${losingTeam} ${higherScore}-${lowerScore} at halftime`;
    } else if (game.gameStatus === "LIVE") {
      return `${winningTeam} leads ${losingTeam} ${higherScore}-${lowerScore} entering the ${quarter} quarter`;
    } else {
      return `${awayTeam.school.name} at ${homeTeam.school.name}`;
    }
  };

  return {
    headlines: { basic: setHeadline() },
    subheadlines: {
      basic: setSubheadline(),
    },
    content_elements: [
      {
        type: "text",
        content: "<h2>Game Story</h2>",
      },
      {
        type: "text",
        content: gameComment,
      },
      {
        type: "text",
        content: "<h2>Longest Scoring Play</h2>",
      },
      {
        type: "text",
        content: formLongestScoreText(longestScoringPlay),
      },
      {
        type: "text",
        content: "<h2>Key Moments</h2>",
      },
      {
        type: "text",
        content: keyMomentsHtml,
      },
      {
        type: "text",
        content: "<h2>Top Performers</h2>",
      },
      { type: "text", content: contentText },
      {
        type: "text",
        content: gamePageLink,
      },
    ],
    game_id: game.id,
    featuredImageId: featuredImageId,
  };
}

async function uploadGameData(transformedData) {
  const FUSION_BASE = process.env.FUSION_BASE;
  const FUSION_TOKEN = process.env.FUSION_TOKEN;

  try {
    await publishStory(FUSION_BASE, FUSION_TOKEN, transformedData);
    console.log("Successfully published story");
  } catch (e) {
    throw new Error("uploadGameData Error", e);
  }
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
