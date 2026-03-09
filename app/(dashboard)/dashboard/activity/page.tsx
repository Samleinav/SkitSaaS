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
  getServerLocaleAndMessages,
  getServerTranslator
} from '@/lib/i18n/server';
import { formatRelativeTimeLabel } from '@/lib/i18n/formatting';
import type { DashboardMessages } from '@/lib/i18n/messages/dashboard';
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

function formatAction(
  action: ActivityType,
  messages: DashboardMessages['activity']['actions']
): string {
  switch (action) {
    case ActivityType.SIGN_UP:
      return messages.signUp;
    case ActivityType.SIGN_IN:
      return messages.signIn;
    case ActivityType.SIGN_OUT:
      return messages.signOut;
    case ActivityType.UPDATE_PASSWORD:
      return messages.updatePassword;
    case ActivityType.DELETE_ACCOUNT:
      return messages.deleteAccount;
    case ActivityType.UPDATE_ACCOUNT:
      return messages.updateAccount;
    case ActivityType.CREATE_TEAM:
      return messages.createTeam;
    case ActivityType.REMOVE_TEAM_MEMBER:
      return messages.removeTeamMember;
    case ActivityType.INVITE_TEAM_MEMBER:
      return messages.inviteTeamMember;
    case ActivityType.ACCEPT_INVITATION:
      return messages.acceptInvitation;
    case ActivityType.RESET_PASSWORD:
      return messages.resetPassword;
    default:
      return messages.unknown;
  }
}

export default async function ActivityPage() {
  const [{ locale, messages }, logs, themeSelection, t] = await Promise.all([
    getServerLocaleAndMessages('dashboard'),
    getActivityLogs(),
    getThemeSelectionForArea('dashboard'),
    getServerTranslator()
  ]);
  const activity = messages.activity;
  const fallbackPage = (
    <section className="flex-1 p-4 lg:p-8">
      <h1 className="mb-6 text-lg font-medium text-foreground lg:text-2xl">
        {activity.title}
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>{activity.recentActivity}</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length > 0 ? (
            <ul className="space-y-4">
              {logs.map((log) => {
                const Icon = iconMap[log.action as ActivityType] || Settings;
                const formattedAction = formatAction(
                  log.action as ActivityType,
                  activity.actions
                );

                return (
                  <li key={log.id} className="flex items-center space-x-4">
                    <div className="rounded-full bg-primary/10 p-2">
                      <Icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {formattedAction}
                        {log.ipAddress && ` ${activity.fromIp} ${log.ipAddress}`}
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
                {activity.noActivityTitle}
              </h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                {activity.noActivityDescription}
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
        title: activity.title,
        description: activity.recentActivity
      }}
      fallback={fallbackPage}
    >
      {fallbackPage}
    </ThemeCodeTemplate>
  );
}
