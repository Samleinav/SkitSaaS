import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Settings,
  LogOut,
  UserPlus,
  Lock,
  UserCog,
  AlertCircle,
  UserMinus,
  Mail,
  CheckCircle,
  type LucideIcon,
} from 'lucide-react';
import { ActivityType } from '@/lib/db/schema';
import { getActivityLogs } from '@/lib/db/queries';
import {
  getRequestLocale,
  getServerTranslator
} from '@/lib/i18n/server';
import { formatRelativeTimeLabel } from '@/lib/i18n/formatting';
import { ThemeCodeTemplate } from '@/components/theme/theme-code-template';
import { getThemeSelectionForArea } from '@/lib/theme-runtime';

const iconMap: Record<ActivityType, LucideIcon> = {
  [ActivityType.SIGN_UP]: UserPlus,
  [ActivityType.SIGN_IN]: UserCog,
  [ActivityType.SIGN_OUT]: LogOut,
  [ActivityType.UPDATE_PASSWORD]: Lock,
  [ActivityType.DELETE_ACCOUNT]: UserMinus,
  [ActivityType.UPDATE_ACCOUNT]: Settings,
  [ActivityType.CREATE_TEAM]: UserPlus,
  [ActivityType.REMOVE_TEAM_MEMBER]: UserMinus,
  [ActivityType.INVITE_TEAM_MEMBER]: Mail,
  [ActivityType.ACCEPT_INVITATION]: CheckCircle,
  [ActivityType.RESET_PASSWORD]: Lock,
};

type DashboardActivityCopy = {
  title: string;
  recentActivity: string;
  fromIp: string;
  noActivityTitle: string;
  noActivityDescription: string;
  actions: {
    signUp: string;
    signIn: string;
    signOut: string;
    updatePassword: string;
    deleteAccount: string;
    updateAccount: string;
    createTeam: string;
    removeTeamMember: string;
    inviteTeamMember: string;
    acceptInvitation: string;
    resetPassword: string;
    unknown: string;
  };
};

function createDashboardActivityCopy(t: Awaited<ReturnType<typeof getServerTranslator>>): DashboardActivityCopy {
  return {
    title: t('Activity Log'),
    recentActivity: t('Recent Activity'),
    fromIp: t('from IP'),
    noActivityTitle: t('No activity yet'),
    noActivityDescription: t(
      "When you perform actions like signing in or updating your account, they'll appear here."
    ),
    actions: {
      signUp: t('You signed up'),
      signIn: t('You signed in'),
      signOut: t('You signed out'),
      updatePassword: t('You changed your password'),
      deleteAccount: t('You deleted your account'),
      updateAccount: t('You updated your account'),
      createTeam: t('You created a new team'),
      removeTeamMember: t('You removed a team member'),
      inviteTeamMember: t('You invited a team member'),
      acceptInvitation: t('You accepted an invitation'),
      resetPassword: t('You reset your password'),
      unknown: t('Unknown action occurred')
    }
  };
}

function formatAction(
  action: ActivityType,
  actions: DashboardActivityCopy['actions']
): string {
  switch (action) {
    case ActivityType.SIGN_UP:
      return actions.signUp;
    case ActivityType.SIGN_IN:
      return actions.signIn;
    case ActivityType.SIGN_OUT:
      return actions.signOut;
    case ActivityType.UPDATE_PASSWORD:
      return actions.updatePassword;
    case ActivityType.DELETE_ACCOUNT:
      return actions.deleteAccount;
    case ActivityType.UPDATE_ACCOUNT:
      return actions.updateAccount;
    case ActivityType.CREATE_TEAM:
      return actions.createTeam;
    case ActivityType.REMOVE_TEAM_MEMBER:
      return actions.removeTeamMember;
    case ActivityType.INVITE_TEAM_MEMBER:
      return actions.inviteTeamMember;
    case ActivityType.ACCEPT_INVITATION:
      return actions.acceptInvitation;
    case ActivityType.RESET_PASSWORD:
      return actions.resetPassword;
    default:
      return actions.unknown;
  }
}

export default async function ActivityPage() {
  const [locale, logs, themeSelection, t] = await Promise.all([
    getRequestLocale(),
    getActivityLogs(),
    getThemeSelectionForArea('dashboard'),
    getServerTranslator({ area: 'dashboard' })
  ]);
  const copy = createDashboardActivityCopy(t);
  const fallbackPage = (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="mb-6 text-lg font-medium text-foreground lg:text-2xl">
        {copy.title}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{copy.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log) => {
                const Icon = iconMap[log.action as ActivityType] || Settings;
                const formattedAction = formatAction(
                  log.action as ActivityType,
                  copy.actions
                );

                return (
                  <li key={log.id} className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {formattedAction}
                        {log.ipAddress && ` ${copy.fromIp} ${log.ipAddress}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTimeLabel({
                          date: new Date(log.timestamp),
                          locale,
                          t
                        })}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <AlertCircle className="mb-4 h-12 w-12 text-primary" />
              <h3 className="mb-2 text-lg font-semibold text-foreground">
                {copy.noActivityTitle}
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                {copy.noActivityDescription}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  );

  if (!themeSelection.themeKey) {
    return fallbackPage;
  }

  return (
    <ThemeCodeTemplate
      themeId={themeSelection.themeKey}
      id="page.dashboard.activity"
      data={{
        title: copy.title,
        description: copy.recentActivity
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
