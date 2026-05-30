module.exports = async function pascomMeHandler(req, res) {
  res.json({
    authorized: true,
    user: {
      id: req.pascom.userId,
      name: req.pascom.name,
      role: req.pascom.role,
      email: req.pascom.email,
      phone: req.pascom.phone,
    },
  });
};
