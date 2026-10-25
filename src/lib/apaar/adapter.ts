import type { ApaarStatus } from '@/types';

export interface ApaarVerificationRequest {
  studentRecordId: string;
  identifier: string;
  /** Optional corroborating fields; never send more than the authorized scope allows. */
  studentName?: string;
}

export interface ApaarVerificationResult {
  studentRecordId: string;
  status: Extract<
    ApaarStatus,
    | 'Verified by Authorized Source'
    | 'Verification Failed'
    | 'Verification Unavailable'
    | 'Submitted for Verification'
  >;
  source: string;
  checkedAt: string;
  /** Raw adapter message retained as evidence for review. */
  evidence: string;
}

export interface ApaarAdapter {
  readonly kind: 'simulated' | 'authorized';
  readonly label: string;
  status(): Promise<{
    state: 'Simulated' | 'Connected' | 'Unavailable' | 'Error' | 'Not Configured';
    message: string;
  }>;
  submitForVerification(requests: ApaarVerificationRequest[]): Promise<ApaarVerificationResult[]>;
}

/**
 * Simulated adapter used by the demonstration build.
 *
 * It never contacts a government service, never generates an identifier and
 * never claims an identifier is verified. The result it returns is explicitly
 * marked as simulated so the UI can keep the distinction visible.
 */
export class SimulatedApaarAdapter implements ApaarAdapter {
  readonly kind = 'simulated' as const;
  readonly label = 'Simulated APAAR/ABC adapter (no live connection)';

  async status() {
    return {
      state: 'Simulated' as const,
      message:
        'APAAR/ABC verification is simulated. No live government verification has been performed.',
    };
  }

  async submitForVerification(
    requests: ApaarVerificationRequest[],
  ): Promise<ApaarVerificationResult[]> {
    const checkedAt = new Date().toISOString();
    return requests.map((request) => ({
      studentRecordId: request.studentRecordId,
      status: 'Submitted for Verification',
      source: 'Simulated adapter (demonstration)',
      checkedAt,
      evidence:
        'Request accepted by the demonstration adapter. No authorized government source was contacted.',
    }));
  }
}

export const apaarAdapter: ApaarAdapter = new SimulatedApaarAdapter();
