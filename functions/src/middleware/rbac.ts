import { Request, Response, NextFunction } from "express";
import { UserRole } from "../types";

const ROLE_HIERARCHY: Record<UserRole, number> = {
  platform_admin: 100,
  org_owner: 80,
  org_admin: 60,
  moderator: 40,
  viewer: 20,
  api_key: 10,
};

export function requireRole(...allowedRoles: UserRole[]) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ctx = req.authContext;
    if (!ctx) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    // Platform admin always has access
    if (ctx.role === "platform_admin") {
      next();
      return;
    }

    if (!allowedRoles.includes(ctx.role)) {
      res.status(403).json({
        error: "Insufficient permissions",
        required: allowedRoles,
        current: ctx.role,
      });
      return;
    }

    next();
  };
}

export function requireMinRole(minRole: UserRole) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ctx = req.authContext;
    if (!ctx) {
      res.status(401).json({ error: "Not authenticated" });
      return;
    }

    const userLevel = ROLE_HIERARCHY[ctx.role] || 0;
    const requiredLevel = ROLE_HIERARCHY[minRole] || 0;

    if (userLevel < requiredLevel) {
      res.status(403).json({
        error: "Insufficient permissions",
        requiredMinRole: minRole,
        currentRole: ctx.role,
      });
      return;
    }

    next();
  };
}
