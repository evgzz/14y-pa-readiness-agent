# AWS Deployment Runbook

## 1. Deployment target

The default AWS deployment uses:

- Docker for application packaging;
- Amazon ECS with AWS Fargate;
- an Application Load Balancer;
- AWS Secrets Manager;
- CloudWatch Logs;
- AWS CDK v2 in TypeScript.

The application continues to use Medplum as the FHIR system of record.

## 2. AWS prerequisites

Install and configure:

```bash
aws --version
docker --version
node --version
npm --version
git --version
```

Required:

- an AWS account and target Region;
- AWS CLI credentials with permission to deploy CDK, CloudFormation, VPC, ECS, ECR assets, ELBv2, IAM, CloudWatch Logs, Auto Scaling, and Secrets Manager references;
- Docker Engine or Docker Desktop running;
- Node.js 22.18.0 or newer;
- a committed `package-lock.json`;
- a synthetic Medplum project and seeded resource IDs.

Confirm the AWS identity:

```bash
aws sts get-caller-identity
```

## 3. Complete local application gates

Before AWS deployment:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run seed
```

Copy the synthetic resource IDs printed by the seed command into `.env.local`.

Commit the lockfile:

```bash
git add package-lock.json
git commit -m "Freeze application dependencies"
```

## 4. Test the container locally

Build:

```bash
docker build -t 14y-pa-readiness-agent:local .
```

Run with the local environment file:

```bash
docker run --rm \
  --env-file .env.local \
  -p 3000:3000 \
  14y-pa-readiness-agent:local
```

Verify:

```bash
curl --fail http://localhost:3000/api/health
```

Open `http://localhost:3000` and run the primary readiness flow.

## 5. Create or update the AWS secret

Load the required values into the shell without printing them. One approach is to export them manually from `.env.local`.

Required variables:

```text
MEDPLUM_CLIENT_ID
MEDPLUM_CLIENT_SECRET
DEMO_PATIENT_ID
DEMO_SERVICE_REQUEST_ID
DEMO_DOCUMENT_REFERENCE_ID
AWS_REGION
```

Create or update the secret:

```bash
./scripts/aws-create-secret.sh
```

The script prints the secret ARN. Export it:

```bash
export MEDPLUM_SECRET_ARN=<printed-secret-arn>
```

The secret must contain these JSON keys:

```json
{
  "MEDPLUM_CLIENT_ID": "...",
  "MEDPLUM_CLIENT_SECRET": "...",
  "DEMO_PATIENT_ID": "...",
  "DEMO_SERVICE_REQUEST_ID": "...",
  "DEMO_DOCUMENT_REFERENCE_ID": "..."
}
```

## 6. Choose the network mode

### Lower-cost synthetic demo

```bash
export PRIVATE_TASKS=false
```

This creates public task networking and no NAT Gateway.

### Private Fargate tasks

```bash
export PRIVATE_TASKS=true
```

This creates private application subnets and one NAT Gateway for outbound access.

## 7. Deploy

```bash
export AWS_REGION=us-west-2
export AWS_DEFAULT_REGION="$AWS_REGION"
export MEDPLUM_SECRET_ARN=<secret-arn>
export PRIVATE_TASKS=false

./scripts/aws-deploy.sh
```

CDK builds the Docker image as an asset, uploads it through the CDK asset pipeline, and deploys the load-balanced Fargate service.

Record the CloudFormation outputs:

- `ApplicationUrl`;
- `HealthUrl`;
- `ClusterName`;
- `ServiceName`;
- `NetworkMode`.

## 8. Verify the deployment

Health check:

```bash
curl --fail <HealthUrl>
```

Open `<ApplicationUrl>` and verify:

1. the synthetic IDs are prepopulated;
2. the readiness check returns the expected `ready` result;
3. the evaluation Task is created in Medplum;
4. a repeated evaluation reuses the same Task;
5. human confirmation creates the separate review Task.

Inspect ECS service stability:

```bash
aws ecs describe-services \
  --cluster <ClusterName> \
  --services <ServiceName> \
  --query 'services[0].{running:runningCount,desired:desiredCount,events:events[0:5]}'
```

Inspect logs:

```bash
aws logs tail /14y/pa-readiness-agent --follow
```

## 9. Updating the application

After code changes:

```bash
npm run typecheck
npm test
npm run build
./scripts/aws-deploy.sh
```

The ECS deployment circuit breaker is configured to roll back failed task deployments.

When a Secrets Manager value changes, redeploy or force a new ECS deployment so new tasks read the updated secret value.

## 10. Teardown

To avoid ongoing load balancer, Fargate, NAT, and logging charges:

```bash
./scripts/aws-destroy.sh
```

The imported Secrets Manager secret is not deleted by the stack. Delete it separately only when it is no longer needed.

## 11. Production boundary

This scaffold is designed for synthetic-data demonstration and controlled evaluation. It does not by itself establish HIPAA compliance or production authorization. Review `AWS_ARCHITECTURE.md` and complete organization-specific security, privacy, networking, logging, identity, incident-response, and business-associate requirements before production use.

## VS Code deployment option

