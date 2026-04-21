import { eq } from 'drizzle-orm';
import { db } from './drizzle';
import { teamMembers } from './schema';

export type PrimaryTeamMembership = {
  id: number;
  teamId: number;
  role: string;
  joinedAt: Date;
};

function isOwnerRole(role: string) {
  return role.trim().toLowerCase() === 'owner';
}

export function comparePrimaryTeamMembership(
  left: PrimaryTeamMembership,
  right: PrimaryTeamMembership
) {
  const leftIsOwner = isOwnerRole(left.role);
  const rightIsOwner = isOwnerRole(right.role);
  if (leftIsOwner !== rightIsOwner) {
    return leftIsOwner ? -1 : 1;
  }

  const byJoinedAt = left.joinedAt.getTime() - right.joinedAt.getTime();
  if (byJoinedAt !== 0) {
    return byJoinedAt;
  }

  const byTeamId = left.teamId - right.teamId;
  if (byTeamId !== 0) {
    return byTeamId;
  }

  return left.id - right.id;
}

export function pickPrimaryTeamMembership<T extends PrimaryTeamMembership>(
  memberships: readonly T[]
): T | null {
  let selectedMembership: T | null = null;

  for (const membership of memberships) {
    if (
      !selectedMembership ||
      comparePrimaryTeamMembership(membership, selectedMembership) < 0
    ) {
      selectedMembership = membership;
    }
  }

  return selectedMembership;
}

export async function getPrimaryTeamMembershipForUserId(userId: number) {
  const memberships = await db
    .select({
      id: teamMembers.id,
      teamId: teamMembers.teamId,
      role: teamMembers.role,
      joinedAt: teamMembers.joinedAt
    })
    .from(teamMembers)
    .where(eq(teamMembers.userId, userId));

  return pickPrimaryTeamMembership(memberships);
}
