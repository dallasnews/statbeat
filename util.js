const React = require("react");
const ReactDOMServer = require("react-dom/server");
const _ = require("lodash");
const {
  gql,
  ApolloClient,
  InMemoryCache,
  HttpLink,
} = require("@apollo/client");
const { setContext } = require("@apollo/client/link/context");
const fetch = require("node-fetch");
const { Client } = require("ssh2");
const S3 = require("aws-sdk/clients/s3");
const s3 = new S3();
const S3_UPLOAD_BUCKET = process.env.S3_UPLOAD_BUCKET;
const { DateTime } = require("luxon");

const dmnawsutils = require("dmn-aws-utils")({
  region: process.env.COGNITO_REGION,
  userpool_id: process.env.COGNITO_USERPOOL_ID,
  app_client_id: process.env.COGNITO_APP_CLIENT_ID,
});

var client;

/**
 * initialize an apollo-client instance using environment variables
 * for config. note that the environment can be "real" or set via the
 * sam-template. sensitive information is retrieved from the aws
 * parameter store but can be overridden via environment variables.
 *
 * @returns {Promise<ApolloClient>} an initialized apollo client.
 */
async function initClient() {
  if (client) return client;

  const httpLink = new HttpLink({
    uri: process.env.BASE_ENDPOINT,
    fetch: fetch,
  });

  const SGTOKEN = await dmnawsutils.get_parameter("READ_ONLY_TOKEN");
  const authLink = setContext((_, { headers }) => {
    const token = SGTOKEN;
    return {
      headers: {
        ...headers,
        authorization: `Bearer ${token}`,
      },
    };
  });

  client = new ApolloClient({
    cache: new InMemoryCache(),
    link: authLink.concat(httpLink),
    defaultOptions: {
      //fetchPolicy: "no-cache",
      watchQuery: {
        fetchPolicy: "no-cache",
      },
      query: {
        fetchPolicy: "no-cache",
      },
    },
  });

  return client;
}

/**
 * Simple parity SFTP behavior, except in a S3.
 */
async function upload(host, username, privateKey, path, xmlish) {
  console.log("Target bucket:", S3_UPLOAD_BUCKET);

  return s3
    .upload({
      Bucket: S3_UPLOAD_BUCKET,
      Key: path,
      Body: xmlish,
    })
    .promise();
}

/**
 * Push the xmlish data to the given host at path.
 * @deprecated
 * @param {string} host - the sftp host
 * @param {string} username - the username on the host
 * @param {string} privateKey - the private key to auth with
 * @param {string} path - the directory on the host to write the data to
 * @param {string} xmlish - the data to upload (mostly newsgate/cci-xml-ish)
 * @returns {Promise} - a promise that will complete then the upload is done
 */
async function upload2(host, username, privateKey, path, xmlish) {
  const conn = new Client();
  console.debug("upload()", path);
  const p = new Promise((resolve, reject) => {
    conn
      .on("ready", () => {
        //console.log("girls_volleyball_games.upload():gth1");
        conn.sftp((err, sftp) => {
          //console.log("girls_volleyball_games.upload():gth2", err);
          if (err) return reject(err);
          sftp.writeFile(path, xmlish, (err) => {
            //console.log("girls_volleyball_games.upload():gth3", err);
            if (err) return reject(err);
            conn.end();
            //console.log("girls_volleyball_games.upload():gth4");
            return resolve("OK");
          });
        });
      })
      .on("error", (err) => {
        return reject(err);
      })
      .connect({
        host: host,
        port: 22,
        username: username,
        privateKey: privateKey,
      });
  });
  return p;
}

module.exports = {
  initClient,
  upload,
};
