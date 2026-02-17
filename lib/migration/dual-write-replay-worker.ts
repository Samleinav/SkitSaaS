export type DualWriteReplayRunSummary = {
  scanned: number;
  claimed: number;
  replayed: number;
  failed: number;
  terminalFailed: number;
};

export async function runDualWriteReplayBatch(): Promise<DualWriteReplayRunSummary> {
  return {
    scanned: 0,
    claimed: 0,
    replayed: 0,
    failed: 0,
    terminalFailed: 0
  };
}
