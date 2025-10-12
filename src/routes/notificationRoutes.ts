import { Router } from 'express';
import { listNotifications, markAsRead, markAllRead } from '../controllers/notificationController';
import { auth } from '../middleware/auth';

const router = Router();

router.get('/', auth, listNotifications);
router.put('/:id/read', auth, markAsRead);
router.put('/read-all', auth, markAllRead);

// create notification (responder -> resident)
router.post('/', auth, async (req: any, res: any) => {
	const { createNotification } = require('../controllers/notificationController');
	return createNotification(req, res);
});

// Send a test push to the current user or all users
router.post('/test-push', auth, async (req: any, res: any) => {
	try {
		const { message = 'Test notification', title = 'Test Push', all = false } = req.body;
		const pushStore = require('../utils/pushStore');
		const push = require('../utils/push');
		if (all) {
			const tokens = pushStore.listTokens().map((t: any) => t.token);
			await push.sendPushToTokens(tokens, title, message, { test: true });
			return res.json({ status: 'sent', count: tokens.length });
		}
		const userId = req.user?.id;
		if (!userId) return res.status(401).json({ error: 'Unauthorized' });
		const tokens = pushStore.listTokens().filter((t: any) => t.userId === userId).map((t: any) => t.token);
		if (tokens.length === 0) return res.status(404).json({ error: 'No push tokens registered for user' });
		await push.sendPushToTokens(tokens, title, message, { test: true });
		return res.json({ status: 'sent', count: tokens.length });
	} catch (err) {
		console.error('Test push error', err);
		return res.status(500).json({ error: 'Failed to send test push' });
	}
});

// Debug: list all registered push tokens (admin-only)
router.get('/push-tokens', auth, async (_req: any, res: any) => {
	try{
		const pushStore = require('../utils/pushStore');
		const list = pushStore.listTokens();
		return res.json({ count: list.length, tokens: list });
	}catch(e){ console.error('list push tokens failed', e); return res.status(500).json({ error: 'failed' }); }
});

// Debug: send push to a specific token (body: token, title, message)
router.post('/debug-send', auth, async (req: any, res: any) => {
	try{
		const { token, title = 'Debug Push', message = 'Debug message' } = req.body;
		if(!token) return res.status(400).json({ error: 'Missing token' });
		const push = require('../utils/push');
		const tickets = await push.sendPushToTokens([token], title, message, { debug: true });
		return res.json({ status: 'sent', tickets });
	}catch(e){ console.error('debug send failed', e); return res.status(500).json({ error: 'failed' }); }
});

export default router;

// Development-only helper endpoints (only enabled outside production)
if (process.env.NODE_ENV !== 'production') {
	// Register a token without auth (body: userId, token)
	router.post('/dev/register-token', async (req: any, res: any) => {
		try {
			const pushStore = require('../utils/pushStore');
			const { userId = 'dev-user', token } = req.body || {};
			if (!token) return res.status(400).json({ error: 'Missing token' });
			pushStore.saveToken(userId, token);
			return res.json({ status: 'ok', userId, token });
		} catch (e) { console.error('dev register token failed', e); return res.status(500).json({ error: 'failed' }); }
	});

	// Send a push to a token without auth (body: token, title, message)
	router.post('/dev/send', async (req: any, res: any) => {
		try {
			const { token, title = 'Dev Push', message = 'Dev message' } = req.body || {};
			if (!token) return res.status(400).json({ error: 'Missing token' });
			const push = require('../utils/push');
			const tickets = await push.sendPushToTokens([token], title, message, { dev: true });
			return res.json({ status: 'sent', tickets });
		} catch (e) { console.error('dev send failed', e); return res.status(500).json({ error: 'failed' }); }
	});
}
