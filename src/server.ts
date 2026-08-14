import app from './app';
import logger from './utils/logger';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`VaultGuard Enterprise Server running on http://localhost:${PORT}`);
  logger.info(`OpenAPI Documentation available at http://localhost:${PORT}/api/v1/docs`);
});
