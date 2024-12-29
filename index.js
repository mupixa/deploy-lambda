const core = require("@actions/core");
const fs = require("fs");
const {
  LambdaClient,
  UpdateFunctionCodeCommand,
} = require("@aws-sdk/client-lambda");
const { S3Client, PutObjectCommand } = require("@aws-sdk/client-s3");

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
  const awsIdentityProvider = () =>
    Promise.resolve({
      accessKeyId: AWS_SECRET_ID,
      secretAccessKey: AWS_SECRET_KEY,
    });
  const awsConfig = {
    apiVersion: "2015-03-31",
    region: AWS_REGION,
    credentials: awsIdentityProvider,
    maxRetries: 3,
    sslEnabled: true,
    logger: console,
  };
  console.log(`Deploy ${FUNCTION_NAME} from ${ZIP} to ${AWS_REGION}.`);

  const zipBuffer = readZip(`./${ZIP}`);
  const uploadOverS3 = S3_BUCKET && S3_KEY;

  const updateParams = {
    FunctionName: FUNCTION_NAME,
    PackageType: "Zip",
    Publish: true,
  };
  const updateParamIfPresent = (paramName, paramValue) => {
    if (paramValue) {
      updateParams[paramName] = paramValue;
    }
  };

  if (uploadOverS3) {
    updateParams["S3Bucket"] = S3_BUCKET;
    updateParams["S3Key"] = S3_KEY;
    const uploadCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: S3_KEY,
      Body: zipBuffer,
    });
    const s3Client = new S3Client(awsConfig);
    const response = await s3Client.send(uploadCommand);
    console.log(response);
    updateParamIfPresent("S3ObjectVersion", response.VersionId);
  } else {
    updateParams["ZipFile"] = zipBuffer;
  }

  // add optional params
  updateParamIfPresent("Runtime", RUNTIME);
  updateParamIfPresent("Role", ROLE);
  updateParamIfPresent("Handler", HANDLER);
  updateParamIfPresent("Description", DESCRIPTION);
  updateParamIfPresent("Timeout", convertOptionalToNumber(TIMEOUT));
  updateParamIfPresent("MemorySize", convertOptionalToNumber(MEMORY_SIZE));
  updateParamIfPresent(
    "Architectures",
    splitOptional(ARCHITECTURES) || ["x86_64"]
  );
  if (ENVIRONMENT) {
    const Variables = JSON.parse(ENVIRONMENT);
    updateParams["Environment"] = { Variables };
  }

  // https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/lambda/command/UpdateFunctionCodeCommand/
  const updateCommand = new UpdateFunctionCodeCommand(updateParams);
  const lambdaClient = new LambdaClient(awsConfig);
  const response = await lambdaClient.send(updateCommand);
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

// HELPER FUNCTIONS
function readZip(path) {
  const zipBuffer = fs.readFileSync(path);
  if (zipBuffer) {
    core.debug("ZIP read into memory.");
  }
  return zipBuffer;
}

function convertOptionalToNumber(it) {
  return it ? Number(it) : undefined;
}
function splitOptional(it, separator = ",") {
  return it ? it.split(separator) : undefined;
}
