/**
 * Community Routes — BioSeal Architecture
 * 
 * Handles standalone community CRUD and member management
 */

import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { UserQueries, CommunityQueries } from '../helpers/queries.js';
import { generateCommunityId } from '../helpers/uniqueId.js';

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

// ─── Create Standalone Community ─────────────────────────────

router.post('/create', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const { name, description } = req.body;

        if (!name || name.trim().length < 2) {
            return res.status(400).json({ success: false, message: 'Community name is required (min 2 characters)' });
        }

        const user = await UserQueries.findById(userId);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        if (user.community_id) {
            return res.status(400).json({ success: false, message: 'You already belong to a community' });
        }

        const communityUniqueId = generateCommunityId();
        const communityId = await CommunityQueries.create({
            community_unique_id: communityUniqueId,
            name: name.trim(),
            description: description?.trim() || undefined,
            created_by: userId
        });

        // Update user as Community Lead
        await UserQueries.setCommunityId(userId, communityId);
        await UserQueries.setUserType(userId, 'community_lead');

        console.log(`💚 Community created: ${name} (${communityUniqueId}) by user ${userId}`);

        res.json({
            success: true,
            message: 'Community created successfully',
            community: {
                id: communityId,
                community_unique_id: communityUniqueId,
                name: name.trim()
            }
        });
    } catch (err: any) {
        console.error('Error creating community:', err);
        res.status(500).json({ success: false, message: 'Failed to create community' });
    }
});

// ─── Get Community Info ───────────────────────────────────────

router.get('/:communityUniqueId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const community = await CommunityQueries.findByCommunityUniqueId(req.params.communityUniqueId as string);
        if (!community) return res.status(404).json({ success: false, message: 'Community not found' });

        const memberCount = await CommunityQueries.getMemberCount(community.id);

        res.json({
            success: true,
            community: {
                ...community,
                member_count: memberCount
            }
        });
    } catch (err: any) {
        console.error('Error fetching community:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch community' });
    }
});

// ─── Get Community Members ────────────────────────────────────

router.get('/:communityUniqueId/members', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const community = await CommunityQueries.findByCommunityUniqueId(req.params.communityUniqueId as string);
        if (!community) return res.status(404).json({ success: false, message: 'Community not found' });

        const user = await UserQueries.findById(userId);
        // Security: user should belong to the community OR be an org super admin
        if (!user || (user.community_id !== community.id && user.user_type !== 'org_super_admin')) {
            return res.status(403).json({ success: false, message: 'You do not belong to this community' });
        }

        const members = await CommunityQueries.getMembers(community.id);

        res.json({
            success: true,
            community: {
                id: community.id,
                community_unique_id: community.community_unique_id,
                name: community.name
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
        console.error('Error fetching community members:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch members' });
    }
});

// ─── Get QR Targets for Community ──────────────────────────────
// Returns all other members of the community as potential QR targets
router.get('/:communityUniqueId/qr-targets', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const community = await CommunityQueries.findByCommunityUniqueId(req.params.communityUniqueId as string);
        if (!community) return res.status(404).json({ success: false, message: 'Community not found' });

        const user = await UserQueries.findById(userId);
        if (!user || user.community_id !== community.id) {
            return res.status(403).json({ success: false, message: 'You do not belong to this community' });
        }

        const members = await CommunityQueries.getMembers(community.id);

        res.json({
            success: true,
            targets: members
                .filter(m => m.id !== userId)
                .map(m => ({
                    id: m.id,
                    name: `${m.first_name} ${m.last_name}`.trim() || m.username,
                    unique_id: m.unique_user_id
                }))
        });
    } catch (err: any) {
        console.error('Error fetching community QR targets:', err);
        res.status(500).json({ success: false, message: 'Failed to fetch targets' });
    }
});

// ─── Remove Member From Community ────────────────────────────

router.delete('/:communityUniqueId/members/:memberId', authenticateToken, async (req: Request, res: Response) => {
    try {
        const userId = (req as any).userId;
        const memberId = parseInt(req.params.memberId as string, 10);

        const community = await CommunityQueries.findByCommunityUniqueId(req.params.communityUniqueId as string);
        if (!community) return res.status(404).json({ success: false, message: 'Community not found' });

        // Only community lead can remove members
        const user = await UserQueries.findById(userId);
        if (!user || user.community_id !== community.id || user.user_type !== 'community_lead') {
            return res.status(403).json({ success: false, message: 'Only Community Lead can remove members' });
        }

        if (memberId === userId) {
            return res.status(400).json({ success: false, message: 'Cannot remove yourself from the community' });
        }

        const member = await UserQueries.findById(memberId);
        if (!member || member.community_id !== community.id) {
            return res.status(404).json({ success: false, message: 'Member not found in this community' });
        }

        // Remove association
        await UserQueries.setCommunityId(memberId, null);
        await UserQueries.setUserType(memberId, 'individual');

        res.json({ success: true, message: 'Member removed from community' });
    } catch (err: any) {
        console.error('Error removing member:', err);
        res.status(500).json({ success: false, message: 'Failed to remove member' });
    }
});

export default router;
