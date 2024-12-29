const core = require("@actions/core");
const fs = require("fs");
const {
  LambdaClient,
  UpdateFunctionCodeCommand,
} = require("@aws-sdk/client-lambda");

async function run() {
  // Get all parameters
  const ZIP = core.getInput("ZIP");
  const FUNCTION_NAME = core.getInput("FUNCTION_NAME");
  const AWS_REGION = core.getInput("AWS_REGION");
  const AWS_SECRET_ID = core.getInput("AWS_SECRET_ID");
  const AWS_SECRET_KEY = core.getInput("AWS_SECRET_KEY");
  const RUNTIME = core.getInput("RUNTIME");
  const ROLE = core.getInput("ROLE");
  const HANDLER = core.getInput("HANDLER");
  const DESCRIPTION = core.getInput("DESCRIPTION");
  const TIMEOUT = core.getInput("TIMEOUT");
  const MEMORY_SIZE = core.getInput("MEMORY_SIZE");
  const ARCHITECTURES = core.getInput("ARCHITECTURES");
  const ENVIRONMENT = core.getInput("ENVIRONMENT");
  const S3_BUCKET = core.getInput("S3_BUCKET");
  const S3_KEY = core.getInput("S3_KEY");
  const S3_OBJECT_VERSION = core.getInput("S3_OBJECT_VERSION");

  // Check mandatory params
  if (!FUNCTION_NAME) {
    throw "No FUNCTION_NAME provided!";
  }
  if (!AWS_REGION) {
    throw "No AWS_REGION provided!";
  }
  if (!AWS_SECRET_ID) {
    throw "No AWS_SECRET_ID provided!";
  }
  if (!AWS_SECRET_KEY) {
    throw "No AWS_SECRET_KEY provided!";
  }
  if (!ZIP) {
    throw "No ZIP provided!";
  }

  console.log(`Deploy ${FUNCTION_NAME} from ${ZIP} to ${AWS_REGION}.`);

  const zipBuffer = fs.readFileSync(`./${ZIP}`);
  core.debug("ZIP read into memory.");

  const updateParams = {
    FunctionName: FUNCTION_NAME,
    ZipFile: zipBuffer,
    Publish: true,
    PackageType: "Zip",
    Architectures: ["x86_64"],
  };

  const updateParamIfPresent = (paramName, paramValue) => {
    if (!!paramValue) {
      updateParams[paramName] = paramValue;
    }
  };
  const convertOptionalToNumber = (it) => (!!it ? Number(it) : undefined);
  const splitOptional = (it, separator = ",") =>
    !!it ? it.split(separator) : undefined;

  // add optional params
  updateParamIfPresent("Runtime", RUNTIME);
  updateParamIfPresent("Role", ROLE);
  updateParamIfPresent("Handler", HANDLER);
  updateParamIfPresent("Description", DESCRIPTION);
  updateParamIfPresent("Timeout", convertOptionalToNumber(TIMEOUT));
  updateParamIfPresent("MemorySize", convertOptionalToNumber(MEMORY_SIZE));
  updateParamIfPresent("Architectures", splitOptional(ARCHITECTURES));
  updateParamIfPresent("S3Bucket", S3_BUCKET);
  updateParamIfPresent("S3Key", S3_KEY);
  updateParamIfPresent("S3ObjectVersion", S3_OBJECT_VERSION);
  if (!!ENVIRONMENT) {
    const Variables = JSON.parse(ENVIRONMENT);
    updateParams["Environment"] = { Variables };
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/lambda/command/UpdateFunctionCodeCommand/
  const command = new UpdateFunctionCodeCommand(updateParams);
  const awsIdentityProvider = () =>
    Promise.resolve({
      accessKeyId: AWS_SECRET_ID,
      secretAccessKey: AWS_SECRET_KEY,
    });
  const client = new LambdaClient({
    apiVersion: "2015-03-31",
    region: AWS_REGION,
    credentials: awsIdentityProvider,
    maxRetries: 3,
    sslEnabled: true,
    logger: console,
  });
  const response = await client.send(command);
  console.log(response);
}

(async function () {
  try {
    await run();
  } catch (error) {
    console.log(error);
    core.error(error.message);
    core.setFailed(error.message);
  }
})();
