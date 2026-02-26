import express from 'express';
import cors from 'cors';
import ventasRoutes from './src/routes/ventas.routes.js';

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api', ventasRoutes);

app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', mensaje: 'API Vivero Abidan funcionando 🌱' });
});

const PORT = 4000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor corriendo en http://localhost:${PORT}`);
});
