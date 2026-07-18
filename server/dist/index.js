"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const dotenv_1 = __importDefault(require("dotenv"));
const inference_1 = __importDefault(require("./api/inference"));
const mnistModel_1 = require("./models/mnistModel");
dotenv_1.default.config();
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json({ limit: '10mb' }));
// API routes
app.use('/api', inference_1.default);
// Debug route to inspect paths on the production server
app.get('/api/debug-files', (req, res) => {
    try {
        const projectRoot = process.cwd().endsWith('server') ? path.join(process.cwd(), '..') : process.cwd();
        const clientDistPath = path.join(projectRoot, 'client', 'dist');
        const rootFiles = fs.existsSync(projectRoot) ? fs.readdirSync(projectRoot) : [];
        const clientFiles = fs.existsSync(path.join(projectRoot, 'client')) ? fs.readdirSync(path.join(projectRoot, 'client')) : [];
        const distFiles = fs.existsSync(clientDistPath) ? fs.readdirSync(clientDistPath) : [];
        res.json({
            cwd: process.cwd(),
            dirname: __dirname,
            projectRoot,
            clientDistPath,
            existsRoot: fs.existsSync(projectRoot),
            existsClient: fs.existsSync(path.join(projectRoot, 'client')),
            existsDist: fs.existsSync(clientDistPath),
            rootFiles,
            clientFiles,
            distFiles
        });
    }
    catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// Serve static assets in production
// Determine project root depending on whether we started inside root or server directory
const projectRoot = process.cwd().endsWith('server') ? path.join(process.cwd(), '..') : process.cwd();
const clientBuildPath = path.join(projectRoot, 'client', 'dist');
app.use(express_1.default.static(clientBuildPath));
app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'), (err) => {
        if (err) {
            console.error(`Error serving index.html from ${path.join(clientBuildPath, 'index.html')}:`, err);
            res.status(200).send('API Server is running. Client build not found.');
        }
    });
});
// ── Start Express FIRST, then train in background ───────────────────────────
// This way port 3001 opens immediately and the frontend can connect right away.
// /api/model-info returns "training" until ready, then "ready".
app.listen(Number(PORT), '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    console.log('Starting model initialisation in background...');
    (0, mnistModel_1.getOrInitializeModel)()
        .then(() => console.log('✅ Model ready — inference available.'))
        .catch((err) => console.error('❌ Model init failed:', err));
});
