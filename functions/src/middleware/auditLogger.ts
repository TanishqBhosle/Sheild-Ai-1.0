import { Request, Response, NextFunction } from "express";
import { writeAuditLog } from "../utils/firestoreHelpers";

export function auditLogger(action: string, resourceType: string) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    const ctx = req.authContext;
    if (!ctx || !ctx.orgId) {
      next();
      return;
    }

    try {
      const resourceId = req.params.id || req.params.contentId || req.params.policyId || "";
      await writeAuditLog({
        orgId: ctx.orgId,
        actor: ctx.uid,
        actorEmail: ctx.email,
        action,
        resourceType,
        resourceId,
        ipAddress: req.ip || req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });
    } catch (err) {
      console.error("Audit log error:", err);
    }

    next();
  };
}
