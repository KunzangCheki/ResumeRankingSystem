const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid'); // Add uuid for unique IDs

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure storage for uploaded files
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'uploads/';
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir);
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Use timestamp + uuid for filename uniqueness
        cb(null, Date.now() + '-' + uuidv4() + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed'));
        }
    }
});

// In-memory "database"
let resumes = [];

// Upload endpoint
app.post('/api/upload', upload.array('resumes'), (req, res) => {
    if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
    }
    
    const newFiles = req.files.map(file => {
        const resume = {
            id: uuidv4(),
            fileName: file.filename,
            originalName: file.originalname,
            path: file.path,
            uploadTime: new Date()
        };
        resumes.push(resume);
        return resume;
    });

    res.json({ message: `${newFiles.length} file(s) uploaded successfully`, files: newFiles });
});

// Error handler middleware for multer errors
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError || err.message === 'Only PDF files are allowed') {
        return res.status(400).json({ error: err.message });
    }
    next(err);
});

app.listen(PORT, () => {
    console.log(`Node.js server running on port ${PORT}`);
});
