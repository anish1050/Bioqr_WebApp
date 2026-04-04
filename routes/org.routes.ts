/**
 * Organisation Routes — BioSeal Architecture
 * 
 * Handles organisation CRUD and member management
 */

import { Router, Request, Response } from 'express';
import { authenticateToken } from '../helpers/auth.js';
import { UserQueries, OrganisationQueries, TeamQueries, QrPermissionQueries } from '../helpers/queries.js';
import { generateOrgId, generateTeamId } from '../helpers/uniqueId.js';

const router = Router();

// ─── Create Organisation ──────────────────────────────────────

router.post('/create', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { name, description, industry, website } = req.body;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Organisation name is required (min 2 characters)' });
        }

        // Check user exists and doesn't already belong to an org
        const user = await UserQueries.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.org_id) {
            return res.status(400).json({ success: false, message: 'You already belong to an organisation' });
        }

        // Generate unique org ID
        const orgUniqueId = generateOrgId();

        // Create the organisation
        const orgId = await OrganisationQueries.create({
            org_unique_id: orgUniqueId,
            name: name.trim(),
            description: description?.trim() || undefined,
            industry: industry?.trim() || undefined,
            website: website?.trim() || undefined,
            created_by: userId
        });

        // Update the user as Super Admin of this org
        await UserQueries.setOrgId(userId, orgId);
        await UserQueries.setUserType(userId, 'org_super_admin');

        console.log(`🏢 Organisation created: ${name} (${orgUniqueId}) by user ${userId}`);

        res.json({
            success: true,
            message: 'Organisation created successfully',
            organisation: {
                id: orgId,
                org_unique_id: orgUniqueId,
                name: name.trim()
            }
        });
    } catch (err: any) {
        console.error('Error creating organisation:', err);
        res.status(500).json({ success: false, message: 'Failed to create organisation' });
    }
});

// ─── Get Organisation Info ────────────────────────────────────

router.get('/:orgUniqueId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        const memberCount = await OrganisationQueries.getMemberCount(org.id);
        const teams = await OrganisationQueries.getTeams(org.id);

        res.json({
            success: true,
            organisation: {
                ...org,
                member_count: memberCount,
                team_count: teams.length
            }
        });
    } catch (err: any) {
        console.error('Error fetching organisation:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch organisation' });
    }
});

// ─── Get Organisation Members ─────────────────────────────────

router.get('/:orgUniqueId/members', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        // Verify the requester belongs to this org
        const user = await UserQueries.findById(userId);
        if (!user || user.org_id !== org.id) {
            return res.status(403).json({ success: false, message: 'You do not belong to this organisation' });
        }

        const members = await OrganisationQueries.getMembers(org.id);
        const teams = await OrganisationQueries.getTeams(org.id);

        // Build a team lookup map
        const teamMap: Record<number, string> = {};
        for (const t of teams) {
            teamMap[t.id] = t.name;
        }

        res.json({
            success: true,
            members: members.map(m => ({
                id: m.id,
                first_name: m.first_name,
                last_name: m.last_name,
                username: m.username,
                email: m.email,
                user_type: m.user_type,
                unique_user_id: m.unique_user_id,
                biometric_enrolled: m.biometric_enrolled,
                team_id: m.team_id,
                team_name: m.team_id ? teamMap[m.team_id] || null : null
            }))
        });
    } catch (err: any) {
        console.error('Error fetching org members:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch members' });
    }
});

// ─── Get Organisation Teams ───────────────────────────────────

router.get('/:orgUniqueId/teams', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        const user = await UserQueries.findById(userId);
        if (!user || user.org_id !== org.id) {
            return res.status(403).json({ success: false, message: 'You do not belong to this organisation' });
        }

        const teams = await OrganisationQueries.getTeams(org.id);

        // Enrich with member counts
        const enrichedTeams = await Promise.all(teams.map(async (team: any) => ({
            ...team,
            member_count: await TeamQueries.getMemberCount(team.id)
        })));

        res.json({ success: true, teams: enrichedTeams });
    } catch (err: any) {
        console.error('Error fetching org teams:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch teams' });
    }
});

// ─── Create Team Within Organisation ──────────────────────────

router.post('/:orgUniqueId/teams', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { name, description } = req.body;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Team name is required (min 2 characters)' });
        }

        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        // Only super admin or admin can create teams
        const user = await UserQueries.findById(userId);
        if (!user || user.org_id !== org.id || !['org_super_admin', 'org_admin'].includes(user.user_type)) {
            return res.status(403).json({ success: false, message: 'Only admins can create teams' });
        }

        const teamUniqueId = generateTeamId();
        const teamId = await TeamQueries.create({
            team_unique_id: teamUniqueId,
            name: name.trim(),
            description: description?.trim() || undefined,
            org_id: org.id,
            created_by: userId
        });

        console.log(`👥 Team created: ${name} (${teamUniqueId}) in org ${org.org_unique_id}`);

        res.json({
            success: true,
            message: 'Team created successfully',
            team: {
                id: teamId,
                team_unique_id: teamUniqueId,
                name: name.trim()
            }
        });
    } catch (err: any) {
        console.error('Error creating team:', err);
        res.status(500).json({ success: false, message: 'Failed to create team' });
    }
});

