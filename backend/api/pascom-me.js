const { permissoesDoPapel } = require('../lib/permissions');

// `permissoes` só serve para o front montar o menu; cada rota do painel confere de novo no servidor.
module.exports = async function pascomMeHandler(req, res) {
  res.json({
    authorized: true,
    user: {
      id: req.pascom.userId,
      name: req.pascom.name,
      role: req.pascom.role,
      email: req.pascom.email,
      phone: req.pascom.phone,
      permissoes: permissoesDoPapel(req.pascom.role),
    },
  });
};
