const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

const router = express.Router();

router.get('/', authenticate, reportController.list);
router.post('/', authenticate, reportController.create);
router.get('/:reportId', authenticate, reportController.getOne);
router.put('/:reportId', authenticate, reportController.update);
router.delete('/:reportId', authenticate, reportController.remove);
router.patch('/:reportId/status', authenticate, requireAdmin, reportController.updateStatus);
router.get('/:reportId/status-updates', authenticate, reportController.listStatusUpdates);

module.exports = router;
