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
import { useI18n } from '@/lib/i18n/client';

type ActionState = {
  error?: string;
  success?: string;
};

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function SubscriptionSkeleton() {
  const t = useI18n({ area: 'dashboard' });

  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>{t('Team Subscription')}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function ManageSubscription() {
  const t = useI18n({ area: 'dashboard' });
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t('Team Subscription')}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div className="mb-4 sm:mb-0">
              <p className="font-medium">
                {t('Current Plan')}:{' '}
                {teamData?.paymentProvider
                  ? teamData?.planName || t('Unknown')
                  : t('Subscription Free')}
              </p>
              <p className="text-sm text-muted-foreground">
                {teamData?.subscriptionStatus === 'active'
                  ? t('Billed monthly')
                  : teamData?.subscriptionStatus === 'trialing'
                    ? t('Trial period')
                    : t('No active subscription')}
              </p>
            </div>
            <form action={customerPortalAction}>
              <ThemedAsyncSubmitButton
                variant="outline"
                idleLabel={
                  teamData?.paymentProvider === 'paypal'
                    ? t('Cancel Subscription')
                    : t('Manage Subscription')
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
  const t = useI18n({ area: 'dashboard' });

  return (
    <Card className="mb-8 h-[140px]">
      <CardHeader>
        <CardTitle>{t('Team Members')}</CardTitle>
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
  const t = useI18n({ area: 'dashboard' });
  const { data: teamData } = useSWR<TeamDataWithMembers>('/api/team', fetcher);
  const [removeState, removeAction, isRemovePending] = useActionState<
    ActionState,
    FormData
  >(removeTeamMember, {});

  const getUserDisplayName = (user: Pick<User, 'id' | 'name' | 'email'>) => {
    return user.name || user.email || t('Unknown User');
  };

  if (!teamData?.teamMembers?.length) {
    return (
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>{t('Team Members')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">{t('No team members yet.')}</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>{t('Team Members')}</CardTitle>
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
                      title={t('Remove this team member?')}
                      description={t(
                        'This person will lose access to the team immediately.'
                      )}
                      triggerLabel={t('Remove')}
                      confirmLabel={t('Remove member')}
                      cancelLabel={t('Cancel')}
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
  const t = useI18n({ area: 'dashboard' });

  return (
    <Card className="h-[260px]">
      <CardHeader>
        <CardTitle>{t('Invite Team Member')}</CardTitle>
      </CardHeader>
    </Card>
  );
}

function InviteTeamMember() {
  const t = useI18n({ area: 'dashboard' });
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
        <CardTitle>{t('Invite Team Member')}</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={inviteAction} className="space-y-4" onSubmit={handleInviteSubmit}>
          <div>
            <Label htmlFor="email" className="mb-2">
              {t('Email')}
            </Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder={t('Enter email')}
              required
              disabled={!isOwner}
            />
          </div>
          <div>
            <Label>{t('Role')}</Label>
            <RadioGroup
              defaultValue="member"
              name="role"
              className="flex space-x-4"
              disabled={!isOwner}
            >
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="member" id="member" />
                <Label htmlFor="member">{t('Member')}</Label>
              </div>
              <div className="flex items-center space-x-2 mt-2">
                <RadioGroupItem value="owner" id="owner" />
                <Label htmlFor="owner">{t('Owner')}</Label>
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
            idleLabel={t('Invite Member')}
            pendingLabel={t('Inviting...')}
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
            {t('You must be a team owner to invite new members.')}
          </p>
        </CardFooter>
      )}
    </Card>
  );
}

export default function DashboardHomeCore() {
  const t = useI18n({ area: 'dashboard' });

  return (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="text-lg lg:text-2xl font-medium mb-6">
        {t('Team Settings')}
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
