const mongoose = require('mongoose');
const taskSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  title: {
    type: String,
    required: [true, 'A task must have a title'],
  },
  description: {
    type: String,
    required: [true, 'A task must have a description'],
  },
  dueDate: {
    type: Date,
  },
  status: {
    type: String,
    enum: ['pending', 'completed'],
    default: 'pending',
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high'],
    default: 'low',
  },
  googleEventId: String,
});

const Task = mongoose.model('Task', taskSchema);
module.exports = Task;
