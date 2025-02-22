require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./src/config/database');
const { loadModel } = require('./src/services/modelService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

const userRoutes = require('./src/routes/userRoute');
app.use('/api/users', userRoutes);

const spiceRoutes = require('./src/routes/spiceRoute');
app.use('/api/spices', spiceRoutes);

const recipeRoutes = require('./src/routes/recipeRoute');
app.use('/api/recipes', recipeRoutes);

const articleRoutes = require('./src/routes/articleRoute');
app.use('/api/articles', articleRoutes);

(async () => {
  try {
    await db.getConnection();
    console.log('Database connected successfully.');

    await loadModel();
    console.log('Model loaded successfully.');

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Initialize Error:', err.message);
    process.exit(1);
  }
})();