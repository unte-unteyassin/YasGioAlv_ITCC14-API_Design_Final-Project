const app = require('./app');

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`XU EcoLab API listening on http://localhost:${PORT}/api`);
});
