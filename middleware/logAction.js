const ActionLog = require('../models/ActionLog');

const logAction = (module) => {
  return async (req, res, next) => {
    // Store original send function
    const originalSend = res.send;

    // Override send function
    res.send = function(data) {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const action = `${req.method} ${req.originalUrl}`;
        
        ActionLog.create({
          user: req.user?._id,
          action,
          module,
          targetId: req.params.id,
          details: {
            method: req.method,
            url: req.originalUrl,
            body: req.body,
            params: req.params,
            query: req.query
          },
          ipAddress: req.ip,
          userAgent: req.get('user-agent'),
          status: 'success'
        }).catch(err => console.error('Failed to log action:', err));
      }

      // Call original send
      originalSend.call(this, data);
    };

    next();
  };
};

module.exports = logAction;
