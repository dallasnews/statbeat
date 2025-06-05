const _ = require("lodash");
const {
  gql,
  ApolloClient,
  InMemoryCache,
  HttpLink,
} = require("@apollo/client");
const { setContext } = require("@apollo/client/link/context");
const fetch = require("node-fetch");

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

module.exports = {
  initClient,
};
