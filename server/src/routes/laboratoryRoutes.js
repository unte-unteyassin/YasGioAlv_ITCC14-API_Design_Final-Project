const express = require('express');
const { authenticate, requireAdmin } = require('../middleware/auth');
const laboratoryController = require('../controllers/laboratoryController');

const router = express.Router();

router.get('/', authenticate, laboratoryController.list);
router.post('/', authenticate, requireAdmin, laboratoryController.create);
router.get('/:laboratoryCode', authenticate, laboratoryController.getOne);
router.put('/:laboratoryCode', authenticate, requireAdmin, laboratoryController.update);
router.delete('/:laboratoryCode', authenticate, requireAdmin, laboratoryController.remove);

module.exports = router;
