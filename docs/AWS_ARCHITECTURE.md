# AWS Architecture

## Selected deployment pattern

The repository deploys the Next.js application as a container on Amazon ECS with the AWS Fargate launch type. An internet-facing Application Load Balancer routes traffic to the container. AWS Secrets Manager supplies Medplum credentials and synthetic resource identifiers to the task. CloudWatch Logs receives application logs.

```text
Browser
  |
  v
Application Load Balancer
  |
  v
ECS Fargate task
  |-- Next.js server actions
  |-- deterministic verifier
  |-- three-valued policy evaluator
  |
  +---- outbound HTTPS ----> Medplum FHIR API

Secrets Manager ----> ECS task environment
CloudWatch Logs <---- ECS task stdout/stderr
```

## Why ECS Fargate

- Runs the existing Next.js server and server actions without splitting the application into separate functions.
- Keeps the Medplum client secret on the server side.
- Supports container health checks, rolling deployment, autoscaling, and CloudWatch logging.
- Provides a straightforward path from a one-task demo deployment to private-subnet production deployment.

## Network modes

### Demo mode

```text
PRIVATE_TASKS=false
```

- Fargate tasks run in public subnets with public IP addresses.
- The load balancer is public.
- No NAT Gateway is created.
- Intended for synthetic-data demonstrations and cost control.

### Private-task mode

```text
PRIVATE_TASKS=true
```

- Fargate tasks run in private subnets.
- One NAT Gateway provides outbound access to the Medplum API and package/image endpoints.
- The load balancer remains public.
- More appropriate as a baseline for enterprise deployment, but incurs NAT cost.

## State boundary

The AWS stack does not add an application database. Clinical resources, evaluation Tasks, and review Tasks remain in Medplum. AWS hosts the application runtime, logs, networking, and secret references.

## Production hardening not included in the demo stack

Before handling real PHI or production traffic, add and validate:

- a signed business associate agreement where required;
- HTTPS using ACM and a managed DNS name;
- AWS WAF rules and rate limiting;
- private tasks and controlled outbound egress;
- longer log retention and organization-specific log redaction;
- CloudTrail, AWS Config, GuardDuty, Security Hub, and centralized alerting;
- secret rotation and deployment restart procedures;
- multi-account separation for development, test, and production;
- backup, incident response, access review, and disaster-recovery controls;
- a documented Medplum deployment and data-residency decision.

The included stack is a synthetic-data deployment scaffold, not a completed HIPAA compliance program.
