import { exec } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { promisify } from 'node:util';
import readline from 'node:readline';
import crypto from 'node:crypto';
import path from 'node:path';
import os from 'node:os';

const execAsync = promisify(exec);

function question(query: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) =>
    rl.question(query, (ans) => {
      rl.close();
      resolve(ans);
    })
  );
}

async function checkStripeCLI() {
  console.log('Stripe: checking if Stripe CLI is installed and authenticated...');
  try {
    await execAsync('stripe --version');
    console.log('Stripe CLI is installed.');

    // Check if Stripe CLI is authenticated
    try {
      await execAsync('stripe config --list');
      console.log('Stripe CLI is authenticated.');
    } catch (error) {
      console.log(
        'Stripe CLI is not authenticated or the authentication has expired.'
      );
      console.log('Please run: stripe login');
      const answer = await question(
        'Have you completed the authentication? (y/n): '
      );
      if (answer.toLowerCase() !== 'y') {
        console.log(
          'Please authenticate with Stripe CLI and run this script again.'
        );
        process.exit(1);
      }

      // Verify authentication after user confirms login
      try {
        await execAsync('stripe config --list');
        console.log('Stripe CLI authentication confirmed.');
      } catch (error) {
        console.error(
          'Failed to verify Stripe CLI authentication. Please try again.'
        );
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(
      'Stripe CLI is not installed. Please install it and try again.'
    );
    console.log('To install Stripe CLI, follow these steps:');
    console.log('1. Visit: https://docs.stripe.com/stripe-cli');
    console.log(
      '2. Download and install the Stripe CLI for your operating system'
    );
    console.log('3. After installation, run: stripe login');
    console.log(
      'After installation and authentication, please run this setup script again.'
    );
    process.exit(1);
  }
}

async function getPostgresURL(): Promise<string> {
  console.log('Step 1: Setting up Postgres');
  const dbChoice = await question(
    'Do you want to use a local Postgres instance with Docker (L) or a remote Postgres instance (R)? (L/R): '
  );

  if (dbChoice.toLowerCase() === 'l') {
    console.log('Setting up local Postgres instance with Docker...');
    await setupLocalPostgres();
    return 'postgres://postgres:postgres@localhost:54322/postgres';
  } else {
    console.log(
      'You can find Postgres databases at: https://vercel.com/marketplace?category=databases'
    );
    return await question('Enter your POSTGRES_URL: ');
  }
}

async function setupLocalPostgres() {
  console.log('Checking if Docker is installed...');
  try {
    await execAsync('docker --version');
    console.log('Docker is installed.');
  } catch (error) {
    console.error(
      'Docker is not installed. Please install Docker and try again.'
    );
    console.log(
      'To install Docker, visit: https://docs.docker.com/get-docker/'
    );
    process.exit(1);
  }

  console.log('Creating docker-compose.yml file...');
  const dockerComposeContent = `
services:
  postgres:
    image: postgres:16.4-alpine
    container_name: next_saas_starter_postgres
    environment:
      POSTGRES_DB: postgres
      POSTGRES_USER: postgres
      POSTGRES_PASSWORD: postgres
    ports:
      - "54322:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
`;

  await fs.writeFile(
    path.join(process.cwd(), 'docker-compose.yml'),
    dockerComposeContent
  );
  console.log('docker-compose.yml file created.');

  console.log('Starting Docker container with `docker compose up -d`...');
  try {
    await execAsync('docker compose up -d');
    console.log('Docker container started successfully.');
  } catch (error) {
    console.error(
      'Failed to start Docker container. Please check your Docker installation and try again.'
    );
    process.exit(1);
  }
}

async function getStripeSecretKey(): Promise<string> {
  console.log('Stripe: getting Stripe Secret Key');
  console.log(
    'You can find your Stripe Secret Key at: https://dashboard.stripe.com/test/apikeys'
  );
  return await question('Enter your Stripe Secret Key: ');
}

async function createStripeWebhook(): Promise<string> {
  console.log('Stripe: creating Stripe webhook...');
  try {
    const { stdout } = await execAsync('stripe listen --print-secret');
    const match = stdout.match(/whsec_[a-zA-Z0-9]+/);
    if (!match) {
      throw new Error('Failed to extract Stripe webhook secret');
    }
    console.log('Stripe webhook created.');
    return match[0];
  } catch (error) {
    console.error(
      'Failed to create Stripe webhook. Check your Stripe CLI installation and permissions.'
    );
    if (os.platform() === 'win32') {
      console.log(
        'Note: On Windows, you may need to run this script as an administrator.'
      );
    }
    throw error;
  }
}

async function shouldConfigurePayPal() {
  console.log('Step 3: PayPal configuration');
  const answer = await question(
    'Do you want to configure PayPal now? (y/n): '
  );

  return answer.toLowerCase() === 'y';
}

async function getPayPalEnvironment() {
  const environment = await question(
    'PayPal environment (sandbox/production) [sandbox]: '
  );

  if (environment.toLowerCase() === 'production') {
    return 'production';
  }

  return 'sandbox';
}

async function getPayPalClientId() {
  return await question('Enter your PayPal Client ID: ');
}

async function getPayPalClientSecret() {
  return await question('Enter your PayPal Client Secret: ');
}

async function getPayPalWebhookId() {
  return await question('Enter your PayPal Webhook ID (optional): ');
}

function generateAuthSecret(): string {
  console.log('Step 4: Generating AUTH_SECRET...');
  return crypto.randomBytes(32).toString('hex');
}

async function writeEnvFile(envVars: Record<string, string>) {
  console.log('Step 5: Writing environment variables to .env');
  const envContent = Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  await fs.writeFile(path.join(process.cwd(), '.env'), envContent);
  console.log('.env file created with the necessary variables.');
}

async function shouldConfigureStripe() {
  console.log('Step 2: Stripe configuration');
  const answer = await question(
    'Do you want to configure Stripe now? (y/n): '
  );

  return answer.toLowerCase() === 'y';
}

async function main() {
  const POSTGRES_URL = await getPostgresURL();
  const configureStripe = await shouldConfigureStripe();
  const configurePayPal = await shouldConfigurePayPal();
  const envVars: Record<string, string> = { POSTGRES_URL };

  if (configureStripe) {
    await checkStripeCLI();
    envVars.STRIPE_SECRET_KEY = await getStripeSecretKey();
    envVars.STRIPE_WEBHOOK_SECRET = await createStripeWebhook();
  }

  if (configurePayPal) {
    envVars.PAYPAL_ENVIRONMENT = await getPayPalEnvironment();
    envVars.PAYPAL_CLIENT_ID = await getPayPalClientId();
    envVars.PAYPAL_CLIENT_SECRET = await getPayPalClientSecret();
    envVars.NEXT_PUBLIC_PAYPAL_CLIENT_ID = envVars.PAYPAL_CLIENT_ID;

    const paypalWebhookId = await getPayPalWebhookId();
    if (paypalWebhookId) {
      envVars.PAYPAL_WEBHOOK_ID = paypalWebhookId;
    }

    envVars.PAYPAL_CURRENCY = 'USD';
  }

  const BASE_URL = 'http://localhost:3000';
  const AUTH_SECRET = generateAuthSecret();
  envVars.BASE_URL = BASE_URL;
  envVars.AUTH_SECRET = AUTH_SECRET;

  await writeEnvFile(envVars);

  console.log('Setup completed successfully!');
}

main().catch(console.error);