// ─── Assign Member To Team ────────────────────────────────────

router.post('/:orgUniqueId/teams/:teamId/members', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { memberId } = req.body;

        if (!memberId) {
            return res.status(400).json({ success: false, message: 'memberId is required' });
        }

        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        // Only admins+ can assign members to teams
        const user = await UserQueries.findById(userId);
        if (!user || user.org_id !== org.id || !['org_super_admin', 'org_admin'].includes(user.user_type)) {
            return res.status(403).json({ success: false, message: 'Only admins can assign members to teams' });
        }

        // Look up the team by INT id or unique id
        const teamIdParam = req.params.teamId as string;
        let team;
        if (/^\d+$/.test(teamIdParam)) {
            team = await TeamQueries.findById(parseInt(teamIdParam, 10));
        } else {
            team = await TeamQueries.findByTeamUniqueId(teamIdParam);
        }
        if (!team || team.org_id !== org.id) {
            return res.status(404).json({ success: false, message: 'Team not found in this organisation' });
        }

        // Verify the target member belongs to this org
        const member = await UserQueries.findById(memberId);
        if (!member || member.org_id !== org.id) {
            return res.status(404).json({ success: false, message: 'Member not found in this organisation' });
        }

        // Assign
        await UserQueries.setTeamId(memberId, team.id);

        console.log(`📌 Member ${memberId} assigned to team ${team.team_unique_id} in org ${org.org_unique_id}`);

        res.json({ success: true, message: `Member assigned to team "${team.name}"` });
    } catch (err: any) {
        console.error('Error assigning member to team:', err);
        res.status(500).json({ success: false, message: 'Failed to assign member to team' });
    }
});

// ─── Remove Member From Team ──────────────────────────────────

router.delete('/:orgUniqueId/teams/:teamId/members/:memberId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const memberId = parseInt(req.params.memberId as string, 10);

        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        const user = await UserQueries.findById(userId);
        if (!user || user.org_id !== org.id || !['org_super_admin', 'org_admin'].includes(user.user_type)) {
            return res.status(403).json({ success: false, message: 'Only admins can remove members from teams' });
        }

        const member = await UserQueries.findById(memberId);
        if (!member || member.org_id !== org.id) {
            return res.status(404).json({ success: false, message: 'Member not found in this organisation' });
        }

        await UserQueries.setTeamId(memberId, 0 as any); // Set to NULL

        res.json({ success: true, message: 'Member removed from team' });
    } catch (err: any) {
        console.error('Error removing member from team:', err);
        res.status(500).json({ success: false, message: 'Failed to remove member from team' });
    }
});

// ─── Grant QR Permission (Cross-Team) ─────────────────────────

router.post('/:orgUniqueId/qr-permissions', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const { memberId, targetMemberId } = req.body;

        if (!memberId || !targetMemberId) {
            return res.status(400).json({ success: false, message: 'memberId and targetMemberId are required' });
        }

        if (memberId === targetMemberId) {
            return res.status(400).json({ success: false, message: 'Cannot grant permission to self' });
        }

        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        // Only super admin can grant cross-team permissions
        const user = await UserQueries.findById(userId);
        if (!user || user.org_id !== org.id || user.user_type !== 'org_super_admin') {
            return res.status(403).json({ success: false, message: 'Only Super Admin can grant QR permissions' });
        }

        // Verify both members belong to this org
        const member = await UserQueries.findById(memberId);
        const target = await UserQueries.findById(targetMemberId);
        if (!member || member.org_id !== org.id) {
            return res.status(404).json({ success: false, message: 'Member not found in this organisation' });
        }
        if (!target || target.org_id !== org.id) {
            return res.status(404).json({ success: false, message: 'Target member not found in this organisation' });
        }

        const permId = await QrPermissionQueries.grant(userId, memberId, targetMemberId, org.id);

        console.log(`🔑 QR permission granted: user ${memberId} → target ${targetMemberId} in org ${org.org_unique_id}`);

        res.json({ success: true, message: 'QR permission granted', permissionId: permId });
    } catch (err: any) {
        if (err.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ success: false, message: 'Permission already exists' });
        }
        console.error('Error granting QR permission:', err);
        res.status(500).json({ success: false, message: 'Failed to grant QR permission' });
    }
});

