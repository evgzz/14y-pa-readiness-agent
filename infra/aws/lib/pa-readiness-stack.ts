import * as path from 'node:path';
import {
  CfnOutput,
  Duration,
  RemovalPolicy,
  Stack,
  type StackProps,
} from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as ecsPatterns from 'aws-cdk-lib/aws-ecs-patterns';
import * as logs from 'aws-cdk-lib/aws-logs';
import * as secretsmanager from 'aws-cdk-lib/aws-secretsmanager';
import { Construct } from 'constructs';

export class PaReadinessAwsStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const secretArn =
      this.node.tryGetContext('medplumSecretArn') ??
      process.env.MEDPLUM_SECRET_ARN;

    if (typeof secretArn !== 'string' || secretArn.length === 0) {
      throw new Error(
        'Provide -c medplumSecretArn=<secret-arn> or set MEDPLUM_SECRET_ARN.',
      );
    }

    const privateTasks =
      String(this.node.tryGetContext('privateTasks') ?? 'false') === 'true';
    const medplumBaseUrl = String(
      this.node.tryGetContext('medplumBaseUrl') ??
        'https://api.medplum.com/',
    );

    const vpc = new ec2.Vpc(this, 'Vpc', {
      maxAzs: 2,
      natGateways: privateTasks ? 1 : 0,
      subnetConfiguration: privateTasks
        ? [
            {
              name: 'public',
              subnetType: ec2.SubnetType.PUBLIC,
              cidrMask: 24,
            },
            {
              name: 'application',
              subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
              cidrMask: 24,
            },
          ]
        : [
            {
              name: 'public',
              subnetType: ec2.SubnetType.PUBLIC,
              cidrMask: 24,
            },
          ],
    });

    const cluster = new ecs.Cluster(this, 'Cluster', {
      vpc,
      containerInsightsV2: ecs.ContainerInsights.ENABLED,
    });

    const logGroup = new logs.LogGroup(this, 'ApplicationLogs', {
      logGroupName: '/14y/pa-readiness-agent',
      retention: logs.RetentionDays.ONE_WEEK,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const medplumSecret = secretsmanager.Secret.fromSecretCompleteArn(
      this,
      'MedplumSecret',
      secretArn,
    );

    const appRoot = path.resolve(__dirname, '../../..');

    const service = new ecsPatterns.ApplicationLoadBalancedFargateService(
      this,
      'WebService',
      {
        cluster,
        cpu: 512,
        memoryLimitMiB: 1024,
        desiredCount: 1,
        publicLoadBalancer: true,
        assignPublicIp: !privateTasks,
        taskSubnets: {
          subnetType: privateTasks
            ? ec2.SubnetType.PRIVATE_WITH_EGRESS
            : ec2.SubnetType.PUBLIC,
        },
        healthCheckGracePeriod: Duration.seconds(90),
        circuitBreaker: { rollback: true },
        taskImageOptions: {
          image: ecs.ContainerImage.fromAsset(appRoot),
          containerPort: 3000,
          environment: {
            NODE_ENV: 'production',
            MEDPLUM_BASE_URL: medplumBaseUrl,
            GIT_COMMIT: process.env.GIT_COMMIT ?? 'aws-cdk-deploy',
          },
          secrets: {
            MEDPLUM_CLIENT_ID: ecs.Secret.fromSecretsManager(
              medplumSecret,
              'MEDPLUM_CLIENT_ID',
            ),
            MEDPLUM_CLIENT_SECRET: ecs.Secret.fromSecretsManager(
              medplumSecret,
              'MEDPLUM_CLIENT_SECRET',
            ),
            DEMO_PATIENT_ID: ecs.Secret.fromSecretsManager(
              medplumSecret,
              'DEMO_PATIENT_ID',
            ),
            DEMO_SERVICE_REQUEST_ID: ecs.Secret.fromSecretsManager(
              medplumSecret,
              'DEMO_SERVICE_REQUEST_ID',
            ),
            DEMO_DOCUMENT_REFERENCE_ID: ecs.Secret.fromSecretsManager(
              medplumSecret,
              'DEMO_DOCUMENT_REFERENCE_ID',
            ),
          },
          logDriver: ecs.LogDrivers.awsLogs({
            logGroup,
            streamPrefix: 'web',
          }),
        },
      },
    );

    service.targetGroup.configureHealthCheck({
      path: '/api/health',
      healthyHttpCodes: '200',
      interval: Duration.seconds(30),
      timeout: Duration.seconds(5),
      healthyThresholdCount: 2,
      unhealthyThresholdCount: 3,
    });

    const scaling = service.service.autoScaleTaskCount({
      minCapacity: 1,
      maxCapacity: 4,
    });
    scaling.scaleOnCpuUtilization('CpuScaling', {
      targetUtilizationPercent: 60,
      scaleInCooldown: Duration.seconds(120),
      scaleOutCooldown: Duration.seconds(60),
    });

    new CfnOutput(this, 'ApplicationUrl', {
      value: `http://${service.loadBalancer.loadBalancerDnsName}`,
    });
    new CfnOutput(this, 'HealthUrl', {
      value: `http://${service.loadBalancer.loadBalancerDnsName}/api/health`,
    });
    new CfnOutput(this, 'ClusterName', {
      value: cluster.clusterName,
    });
    new CfnOutput(this, 'ServiceName', {
      value: service.service.serviceName,
    });
    new CfnOutput(this, 'MedplumSecretArn', {
      value: medplumSecret.secretArn,
    });
    new CfnOutput(this, 'NetworkMode', {
      value: privateTasks ? 'private-tasks-with-nat' : 'public-tasks-demo',
    });
  }
}
