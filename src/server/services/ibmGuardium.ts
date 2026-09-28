import crypto from 'crypto';
import { AuditLog, UserRole } from '../types.ts';

export class IbmGuardiumService {
  private lastHash: string = '0000000000000000000000000000000000000000000000000000000000000000';

  constructor() {}

  /**
   * Data Minimization: Mask sensitive patient identifiers
   * Example: "John Mwangi" -> "J*** M*****"
   * "0712345678" -> "+254 7** ***678"
   */
  public maskName(name: string): string {
    if (!name) return '***';
    const parts = name.trim().split(/\s+/);
    return parts.map(part => {
      if (part.length <= 2) return part[0] + '*';
      return part[0] + '*'.repeat(Math.max(1, part.length - 2)) + part[part.length - 1];
    }).join(' ');
  }

  public maskPhone(phone: string): string {
    if (!phone) return '***';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length < 8) return '****';
    const last3 = cleaned.slice(-3);
    const prefix = cleaned.length >= 10 ? cleaned.slice(0, 4) : cleaned.slice(0, 2);
    return `+${prefix} *** ***${last3}`;
  }

  public maskCardNumber(cardNum: string): string {
    const cleaned = cardNum.replace(/\s+/g, '');
    if (cleaned.length < 4) return '****';
    return `**** **** **** ${cleaned.slice(-4)}`;
  }

  public generatePatientReference(seedId?: string): string {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const middle = Math.floor(1000 + Math.random() * 9000);
    return `PAT-${middle}-${randomSuffix}`;
  }

  /**
   * Cryptographic Hash Chaining:
   * Each audit log links back to the previous log entry's hash.
   * Any tampering breaks the hash chain.
   */
  public createChainedAuditEntry(params: {
    actorId: string;
    actorRole: UserRole;
    actorEmail: string;
    organizationId?: string;
    eventType: AuditLog['eventType'];
    resource: string;
    action: string;
    result: AuditLog['result'];
    severity: AuditLog['severity'];
    metadata: Record<string, any>;
    customTimestamp?: string;
  }): AuditLog {
    const timestamp = params.customTimestamp || new Date().toISOString();
    const id = `AUD-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;
    
    // Sanitize metadata to remove any raw passwords, card PANs, or secret tokens
    const sanitizedMetadata = this.sanitizeMetadata(params.metadata);

    const payloadToHash = JSON.stringify({
      id,
      timestamp,
      previousHash: this.lastHash,
      actorId: params.actorId,
      actorRole: params.actorRole,
      eventType: params.eventType,
      resource: params.resource,
      action: params.action,
      result: params.result,
      severity: params.severity,
      metadata: sanitizedMetadata
    });

    const entryHash = crypto.createHash('sha256').update(payloadToHash).digest('hex');
    const previousHash = this.lastHash;
    this.lastHash = entryHash;

    const entry: AuditLog = {
      id,
      timestamp,
      actorId: params.actorId,
      actorRole: params.actorRole,
      actorEmail: params.actorEmail,
      organizationId: params.organizationId,
      eventType: params.eventType,
      resource: params.resource,
      action: params.action,
      result: params.result,
      severity: params.severity,
      metadata: sanitizedMetadata,
      previousHash,
      entryHash
    };

    return entry;
  }

  /**
   * Verify the integrity of an audit chain
   */
  public verifyAuditChain(logs: AuditLog[]): { isValid: boolean; brokenAt?: string; totalVerified: number } {
    if (logs.length === 0) return { isValid: true, totalVerified: 0 };

    for (let i = 0; i < logs.length; i++) {
      const current = logs[i];
      const prevHash = i === 0 ? current.previousHash : logs[i - 1].entryHash;

      if (current.previousHash !== prevHash) {
        return { isValid: false, brokenAt: current.id, totalVerified: i };
      }

      const payloadToHash = JSON.stringify({
        id: current.id,
        timestamp: current.timestamp,
        previousHash: current.previousHash,
        actorId: current.actorId,
        actorRole: current.actorRole,
        eventType: current.eventType,
        resource: current.resource,
        action: current.action,
        result: current.result,
        severity: current.severity,
        metadata: current.metadata
      });

      const recomputed = crypto.createHash('sha256').update(payloadToHash).digest('hex');
      if (recomputed !== current.entryHash) {
        return { isValid: false, brokenAt: current.id, totalVerified: i };
      }
    }

    return { isValid: true, totalVerified: logs.length };
  }

  /**
   * Ensure no PANs, CVVs, PINs, or raw patient records leak into logs
   */
  private sanitizeMetadata(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    const sensitiveKeys = ['password', 'cvv', 'pin', 'card_number', 'pan', 'token', 'secret'];
    
    for (const key of Object.keys(sanitized)) {
      const lower = key.toLowerCase();
      if (sensitiveKeys.some(k => lower.includes(k))) {
        sanitized[key] = '[REDACTED_BY_GUARDIUM_POLICY]';
      } else if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
        sanitized[key] = this.sanitizeMetadata(sanitized[key]);
      }
    }
    return sanitized;
  }
}

export const guardiumService = new IbmGuardiumService();
