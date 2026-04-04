/**
 * Team Routes — BioSeal Architecture
 * 
 * Handles standalone team CRUD and member management
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserQueries, TeamQueries } from '../helpers/queries.js';
import { generateTeamId, generateCommunityId } from '../helpers/uniqueId.js';

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

// ─── Create Standalone Team ───────────────────────────────────

router.post('/create', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { name, description } = req.body;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Team name is required (min 2 characters)' });
        }

        const user = await UserQueries.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.team_id) {
            return res.status(400).json({ success: false, message: 'You already belong to a team' });
        }

        const teamUniqueId = generateCommunityId();
        const teamId = await TeamQueries.create({
            team_unique_id: teamUniqueId,
            name: name.trim(),
            description: description?.trim() || undefined,
            org_id: null,
            created_by: userId
        });

        // Update user as Community Lead
        await UserQueries.setTeamId(userId, teamId);
        await UserQueries.setUserType(userId, 'community_lead');

        console.log(`💚 Community created: ${name} (${teamUniqueId}) by user ${userId}`);

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
        if (!user || user.team_id !== team.id) {
            return res.status(403).json({ success: false, message: 'You do not belong to this team' });
        }

        const members = await TeamQueries.getMembers(team.id);

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
                biometric_enrolled: m.biometric_enrolled
            }))
        });
    } catch (err: any) {
        console.error('Error fetching team members:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch members' });
    }
});

// ─── Remove Member From Team ──────────────────────────────────

router.delete('/:teamUniqueId/members/:memberId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const memberId = parseInt(req.params.memberId as string, 10);

        const team = await TeamQueries.findByTeamUniqueId(req.params.teamUniqueId as string);
        if (!team) return res.status(404).json({ success: false, message: 'Team not found' });

        // Only team lead can remove members
        const user = await UserQueries.findById(userId);
        if (!user || user.team_id !== team.id || !['team_lead', 'community_lead'].includes(user.user_type)) {
            return res.status(403).json({ success: false, message: 'Only Team Lead can remove members' });
        }

        if (memberId === userId) {
            return res.status(400).json({ success: false, message: 'Cannot remove yourself from the team' });
        }

        const member = await UserQueries.findById(memberId);
        if (!member || member.team_id !== team.id) {
            return res.status(404).json({ success: false, message: 'Member not found in this team' });
        }

        // Remove team association
        await UserQueries.setTeamId(memberId, 0 as any);
        await UserQueries.setUserType(memberId, 'individual');

        res.json({ success: true, message: 'Member removed from team' });
    } catch (err: any) {
        console.error('Error removing member:', err);
        res.status(500).json({ success: false, message: 'Failed to remove member' });
    }
});

export default router;
