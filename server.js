const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pdf = require('pdf-parse');
const cors = require('cors');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
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
        cb(null, Date.now() + path.extname(file.originalname));
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

// In-memory "database" for demo purposes
let resumes = [];

// Routes
app.post('/api/upload', upload.array('resumes'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No files uploaded' });
        }

        const processedResumes = [];
        
        for (const file of req.files) {
            try {
                const dataBuffer = fs.readFileSync(file.path);
                const data = await pdf(dataBuffer);
                
                // Parse resume data (simplified)
                const resumeData = parseResumeText(data.text, file.originalname);
                resumeData.filePath = file.path;
                
                processedResumes.push(resumeData);
                resumes.push(resumeData);
            } catch (error) {
                console.error(`Error processing file ${file.originalname}:`, error);
                // Continue with next file even if one fails
            }
        }

        res.json({
            message: `${processedResumes.length} resume(s) processed successfully`,
            resumes: processedResumes
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'Error processing resumes' });
    }
});

app.post('/api/rank', (req, res) => {
    try {
        if (resumes.length === 0) {
            return res.status(400).json({ error: 'No resumes to rank' });
        }

        // Calculate scores for each resume
        const rankedResumes = resumes.map(resume => {
            let score = 0;
            
            // Score based on experience (max 40 points)
            score += Math.min(resume.experience * 4, 40);
            
            // Score based on education (max 30 points)
            if (resume.education.match(/PhD|Doctorate/i)) score += 30;
            else if (resume.education.match(/Master|M\.?S\.?|M\.?A\.?/i)) score += 20;
            else if (resume.education.match(/Bachelor|B\.?S\.?|B\.?A\.?/i)) score += 10;
            
            // Score based on skills (max 30 points - 3 points per skill)
            score += Math.min(resume.skills.length * 3, 30);
            
            return {
                ...resume,
                score
            };
        });
        
        // Sort by score descending
        rankedResumes.sort((a, b) => b.score - a.score);
        
        res.json({
            message: `${rankedResumes.length} resume(s) ranked`,
            rankedResumes
        });
    } catch (error) {
        console.error('Ranking error:', error);
        res.status(500).json({ error: 'Error ranking resumes' });
    }
});

app.get('/api/resumes', (req, res) => {
    res.json({
        count: resumes.length,
        resumes
    });
});

app.get('/api/resume/:id', (req, res) => {
    const resume = resumes.find(r => r.id === req.params.id);
    if (!resume) {
        return res.status(404).json({ error: 'Resume not found' });
    }
    res.json(resume);
});

app.delete('/api/resume/:id', (req, res) => {
    const index = resumes.findIndex(r => r.id === req.params.id);
    if (index === -1) {
        return res.status(404).json({ error: 'Resume not found' });
    }
    
    // Remove file from filesystem
    try {
        if (fs.existsSync(resumes[index].filePath)) {
            fs.unlinkSync(resumes[index].filePath);
        }
    } catch (err) {
        console.error('Error deleting file:', err);
    }
    
    // Remove from array
    const deleted = resumes.splice(index, 1);
    
    res.json({
        message: 'Resume deleted',
        resume: deleted[0]
    });
});

// Helper function to parse resume text
function parseResumeText(text, fileName) {
    // Extract name (first line is often the name)
    const nameMatch = text.match(/^([A-Z][a-z]+ [A-Z][a-z]+)/) || 
                     text.match(/([A-Z][a-z]+ [A-Z][a-z]+)/) || 
                     [fileName.replace('.pdf', '').replace(/_/g, ' ')];
    const name = nameMatch[0].trim();
    
    // Extract email
    const emailMatch = text.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/i);
    const email = emailMatch ? emailMatch[0] : '';
    
    // Extract phone
    const phoneMatch = text.match(/(\+\d{1,2}\s?)?(\(\d{3}\)|\d{3})[\s.-]?\d{3}[\s.-]?\d{4}/);
    const phone = phoneMatch ? phoneMatch[0] : '';
    
    // Extract skills (simplified)
    const commonSkills = ['JavaScript', 'Python', 'Java', 'C++', 'HTML', 'CSS', 'React', 
                         'Node.js', 'SQL', 'Git', 'AWS', 'Docker', 'Machine Learning', 
                         'Data Analysis', 'Project Management', 'Agile', 'Leadership'];
    const skills = commonSkills.filter(skill => 
        text.toLowerCase().includes(skill.toLowerCase()));
    
    // Extract experience (simplified - count years mentioned)
    const expMatch = text.match(/(\d+)\+?\s*(years?|yrs?)/i) || 
                    text.match(/experience:\s*(\d+)/i);
    const experience = expMatch ? parseInt(expMatch[1]) : Math.floor(Math.random() * 10) + 1;
    
    // Extract education (simplified)
    const educationMatch = text.match(/(Bachelor|Master|PhD|B\.?S\.?|M\.?S\.?|B\.?A\.?|M\.?A\.?)/);
    const education = educationMatch ? educationMatch[0] : 'Unknown';
    
    return {
        id: Date.now() + Math.random().toString(36).substr(2, 9),
        name,
        email,
        phone,
        skills,
        experience,
        education,
        fileName,
        textContent: text,
        score: 0 // Will be calculated during ranking
    };
}

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});