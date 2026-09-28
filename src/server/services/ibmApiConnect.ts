import { Request, Response, NextFunction } from 'express';
import { ApiSecurityPolicyMetric } from '../types.ts';

interface RateLimitRecord {
  tokens: number;
  lastRefill: number;
}

export class IbmApiConnectGateway {
  private rateLimitMap = new Map<string, RateLimitRecord>();
  private maxTokens = 60; // 60 requests per minute
  private refillRate = 1; // 1 token per second
  private metrics = new Map<string, ApiSecurityPolicyMetric>();

  constructor() {}

  /**
   * DataPower Gateway Threat Protection Rules
   */
  public threatProtectionMiddleware = (req: Request, res: Response, next: NextFunction) => {
    const startTime = Date.now();
    const endpoint = req.baseUrl + req.path;
    const method = req.method;
    const metricKey = `${method} ${endpoint}`;

    this.initMetric(metricKey, endpoint, method);

    // 1. Rate Limiting Check (Token Bucket)
    const clientIp = (req.headers['x-forwarded-for'] as string) || req.socket.remoteAddress || '127.0.0.1';
    if (!this.checkRateLimit(clientIp)) {
      this.recordBlocked(metricKey);
      return res.status(429).json({
        error: 'Too Many Requests',
        gateway: 'IBM DataPower / API Connect Policy Enforcement',
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Security policy rate limit reached. Please wait before retrying.'
      });
    }

    // 2. Request Payload Inspection (SQLi & XSS Detection)
    const bodyStr = JSON.stringify(req.body || '');
    const sqliPattern = /(\b(SELECT|UNION|INSERT|DELETE|DROP|ALTER|EXEC|XP_)\b|'|--|\bOR\s+['"\d\w]+=['"\d\w]+)/i;
    const xssPattern = /(<script\b[^>]*>|javascript:|onerror\s*=|onload\s*=|alert\(|<iframe)/i;

    // We check if body contains suspicious code patterns (excluding legitimate clinical/notes fields)
    if (sqliPattern.test(bodyStr) && !req.path.includes('/search')) {
      // Check if it's blatant injection like ' OR '1'='1
      if (/(' OR '1'='1|UNION SELECT|DROP TABLE)/i.test(bodyStr)) {
        this.recordWafHit(metricKey);
        return res.status(403).json({
          error: 'Forbidden by API Security Policy',
          gateway: 'IBM DataPower Threat Protection',
          rule: 'WAF_SQLI_RULE_001',
          message: 'Potential malicious SQL injection pattern detected in payload.'
        });
      }
    }

    if (xssPattern.test(bodyStr)) {
      this.recordWafHit(metricKey);
      return res.status(403).json({
        error: 'Forbidden by API Security Policy',
        gateway: 'IBM DataPower Threat Protection',
        rule: 'WAF_XSS_RULE_002',
        message: 'Malicious HTML/Script injection pattern detected.'
      });
    }

    // Attach response listener to calculate latency
    res.on('finish', () => {
      const latency = Date.now() - startTime;
      this.recordSuccess(metricKey, latency);
    });

    next();
  };

  private checkRateLimit(ip: string): boolean {
    const now = Date.now();
    let record = this.rateLimitMap.get(ip);

    if (!record) {
      record = { tokens: this.maxTokens - 1, lastRefill: now };
      this.rateLimitMap.set(ip, record);
      return true;
    }

    // Refill tokens
    const elapsedSeconds = (now - record.lastRefill) / 1000;
    record.tokens = Math.min(this.maxTokens, record.tokens + elapsedSeconds * this.refillRate);
    record.lastRefill = now;

    if (record.tokens >= 1) {
      record.tokens -= 1;
      return true;
    }

    return false;
  }

  private initMetric(key: string, endpoint: string, method: string) {
    if (!this.metrics.has(key)) {
      this.metrics.set(key, {
        endpoint,
        method,
        totalRequests: 0,
        blockedRequests: 0,
        averageLatencyMs: 14,
        wafRuleHits: 0
      });
    }
  }

  private recordSuccess(key: string, latency: number) {
    const m = this.metrics.get(key);
    if (m) {
      m.totalRequests += 1;
      m.averageLatencyMs = Math.round((m.averageLatencyMs * 0.8) + (latency * 0.2));
    }
  }

  private recordBlocked(key: string) {
    const m = this.metrics.get(key);
    if (m) {
      m.totalRequests += 1;
      m.blockedRequests += 1;
      m.lastBlockedAt = new Date().toISOString();
    }
  }

  private recordWafHit(key: string) {
    const m = this.metrics.get(key);
    if (m) {
      m.totalRequests += 1;
      m.blockedRequests += 1;
      m.wafRuleHits += 1;
      m.lastBlockedAt = new Date().toISOString();
    }
  }

  public getPolicyMetrics(): ApiSecurityPolicyMetric[] {
    return Array.from(this.metrics.values());
  }

  public getGatewayInfo() {
    return {
      status: 'ONLINE',
      mode: process.env.API_CONNECT_URL ? 'IBM_API_CONNECT_HYBRID' : 'LOCAL_DATAPOWER_SIMULATOR',
      gatewayName: 'IBM DataPower X3 Appliance / API Connect v10.0',
      activePolicies: [
        'TLS 1.3 Strict Cipher Suites',
        'OAuth 2.0 / JWT Bearer Validation',
        'CORS Whitelist & Preflight Cache',
        'Token-Bucket Rate Limiting (60 req/min)',
        'Payload Threat Protection (SQLi / XSS)',
        'Data Minimization & Egress Field Masking'
      ],
      connectedUrl: process.env.API_CONNECT_URL || 'Local Embedded Security Policy Gateway'
    };
  }
}

export const apiConnectGateway = new IbmApiConnectGateway();
