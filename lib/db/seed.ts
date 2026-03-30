import { getStripeClient } from '../payments/stripe';
import { db } from './drizzle';
import { users, teams, teamMembers } from './schema';
import { hashPassword } from '@/lib/auth/session';
import { eq } from 'drizzle-orm';
import { areTeamsEnabled } from '@/lib/organizations/config';

function isTruthyEnvFlag(value: string | undefined) {
  const normalized = value?.trim().toLowerCase();
  return normalized === '1' || normalized === 'true' || normalized === 'yes';
}

function isProductionLikeEnvironment() {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.APP_ENV === 'production'
  );
}

function resolveSeedCredentials() {
  const defaultEmail = 'test@admin.com';
  const defaultPassword = 'admin123';
  const defaultTeamName = 'Test Team';

  const email = process.env.SEED_USER_EMAIL ?? defaultEmail;
  const password = process.env.SEED_USER_PASSWORD ?? defaultPassword;
  const teamName = process.env.SEED_TEAM_NAME ?? defaultTeamName;

  const usesDefaultEmail = email.trim().toLowerCase() === defaultEmail;
  const usesDefaultPassword = password === defaultPassword;

  return {
    email,
    password,
    teamName,
    usesDefaultEmail,
    usesDefaultPassword
  };
}

function assertSeedPolicy({
  usesDefaultEmail,
  usesDefaultPassword
}: {
  usesDefaultEmail: boolean;
  usesDefaultPassword: boolean;
}) {
  if (!isProductionLikeEnvironment()) {
    return;
  }

  if (!isTruthyEnvFlag(process.env.ALLOW_PRODUCTION_SEED)) {
    throw new Error(
      'Refusing to run seed in production. Set ALLOW_PRODUCTION_SEED=true only for controlled bootstrap.'
    );
  }

  if (usesDefaultEmail || usesDefaultPassword) {
    throw new Error(
      'Refusing to run production seed with default credentials. Set SEED_USER_EMAIL and SEED_USER_PASSWORD to secure values.'
    );
  }
}

async function createStripeProducts() {
  const stripe = await getStripeClient();
  if (!stripe) {
    console.log(
      'Skipping Stripe product creation because STRIPE_SECRET_KEY is not configured.'
    );
    return;
  }

  console.log('Creating Stripe products and prices...');

  const baseProduct = await stripe.products.create({
    name: 'Base',
    description: 'Base subscription plan',
  });

  await stripe.prices.create({
    product: baseProduct.id,
    unit_amount: 800, // $8 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  const plusProduct = await stripe.products.create({
    name: 'Plus',
    description: 'Plus subscription plan',
  });

  await stripe.prices.create({
    product: plusProduct.id,
    unit_amount: 1200, // $12 in cents
    currency: 'usd',
    recurring: {
      interval: 'month',
      trial_period_days: 7,
    },
  });

  console.log('Stripe products and prices created successfully.');
}

async function seed() {
  const {
    email,
    password,
    teamName,
    usesDefaultEmail,
    usesDefaultPassword
  } = resolveSeedCredentials();
  assertSeedPolicy({ usesDefaultEmail, usesDefaultPassword });

  const [existingUser] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  let user = existingUser;

  if (!user) {
    const passwordHash = await hashPassword(password);
    [user] = await db
      .insert(users)
      .values([
        {
          email,
          passwordHash,
          role: 'admin',
        },
      ])
      .returning();

    console.log('Bootstrap admin user created.');
  } else {
    if (user.role !== 'admin') {
      [user] = await db
        .update(users)
        .set({
          role: 'admin',
          updatedAt: new Date()
        })
        .where(eq(users.id, user.id))
        .returning();

      console.log(`User ${email} already existed. Promoted role to admin.`);
    } else {
      console.log(`User ${email} already exists with admin role. Skipping user creation.`);
    }
  }

  if (!user) {
    throw new Error('Failed to create or load seed user.');
  }

  if (!areTeamsEnabled()) {
    console.log('Teams disabled. Skipping bootstrap team creation.');
    return;
  }

  const [existingTeamMember] = await db
    .select({ teamId: teamMembers.teamId })
    .from(teamMembers)
    .where(eq(teamMembers.userId, user.id))
    .limit(1);

  if (existingTeamMember) {
    console.log(
      `User ${email} is already in team ${existingTeamMember.teamId}. Skipping team and Stripe seed.`
    );
    return;
  }

  const [team] = await db
    .insert(teams)
    .values({
      name: teamName,
    })
    .returning();

  await db.insert(teamMembers).values({
    teamId: team.id,
    userId: user.id,
    role: 'owner',
  });

  console.log(`Team ${team.name} created and user added as owner.`);

  await createStripeProducts();
}

seed()
  .catch((error) => {
    console.error('Seed process failed:', error);
    process.exit(1);
  })
  .finally(() => {
    console.log('Seed process finished. Exiting...');
    process.exit(0);
  });
