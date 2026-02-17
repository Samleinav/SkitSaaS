export type DualWriteReplayEntry = {
  id: number;
  domain: string;
  replayKey: string;
  payload: string;
  status: 'pending' | 'processing' | 'failed';
  attempts: number;
  maxAttempts: number;
  nextAttemptAt: Date;
  lastError: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type DualWriteReplayFailureResult = {
  isTerminal: boolean;
};

export function parseDualWriteReplayPayload<T>(entry: DualWriteReplayEntry): T {
  return JSON.parse(entry.payload) as T;
}

export async function enqueueDualWriteReplay() {
  return { queued: false, reason: 'dual_write_removed' } as const;
}

export async function getPendingDualWriteReplayEntries() {
  return [] as DualWriteReplayEntry[];
}

export async function claimDualWriteReplayEntry() {
  return null as DualWriteReplayEntry | null;
}

export async function completeDualWriteReplayEntry() {
  return;
}

export async function failDualWriteReplayEntry(): Promise<DualWriteReplayFailureResult> {
  return { isTerminal: true };
}
