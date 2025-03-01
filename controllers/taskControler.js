const { google } = require('googleapis');
const { OAuth2Client } = require('google-auth-library');
const Task = require('../models/taskModel');
const User = require('../models/userModel');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/appError');

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};
const getCalendarClient = (accessToken) => {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  return google.calendar({ version: 'v3', auth });
};

exports.getAllTask = catchAsync(async (req, res, next) => {
  const tasks = await Task.find();
  res.status(200).json({
    status: 'success',
    results: tasks.length,
    tasks,
  });
});

exports.updateTask = catchAsync(async (req, res, next) => {
  const filteredBody = filterObj(
    req.body,
    'title',
    'description',
    'dueDate',
    'status',
    'priority'
  );

  const user = await User.findById(req.user._id);
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(new AppError('Not found any task with that ID', 404));
  }

  const dueDate = new Date(filteredBody.dueDate || task.dueDate);
  if (isNaN(dueDate)) {
    return next(new AppError('Invalid due date format', 400));
  }

  if (user.accessToken && task.googleEventId) {
    try {
      const calendar = getCalendarClient(user.accessToken);

      const updatedEvent = {
        summary: filteredBody.title || task.title,
        description: filteredBody.description || task.description,
        start: {
          dateTime: new Date().toISOString(),
          timeZone: 'UTC',
        },
        end: {
          dateTime: dueDate.toISOString(),
          timeZone: 'UTC',
        },
      };

      const updateCalendar = await calendar.events.update({
        calendarId: 'primary',
        eventId: task.googleEventId,
        resource: updatedEvent,
      });
    } catch (error) {
      console.error(
        'Google Calendar Update Error:',
        error.response?.data || error.message
      );
      return next(new AppError('Failed to update Google Calendar event', 500));
    }
  }

  const updatedTask = await Task.findByIdAndUpdate(
    req.params.taskId,
    filteredBody,
    { new: true, runValidators: true }
  );

  res.status(200).json({
    message: 'Task updated successfully',
    task: updatedTask,
    status: 'success',
  });
});

exports.getTaskById = catchAsync(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) {
    return next(new AppError('No task found with that ID', 404));
  }
  res.status(201).json({
    status: 'success',
    task,
  });
});

exports.createTask = catchAsync(async (req, res) => {
  const { title, description, dueDate, status, priority } = req.body;
  const task = await Task.create({
    user: req.user._id,
    title,
    description,
    dueDate,
    status,
    priority,
  });

  if (!task) {
    return next(new AppError('there is an error adding task', 404));
  }

  const user = await User.findById(req.user._id);

  if (user.accessToken) {
    const calendar = getCalendarClient(user.accessToken);

    const event = {
      summary: title,
      description: description,
      start: { dateTime: new Date().toISOString(), timeZone: 'UTC' },
      end: { dateTime: new Date(dueDate).toISOString(), timeZone: 'UTC' },
    };

    const googleEvent = await calendar.events.insert({
      calendarId: 'primary',
      resource: event,
    });

    task.googleEventId = googleEvent.data.id;
    await task.save();
  }

  res.status(201).json({
    status: 'success',
    task,
  });
});

exports.deleteTask = catchAsync(async (req, res) => {
  const task = await Task.findById(req.params.taskId);
  if (!task) {
    return next(new AppError('Task not found', 404));
  }

  const user = await User.findById(req.user._id);

  if (user.accessToken && task.googleEventId) {
    const calendar = getCalendarClient(user.accessToken);
    await calendar.events.delete({
      calendarId: 'primary',
      eventId: task.googleEventId,
    });
  }

  await Task.findByIdAndDelete(req.params.taskId);
  res.status(200).json({ message: 'Task deleted', status: 'success' });
});
