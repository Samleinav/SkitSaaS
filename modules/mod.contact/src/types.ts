export type ContactSubmissionRecord = {
  id: number;
  name: string;
  email: string;
  subject: string | null;
  message: string;
  sourcePath: string | null;
  createdAt: Date;
};
