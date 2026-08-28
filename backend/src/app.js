const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const env = require('./config/env');
const db = require('./config/supabase');
const { isGeminiConfigured } = require('./config/gemini');
const { isGroqConfigured } = require('./config/groq');
const { errorHandler } = require('./middleware/errorMiddleware');
const { successResponse } = require('./utils/responseFormatter');

// Import Route Handlers
const authRoutes = require('./routes/authRoutes');
const goalRoutes = require('./routes/goalRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const taskRoutes = require('./routes/taskRoutes');
const memoryRoutes = require('./routes/memoryRoutes');
const documentRoutes = require('./routes/documentRoutes');
const businessRoutes = require('./routes/businessRoutes');
const activityRoutes = require('./routes/activityRoutes');
const toolRoutes = require('./routes/toolRoutes');
const artifactRoutes = require('./routes/artifactRoutes');
const chatRoutes = require('./routes/chatRoutes');

const app = express();

// Security Middlewares
app.use(helmet({
  crossOriginResourcePolicy: false
}));

// Production CORS Configuration (Supports Netlify, custom frontend domain, and local dev)
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    
    // In development or test, allow all origins
    if (env.NODE_ENV !== 'production') {
      return callback(null, true);
    }

    // In production, allow configured FRONTEND_URL, Netlify subdomains, and Vercel subdomains
    if (
      (env.FRONTEND_URL && origin === env.FRONTEND_URL) ||
      origin.endsWith('.netlify.app') ||
      origin.endsWith('.vercel.app') ||
      origin === 'http://localhost:5173' ||
      origin === 'http://localhost:3000'
    ) {
      return callback(null, true);
    }

    // Default to permissive for flexible hosting
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Root Route & Health Check & Service Diagnostics Endpoint (Safe without secret exposure)
app.get('/', (req, res) => {
  return successResponse(res, {
    service: 'LifeOps AI API',
    status: 'ONLINE',
    version: '1.0.0',
    documentation: '/api/health'
  });
});

app.get('/api/health', (req, res) => {
  return successResponse(res, {
    status: 'HEALTHY',
    service: 'LifeOps AI Backend',
    timestamp: new Date().toISOString(),
    environment: env.NODE_ENV || 'production',
    diagnostics: {
      backend: 'ONLINE',
      database: db.isRemote ? 'SUPABASE_CONNECTED' : 'LOCAL_STORAGE_ACTIVE',
      aiProvider: isGroqConfigured ? 'GROQ_CONFIGURED' : (isGeminiConfigured ? 'GEMINI_CONFIGURED' : 'LOCAL_FALLBACK_ACTIVE'),
      groq: isGroqConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED',
      gemini: isGeminiConfigured ? 'CONFIGURED' : 'NOT_CONFIGURED'
    }
  });
});

// API Routes Mounting
app.use('/api/auth', authRoutes);
app.use('/api/goals', goalRoutes);
app.use('/api/workflows', workflowRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/memories', memoryRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/tools', toolRoutes);
app.use('/api/artifacts', artifactRoutes);
app.use('/api/chat', chatRoutes);

// 404 Route Handler
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Route ${req.method} ${req.originalUrl} does not exist.`
    }
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

module.exports = app;
