#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PaReadinessAwsStack } from '../lib/pa-readiness-stack';

const app = new cdk.App();

new PaReadinessAwsStack(app, '14YPaReadinessAgent', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
  description:
    '14Y PA Readiness Agent on ECS Fargate with ALB, Secrets Manager, and CloudWatch Logs',
});
