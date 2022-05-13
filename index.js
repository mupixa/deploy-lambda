const core = require("@actions/core");
const fs = require("fs");
const AWS = require("aws-sdk");

async function run() {
  // Get all parameters
  const ZIP = core.getInput("ZIP");
  const FUNCTION_NAME = core.getInput("FUNCTION_NAME");
  const AWS_REGION = core.getInput("AWS_REGION");
  const AWS_SECRET_KEY = core.getInput("AWS_SECRET_KEY");
  const AWS_SECRET_ID = core.getInput("AWS_SECRET_ID");
  const RUNTIME = core.getInput("RUNTIME");
  const ROLE = core.getInput("ROLE");
  const HANDLER = core.getInput("HANDLER");
  const DESCRIPTION = core.getInput("DESCRIPTION");
  const TIMEOUT = core.getInput("TIMEOUT");
  const MEMORY_SIZE = core.getInput("MEMORY_SIZE");
  const ENVIRONMENT = core.getInput("ENVIRONMENT");

  // Check params
  if (!ZIP) {
    throw "No ZIP provided!";
  }
  if (!FUNCTION_NAME) {
    throw "No FUNCTION_NAME provided!";
  }
  if (!AWS_REGION) {
    throw "No AWS_REGION provided!";
  }
  if (!AWS_SECRET_KEY) {
    throw "No AWS_SECRET_KEY provided!";
  }
  if (!AWS_SECRET_ID) {
    throw "No AWS_SECRET_ID provided!";
  }

  console.log(`Deploying ${FUNCTION_NAME} from ${ZIP}.`);

  const zipBuffer = fs.readFileSync(`./${ZIP}`);
  core.debug("ZIP read into memory.");

  const lambda = new AWS.Lambda({
    apiVersion: "2015-03-31",
    region: AWS_REGION,
    secretAccessKey: AWS_SECRET_KEY,
    accessKeyId: AWS_SECRET_ID,
    maxRetries: 3,
    sslEnabled: true,
    logger: console,
  });

  const uploadParams = {
    FunctionName: FUNCTION_NAME,
    ZipFile: zipBuffer,
  };

  const data = await lambda.updateFunctionCode(uploadParams).promise();
  const publishParams = {
    CodeSha256: data.CodeSha256,
    Description: `${new Date()}`,
    FunctionName: FUNCTION_NAME,
  };
  await lambda.publishVersion(publishParams).promise();

  let configParams = {
    FunctionName: FUNCTION_NAME,
  };
  if (!!RUNTIME) {
    configParams["Runtime"] = RUNTIME;
  }
  if (!!ROLE) {
    configParams["Role"] = ROLE;
  }
  if (!!HANDLER) {
    configParams["Handler"] = HANDLER;
  }
  if (!!DESCRIPTION) {
    configParams["Description"] = DESCRIPTION;
  }
  if (!!TIMEOUT) {
    configParams["Timeout"] = Number(TIMEOUT);
  }
  if (!!MEMORY_SIZE) {
    configParams["MemorySize"] = Number(MEMORY_SIZE);
  }
  if (!!ENVIRONMENT) {
    const Variables = JSON.parse(ENVIRONMENT);
    configParams["Environment"] = { Variables };
  }

  if (Object.keys(configParams).length > 1) {
    await lambda
      .waitFor("functionUpdated", {
        FunctionName: FUNCTION_NAME,
      })
      .promise();

    await lambda.updateFunctionConfiguration(configParams).promise();
  }
}

(async function () {
  try {
    await run();
  } catch (error) {
    core.error(error.message);
    core.setFailed(error.message);
  }
})();
