const express = require('express');
const taskController = require('../controllers/taskControler');
const authController = require('../controllers/authController');

const router = express.Router();

router.get('/tasks', authController.protect, taskController.getAllTask);
router.get('/task/:taskId', authController.protect, taskController.getTaskById);
router.post('/task', authController.protect, taskController.createTask);
router.patch(
  '/task/:taskId',
  authController.protect,
  taskController.updateTask
);
router.delete(
  '/task/:taskId',
  authController.protect,
  taskController.deleteTask
);

module.exports = router;
