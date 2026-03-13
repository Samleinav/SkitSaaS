export type HubFeatureRow = {
  feature: string;
  description: string;
  included: string;
};

export type HubMemberRow = {
  id: string;
  name: string;
  role: string;
  joinedAt: string;
  status: string;
  email: string;
  bio: string;
};

export const HUB_FEATURES: HubFeatureRow[] = [
  {
    feature: 'Member directory',
    description: 'Access the full member list',
    included: 'Included'
  },
  {
    feature: 'Member profiles',
    description: 'View and edit individual profiles',
    included: 'Included'
  },
  {
    feature: 'Announcements',
    description: 'Receive hub-wide announcements',
    included: 'Included'
  },
  {
    feature: 'Events',
    description: 'Browse and RSVP to hub events',
    included: 'Included'
  },
  {
    feature: 'Reports',
    description: 'Export data and download reports',
    included: 'Pro'
  }
];

export const HUB_MEMBERS: HubMemberRow[] = [
  {
    id: '1',
    name: 'Alice Ramos',
    role: 'Admin',
    joinedAt: '2024-01-15',
    status: 'active',
    email: 'alice@example.com',
    bio: 'Portal administrator and community builder.'
  },
  {
    id: '2',
    name: 'Ben Nakamura',
    role: 'Member',
    joinedAt: '2024-02-20',
    status: 'active',
    email: 'ben@example.com',
    bio: 'Joined to connect with the community.'
  },
  {
    id: '3',
    name: 'Carla Osei',
    role: 'Member',
    joinedAt: '2024-03-05',
    status: 'inactive',
    email: 'carla@example.com',
    bio: 'Currently inactive.'
  },
  {
    id: '4',
    name: 'Diego Silva',
    role: 'Moderator',
    joinedAt: '2024-03-18',
    status: 'active',
    email: 'diego@example.com',
    bio: 'Helps moderate community discussions.'
  }
];
