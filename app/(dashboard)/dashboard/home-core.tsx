'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardFooter
} from '@/components/ui/card';
import { ThemedAsyncSubmitButton } from '@/components/ui/themed-async-submit-button';
import { ThemedConfirmSubmitButton } from '@/components/ui/themed-confirm-submit-button';
import { useActionState } from 'react';
import { TeamDataWithMembers, User } from '@/lib/db/schema';
import useSWR from 'swr';
import { Suspense } from 'react';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { PlusCircle } from 'lucide-react';
import { useNotify } from '@/components/ui/notify';
import {
  customerPortalAction,
  inviteTeamMember,
  removeTeamMember
} from './actions';
import { useAreaMessages, useI18n } from '@/lib/i18n/client';

type ActionState = {
  error?: string;
  success?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function SubscriptionSkeleton() {
  const messages = useAreaMessages('dashboard');

  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>{messages.team.subscription.title}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ManageSubscription() {
  const messages = useAreaMessages('dashboard');
  const subscription = messages.team.subscription;
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{subscription.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <p className="font-medium">
                {subscription.currentPlan}:{' '}
                {teamData?.paymentProvider
                  ? teamData?.planName || subscription.unknown
                  : subscription.free}
              </p>
              <p className="text-sm text-muted-foreground">
                {teamData?.subscriptionStatus === 'active'
                  ? subscription.billedMonthly
                  : teamData?.subscriptionStatus === 'trialing'
                  ? subscription.trialPeriod
                  : subscription.noActiveSubscription}
              </p>
            </div>
            <form action={customerPortalAction}>
              <ThemedAsyncSubmitButton
                variant="outline"
                idleLabel={
                  teamData?.paymentProvider === 'paypal'
                    ? subscription.cancel
                    : subscription.manage
                }
                slot="dashboard.home.subscription.manage"
              />
            </form>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembersSkeleton() {
  const messages = useAreaMessages('dashboard');

  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>{messages.team.members.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="animate-pulse space-y-4 mt-1">
          <div className="flex items-center space-x-4">
            <div className="size-8 rounded-full bg-muted"></div>
            <div className="space-y-2">
              <div className="h-4 w-32 rounded bg-muted"></div>
              <div className="h-3 w-14 rounded bg-muted"></div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TeamMembers() {
  const messages = useAreaMessages('dashboard');
  const teamMembers = messages.team.members;
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const [removeState, removeAction, isRemovePending] = useActionState<
    ActionState,
    FormData
  >(removeTeamMember, {});

  const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) => {
    return user.name || user.email || teamMembers.unknownUser;
  };

  if (!teamData?.teamMembers?.length) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{teamMembers.title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{teamMembers.noMembers}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{teamMembers.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {teamData.teamMembers.map((member, index) => {
            const formId = `remove-team-member-${member.id}`;

            return (
              <li key={member.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <Avatar>
                    {/* 
                      This app doesn't save profile images, but here
                      is how you'd show them:

                      <AvatarImage
                        src={member.user.image || ''}
                        alt={getUserDisplayName(member.user)}
                      />
                    */}
                    <AvatarFallback>
                      {getUserDisplayName(member.user)
                        .split(' ')
                        .map((n) => n[0])
                        .join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium">
                      {getUserDisplayName(member.user)}
                    </p>
                    <p className="text-sm text-muted-foreground capitalize">
                      {member.role}
                    </p>
                  </div>
                </div>
                {index > 1 ? (
                  <form id={formId} action={removeAction}>
                    <input type="hidden" name="memberId" value={member.id} />
                    <ThemedConfirmSubmitButton
                      formId={formId}
                      title={teamMembers.confirmRemoveTitle}
                      description={teamMembers.confirmRemoveDescription}
                      triggerLabel={teamMembers.remove}
                      confirmLabel={teamMembers.confirm}
                      cancelLabel={teamMembers.cancel}
                      triggerVariant="outline"
                      triggerSize="sm"
                      disabled={isRemovePending}
                      slot="dashboard.home.members.remove"
                    />
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
        {removeState?.error && (
          <p className="text-red-500 mt-4">{removeState.error}</p>
        )}
      </CardContent>
    </Card>
  );
}

function InviteTeamMemberSkeleton() {
  const messages = useAreaMessages('dashboard');

  return (
    <Card className="h-[260px]">
      <CardHeader>
        <CardTitle>{messages.team.invite.title}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function InviteTeamMember() {
  const messages = useAreaMessages('dashboard');
  const invite = messages.team.invite;
  const t = useI18n();
  const { data: user } = useSWR<User>('/api/user', fetcher);
  const isOwner = user?.role === 'owner';
  const notify = useNotify();
  const [inviteState, inviteAction] = useActionState<
    ActionState,
    FormData
  >(inviteTeamMember, {});

  function handleInviteSubmit(event: React.FormEvent<HTMLFormElement>) {
    if (isOwner) {
      return;
    }

    event.preventDefault();
    notify.warning(t('You must be a team owner to invite new members.'));
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{invite.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={inviteAction} className="space-y-4" onSubmit={handleInviteSubmit}>
          <div>
            <Label htmlFor="email" className="mb-2">
              {invite.emailLabel}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={invite.emailPlaceholder}
              required
              disabled={!isOwner}
            />
          </div>
          <div>
            <Label>{invite.roleLabel}</Label>
            <RadioGroup
              defaultValue="member"
              name="role"
              className="flex space-x-4"
              disabled={!isOwner}
            >
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="member" id="member" />
                <Label htmlFor="member">{invite.member}</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="owner" id="owner" />
                <Label htmlFor="owner">{invite.owner}</Label>
              </div>
            </RadioGroup>
          </div>
          {inviteState?.error && (
            <p className="text-red-500">{inviteState.error}</p>
          )}
          {inviteState?.success && (
            <p className="text-green-500">{inviteState.success}</p>
          )}
          <ThemedAsyncSubmitButton
            idleLabel={invite.inviteMember}
            pendingLabel={invite.inviting}
            idleIcon={<PlusCircle className="mr-2 h-4 w-4" />}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            disabled={!user}
            slot="dashboard.home.invite.submit"
          />
        </form>
      </CardContent>
      {!isOwner && (
        <CardFooter>
          <p className="text-sm text-muted-foreground">
            {invite.ownerRequired}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

export default function DashboardHomeCore() {
  const messages = useAreaMessages('dashboard');

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">
        {messages.team.title}
      </h1>
      <Suspense fallback={<SubscriptionSkeleton />}>
        <ManageSubscription />
      </Suspense>
      <Suspense fallback={<TeamMembersSkeleton />}>
        <TeamMembers />
      </Suspense>
      <Suspense fallback={<InviteTeamMemberSkeleton />}>
        <InviteTeamMember />
      </Suspense>
    </section>
  );
}