// ─── Revoke QR Permission ─────────────────────────────────────

router.delete('/:orgUniqueId/qr-permissions/:permissionId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const permissionId = parseInt(req.params.permissionId as string, 10);

        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        const user = await UserQueries.findById(userId);
        if (!user || user.org_id !== org.id || user.user_type !== 'org_super_admin') {
            return res.status(403).json({ success: false, message: 'Only Super Admin can revoke QR permissions' });
        }

        await QrPermissionQueries.revoke(permissionId);

        res.json({ success: true, message: 'QR permission revoked' });
    } catch (err: any) {
        console.error('Error revoking QR permission:', err);
        res.status(500).json({ success: false, message: 'Failed to revoke QR permission' });
    }
});

// ─── Get QR Permissions for Org ───────────────────────────────

router.get('/:orgUniqueId/qr-permissions', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        const user = await UserQueries.findById(userId);
        if (!user || user.org_id !== org.id) {
            return res.status(403).json({ success: false, message: 'You do not belong to this organisation' });
        }

        const permissions = await QrPermissionQueries.getByOrgId(org.id);

        res.json({ success: true, permissions });
    } catch (err: any) {
        console.error('Error fetching QR permissions:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch QR permissions' });
    }
});

// ─── Get QR Targets for a Member ──────────────────────────────
// Returns all members a user can generate QR for (same-team + granted)

router.get('/:orgUniqueId/qr-targets', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        const user = await UserQueries.findById(userId);
        if (!user || user.org_id !== org.id) {
            return res.status(403).json({ success: false, message: 'You do not belong to this organisation' });
        }

        // Super admins can QR everyone in org
        if (user.user_type === 'org_super_admin' || user.user_type === 'org_admin') {
            const allMembers = await OrganisationQueries.getMembers(org.id);
            return res.json({
                success: true,
                targets: allMembers
                    .filter(m => m.id !== userId)
                    .map(m => ({
                        id: m.id,
                        first_name: m.first_name,
                        last_name: m.last_name,
                        username: m.username,
                        unique_user_id: m.unique_user_id,
                        source: 'admin'
                    }))
            });
        }

        const targets: any[] = [];
        const addedIds = new Set<number>();

        // Same-team members
        if (user.team_id) {
            const teamMembers = await TeamQueries.getMembers(user.team_id);
            for (const m of teamMembers) {
                if (m.id !== userId && !addedIds.has(m.id)) {
                    addedIds.add(m.id);
                    targets.push({
                        id: m.id,
                        first_name: m.first_name,
                        last_name: m.last_name,
                        username: m.username,
                        unique_user_id: m.unique_user_id,
                        source: 'same_team'
                    });
                }
            }
        }

        // Granted cross-team targets
        const granted = await QrPermissionQueries.getGrantedTargets(userId);
        for (const g of granted) {
            if (!addedIds.has(g.target_member_id)) {
                addedIds.add(g.target_member_id);
                targets.push({
                    id: g.target_member_id,
                    first_name: g.target_first_name,
                    last_name: g.target_last_name,
                    username: g.target_username,
                    unique_user_id: g.target_unique_user_id,
                    source: 'granted'
                });
            }
        }

        res.json({ success: true, targets });
    } catch (err: any) {
        console.error('Error fetching QR targets:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch QR targets' });
    }
});

// ─── Remove Member From Org ──────────────────────────────────

router.delete('/:orgUniqueId/members/:memberId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).user.userId;
        const memberId = parseInt(req.params.memberId as string, 10);

        const org = await OrganisationQueries.findByOrgUniqueId(req.params.orgUniqueId as string);
        if (!org) return res.status(404).json({ success: false, message: 'Organisation not found' });

        // Only super admin can remove members
        const user = await UserQueries.findById(userId);
        if (!user || user.org_id !== org.id || user.user_type !== 'org_super_admin') {
            return res.status(403).json({ success: false, message: 'Only Super Admin can remove members' });
        }

        // Can't remove yourself
        if (memberId === userId) {
            return res.status(400).json({ success: false, message: 'Cannot remove yourself from the organisation' });
        }

        const member = await UserQueries.findById(memberId);
        if (!member || member.org_id !== org.id) {
            return res.status(404).json({ success: false, message: 'Member not found in this organisation' });
        }

        // Remove org association
        await UserQueries.setOrgId(memberId, 0 as any); // Set to NULL
        await UserQueries.setUserType(memberId, 'individual');

        res.json({ success: true, message: 'Member removed from organisation' });
    } catch (err: any) {
        console.error('Error removing member:', err);
        res.status(500).json({ success: false, message: 'Failed to remove member' });
    }
});

export default router;

