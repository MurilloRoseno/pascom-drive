const { dashboardPascom } = require('../lib/google-sheets');

module.exports = async function pascomDashboardHandler(_req, res, next) {
  try {
    res.json({ dashboard: await dashboardPascom() });
  } catch (error) {
    next(error);
  }
};
