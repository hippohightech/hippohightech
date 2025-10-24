import { Response, NextFunction } from 'express';
import db from '../database';
import { AuthRequest } from './auth';
import { Organization, OrganizationMember } from '../types';

export interface OrgRequest extends AuthRequest {
  organization?: Organization;
  userRole?: string;
}

export const requireOrganization = async (
  req: OrgRequest,
  res: Response,
  next: NextFunction
) => {
  const organizationId = req.params.organizationId || req.body.organization_id || req.query.organization_id;

  if (!organizationId) {
    return res.status(400).json({ error: 'Organization ID required' });
  }

  db.get(
    'SELECT * FROM organizations WHERE id = ?',
    [organizationId],
    (err, organization: Organization) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      req.organization = organization;
      next();
    }
  );
};

export const requireOrganizationMember = async (
  req: OrgRequest,
  res: Response,
  next: NextFunction
) => {
  const organizationId = req.organization?.id || req.params.organizationId;

  if (!organizationId || !req.userId) {
    return res.status(400).json({ error: 'Missing required parameters' });
  }

  db.get(
    'SELECT * FROM organization_members WHERE organization_id = ? AND user_id = ?',
    [organizationId, req.userId],
    (err, member: OrganizationMember) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }
      if (!member) {
        return res.status(403).json({ error: 'You are not a member of this organization' });
      }

      req.userRole = member.role;
      next();
    }
  );
};

export const requireOrganizationAdmin = async (
  req: OrgRequest,
  res: Response,
  next: NextFunction
) => {
  if (req.userRole !== 'admin' && req.userRole !== 'owner') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};

export const checkSubscriptionLimits = async (
  req: OrgRequest,
  res: Response,
  next: NextFunction
) => {
  const organization = req.organization;

  if (!organization) {
    return res.status(400).json({ error: 'Organization not found' });
  }

  // Check member limit for invitation
  if (req.path.includes('/invite')) {
    db.get(
      'SELECT COUNT(*) as count FROM organization_members WHERE organization_id = ?',
      [organization.id],
      (err, result: any) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (result.count >= organization.max_members) {
          return res.status(403).json({
            error: `Member limit reached. Upgrade your plan to add more members.`,
            limit: organization.max_members,
          });
        }
        next();
      }
    );
  }
  // Check expense limit for creating expenses
  else if (req.path.includes('/expenses') && req.method === 'POST') {
    if (organization.max_expenses === -1) {
      // Unlimited
      return next();
    }

    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    db.get(
      `SELECT COUNT(*) as count FROM expenses
       WHERE organization_id = ? AND date LIKE ?`,
      [organization.id, `${currentMonth}%`],
      (err, result: any) => {
        if (err) {
          return res.status(500).json({ error: 'Database error' });
        }
        if (result.count >= organization.max_expenses) {
          return res.status(403).json({
            error: `Monthly expense limit reached. Upgrade your plan to add more expenses.`,
            limit: organization.max_expenses,
          });
        }
        next();
      }
    );
  } else {
    next();
  }
};
