/**
 * Team Routes — BioSeal Architecture
 * 
 * Handles organization-specific team CRUD and member management
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserQueries, TeamQueries, OrganisationQueries } from '../helpers/queries.js';
import { generateTeamId } from '../helpers/uniqueId.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'bioqr-secret';

// ─── Middleware ────────────────────────────────────────────────

function authenticateToken(req: Request, res: Response, next: Function) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ success: false, message: 'Access token required' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        (req as any).userId = decoded.userId || decoded.id;
        next();
    } catch {
        return res.status(403).json({ success: false, message: 'Invalid token' });
    }
}

// ─── Create Org Team ──────────────────────────────────────────

router.post('/create', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { name, description, orgId } = req.body;

        if (!name || !orgId) {
            return res.status(400).json({ success: false, message: 'Team name and Organization ID are required' });
        }

        const user = await UserQueries.findById(userId);
        if (!user || (user.org_id !== orgId && user.user_type !== 'org_super_admin')) {
            return res.status(403).json({ success: false, message: 'Unauthorized to create teams in this organization' });
        }

        const teamUniqueId = generateTeamId();
        const teamId = await TeamQueries.create({
            team_unique_id: teamUniqueId,
            name: name.trim(),
            description: description?.trim() || undefined,
            org_id: orgId,
            created_by: userId
        });

        console.log(`🔷 Team created: ${name} (${teamUniqueId}) in Org ${orgId}`);

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

// ─── Get Team Info ────────────────────────────────────────────

router.get('/:teamUniqueId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const team = await TeamQueries.findByTeamUniqueId(req.params.teamUniqueId as string);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        const memberCount = await TeamQueries.getMemberCount(team.id);

        res.json({
            success: true,
            team: {
                ...team,
                member_count: memberCount
            }
        });
    } catch (err: any) {
        console.error('Error fetching team:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch team' });
    }
});

// ─── Get Team Members ─────────────────────────────────────────

router.get('/:teamUniqueId/members', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const team = await TeamQueries.findByTeamUniqueId(req.params.teamUniqueId as string);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        const user = await UserQueries.findById(userId);
        if (!user || (user.org_id !== team.org_id && user.user_type !== 'org_super_admin')) {
            return res.status(403).json({ success: false, message: 'Unauthorized access to team members' });
        }

        const members = await TeamQueries.getMembers(team.id);

        res.json({
            success: true,
            team: {
                id: team.id,
                team_unique_id: team.team_unique_id,
                name: team.name
            },
            members: members.map(m => ({
                id: m.id,
                first_name: m.first_name,
                last_name: m.last_name,
                username: m.username,
                email: m.email,
                user_type: m.user_type,
                unique_user_id: m.unique_user_id,
                biometric_enrolled: m.biometric_enrolled
            }))
        });
    } catch (err: any) {
        console.error('Error fetching team members:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch members' });
    }
});

// ─── Assign Member to Team ────────────────────────────────────

router.post('/:teamUniqueId/assign', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { userId: targetUserId } = req.body;
        const team = await TeamQueries.findByTeamUniqueId(req.params.teamUniqueId as string);
        
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        // Logic check: perform by Admin or Super Admin
        await UserQueries.setTeamId(targetUserId, team.id);

        res.json({ success: true, message: 'User assigned to team' });
    } catch (err: any) {
        console.error('Error assigning member:', err);
        res.status(500).json({ success: false, message: 'Failed to assign member' });
    }
});

export default router;