The repository includes VS Code tasks for CDK dependency installation, CDK compilation, synthesis, and deployment. Open `14y-pa-readiness-agent.code-workspace` and follow [`VSCODE_SETUP.md`](./VSCODE_SETUP.md).

Launch VS Code from a shell that already exports `AWS_REGION`, `AWS_DEFAULT_REGION`, `MEDPLUM_SECRET_ARN`, and `PRIVATE_TASKS`, because task processes inherit the environment of the VS Code process. Secrets are intentionally not stored in `.vscode` files.

## 2. AWS prerequisites

Install and configure:

```bash
aws --version
docker --version
node --version
npm --version
git --version
```

Required:

- an AWS account and target Region;
- AWS CLI credentials with permission to deploy CDK, CloudFormation, VPC, ECS, ECR assets, ELBv2, IAM, CloudWatch Logs, Auto Scaling, and Secrets Manager references;
- Docker Engine or Docker Desktop running;
- Node.js 22.18.0 or newer;
- a committed `package-lock.json`;
- a synthetic Medplum project and seeded resource IDs.

Confirm the AWS identity:

```bash
aws sts get-caller-identity
```

## 3. Complete local application gates

Before AWS deployment:

```bash
npm install
npm run typecheck
npm test
npm run build
npm run seed
```

Copy the synthetic resource IDs printed by the seed command into `.env.local`.

Commit the lockfile:

```bash
git add package-lock.json
git commit -m "Freeze application dependencies"
```

## 4. Test the container locally

Build:

```bash
docker build -t 14y-pa-readiness-agent:local .
```

Run with the local environment file:

```bash
docker run --rm \
  --env-file .env.local \
  -p 3000:3000 \
  14y-pa-readiness-agent:local
```

Verify:

```bash
curl --fail http://localhost:3000/api/health
```

Open `http://localhost:3000` and run the primary readiness flow.

## 5. Create or update the AWS secret

Load the required values into the shell without printing them. One approach is to export them manually from `.env.local`.

Required variables:

```text
MEDPLUM_CLIENT_ID
MEDPLUM_CLIENT_SECRET
DEMO_PATIENT_ID
DEMO_SERVICE_REQUEST_ID
DEMO_DOCUMENT_REFERENCE_ID
AWS_REGION
```

Create or update the secret:

```bash
./scripts/aws-create-secret.sh
```

The script prints the secret ARN. Export it:

```bash
export MEDPLUM_SECRET_ARN=<printed-secret-arn>
```

The secret must contain these JSON keys:

```json
{
  "MEDPLUM_CLIENT_ID": "...",
  "MEDPLUM_CLIENT_SECRET": "...",
  "DEMO_PATIENT_ID": "...",
  "DEMO_SERVICE_REQUEST_ID": "...",
  "DEMO_DOCUMENT_REFERENCE_ID": "..."
}
```

## 6. Choose the network mode

### Lower-cost synthetic demo

```bash
export PRIVATE_TASKS=false
```

This creates public task networking and no NAT Gateway.

### Private Fargate tasks

```bash
export PRIVATE_TASKS=true
```

This creates private application subnets and one NAT Gateway for outbound access.

## 7. Deploy

```bash
export AWS_REGION=us-west-2
export AWS_DEFAULT_REGION="$AWS_REGION"
export MEDPLUM_SECRET_ARN=<secret-arn>
export PRIVATE_TASKS=false

./scripts/aws-deploy.sh
```

CDK builds the Docker image as an asset, uploads it through the CDK asset pipeline, and deploys the load-balanced Fargate service.

Record the CloudFormation outputs:

- `ApplicationUrl`;
- `HealthUrl`;
- `ClusterName`;
- `ServiceName`;
- `NetworkMode`.

## 8. Verify the deployment

Health check:

```bash
curl --fail <HealthUrl>
```

Open `<ApplicationUrl>` and verify:

1. the synthetic IDs are prepopulated;
2. the readiness check returns the expected `ready` result;
3. the evaluation Task is created in Medplum;
4. a repeated evaluation reuses the same Task;
5. human confirmation creates the separate review Task.

Inspect ECS service stability:

```bash
aws ecs describe-services \
  --cluster <ClusterName> \
  --services <ServiceName> \
  --query 'services[0].{running:runningCount,desired:desiredCount,events:events[0:5]}'
```

Inspect logs:

```bash
aws logs tail /14y/pa-readiness-agent --follow
```

## 9. Updating the application

After code changes:

```bash
npm run typecheck
npm test
npm run build
./scripts/aws-deploy.sh
```

The ECS deployment circuit breaker is configured to roll back failed task deployments.

When a Secrets Manager value changes, redeploy or force a new ECS deployment so new tasks read the updated secret value.

## 10. Teardown

To avoid ongoing load balancer, Fargate, NAT, and logging charges:

```bash
./scripts/aws-destroy.sh
```

The imported Secrets Manager secret is not deleted by the stack. Delete it separately only when it is no longer needed.

## 11. Production boundary

This scaffold is designed for synthetic-data demonstration and controlled evaluation. It does not by itself establish HIPAA compliance or production authorization. Review `AWS_ARCHITECTURE.md` and complete organization-specific security, privacy, networking, logging, identity, incident-response, and business-associate requirements before production use.
