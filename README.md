Github Action to update a Lambda function from a ZIP file.

## Required parameters

- `ZIP`: A ZIP file containing the source of the lambda.
- `FUNCTION_NAME`
- `AWS_REGION`
- `AWS_SECRET_ID`
- `AWS_SECRET_KEY`

## Optional parameters

- `RUNTIME`
- `ROLE`
- `HANDLER`
- `DESCRIPTION`
- `TIMEOUT`
- `MEMORY_SIZE`
- `ENVIRONMENT`

## Required permisions for the access key

```
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": [
                "s3:PutObject",
                "iam:ListRoles",
                "iam:PassRole",
                "lambda:UpdateFunctionCode",
                "lambda:UpdateFunctionConfiguration"
            ],
            "Resource": "*"
        }
    ]
}
```

## Example

```
name: Deploy AWS Lambda

on:
  pull_request:
    types: [merged]
      branches:
        - master

jobs:
  deploy-lambda:
    if: github.event.pull_request.merged
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@master
      - run: echo "GENERATE/FETCH ZIP"
      - uses: mupixa/deploy-lambda
        with:
          ZIP: TEST-LAMBDA-ZIP.zip
          FUNCTION_NAME: TEST-FUNCTION-NAME
          AWS_REGION: ${{ secrets.AWS_REGION }}
          AWS_SECRET_ID: ${{ secrets.AWS_SECRET_ID }}
          AWS_SECRET_KEY: ${{ secrets.AWS_SECRET_KEY }}
          RUNTIME: 'nodejs12.x'
          HANDLER: 'index.handler'
          DESCRIPTION: 'Test function description'
          MEMORY_SIZE: '128'
          TIMEOUT: '5'
          ENVIRONMENT: '{"VAR_NAME":"VAR_VALUE","TEST":"VALUE"}'
```
