import express from 'express';
import CommitmentPodService from '../services/commitmentPodService.js';
import { auth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.post('/create', auth, async (req, res) => {
  try {
    const {podName, customType, TimePeriod, witnesses, rules } = req?.body;

    if (!podName || !customType || !TimePeriod || !rules) {
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }
    if (!Array.isArray(witnesses) || witnesses.length < 2 || witnesses.length > 6) {
      return res.status(400).json({ success: false, error: 'Pod must have 2-6 witnesses' });
    }

    const pod = await CommitmentPodService.createPod(req?.user?.id, {podName, customType, TimePeriod, witnesses, rules });
    res.status(201).json({ success: true, pod });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/witness', auth, async (req, res) => {
  try {
    const pods = await CommitmentPodService.getWitnessPods(req.user.id);
    res.json({ success: true, pods });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/myPods', auth, async (req, res) => {
  try {
    const pods = await CommitmentPodService.getAdminPods(req?.user?.id);
    res.json({ success: true, pods });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/notifications', auth, async (req, res) => {
  try {
    const notifications = await CommitmentPodService.getNotifications(req.user.id);
    res.json({ success: true, notifications });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.patch('/notifications/read', auth, async (req, res) => {
  try {
    await CommitmentPodService.markNotificationsRead(req.user.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    await CommitmentPodService.deletePod(req?.user?.id, req?.params?.id);
    res.json({ success: true });
  } catch (err) {
    const status = err.message.includes('Only the admin') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.delete('/:id/witnesses/:witnessId', auth, async (req, res) => {
  try {
    const pod = await CommitmentPodService.removeWitness(req.user.id, req.params.id, req.params.witnessId);
    res.json({ success: true, pod });
  } catch (err) {
    const status = err.message.includes('Only the admin') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.get('/:id/streaks', auth, async (req, res) => {
  try {
    const streaks = await CommitmentPodService.getPodStreaks(req.params.id, req.user.id);
    res.json({ success: true, streaks });
  } catch (err) {
    const status = err.message.includes('Not authorized') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

router.get('/:id', auth, async (req, res) => {
  try {
    const pod = await CommitmentPodService.getPodById(req.params.id, req.user.id);
    res.json({ success: true, pod });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/join', auth, async (req, res) => {
  try {
    const pod = await CommitmentPodService.joinPod(req.user.id, req.params.id);
    res.json({ success: true, pod });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/decline', auth, async (req, res) => {
  try {
    await CommitmentPodService.declinePod(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/leave', auth, async (req, res) => {
  try {
    await CommitmentPodService.leavePod(req.user.id, req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/:id/cards', auth, async (req, res) => {
  try {
    const { activityName, satisfactionLevel, customMessage } = req.body;
    if (!activityName || !satisfactionLevel) {
      return res.status(400).json({ success: false, error: 'activityName and satisfactionLevel are required' });
    }
    const result = await CommitmentPodService.shareCard(req.user.id, req.params.id, {
      activityName, satisfactionLevel, customMessage,
    });
    res.status(201).json({ success: true, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:id/cards', auth, async (req, res) => {
  try {
    const { page, limit } = req.query;
    const cards = await CommitmentPodService.getPodCards(req.params.id, req.user.id, {
      page:  parseInt(page)  || 1,
      limit: parseInt(limit) || 20,
    });
    res.json({ success: true, cards });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/:id/stats', auth, async (req, res) => {
  try {
    const stats = await CommitmentPodService.getPodCardStats(req.params.id, req.user.id);
    res.json({ success: true, stats });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;