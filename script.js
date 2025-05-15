// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.11.338/pdf.worker.min.js';

// DOM Elements
const fileInput = document.getElementById('fileInput');
const uploadBtn = document.getElementById('uploadBtn');
const dropArea = document.getElementById('dropArea');
const progressContainer = document.getElementById('progressContainer');
const progressBar = document.getElementById('progressBar');
const progressText = document.getElementById('progressText');
const rankBtn = document.getElementById('rankBtn');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const exportBtn = document.getElementById('exportBtn');
const resultsBody = document.getElementById('resultsBody');
const noResults = document.getElementById('noResults');
const previewModal = document.getElementById('previewModal');
const closeBtn = document.querySelector('.close-btn');
const modalBody = document.getElementById('modalBody');

// State
let uploadedResumes = [];
let rankedResults = [];

// Event Listeners
uploadBtn.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileUpload);
dropArea.addEventListener('dragover', handleDragOver);
dropArea.addEventListener('drop', handleDrop);
rankBtn.addEventListener('click', rankResumes);
searchInput.addEventListener('input', filterResults);
sortSelect.addEventListener('change', sortResults);
exportBtn.addEventListener('click', exportResults);
closeBtn.addEventListener('click', () => previewModal.style.display = 'none');
window.addEventListener('click', (e) => {
    if (e.target === previewModal) {
        previewModal.style.display = 'none';
    }
});

// Functions
function handleDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    dropArea.style.borderColor = '#4361ee';
    dropArea.style.backgroundColor = 'rgba(67, 97, 238, 0.05)';
}

function handleDragLeave() {
    dropArea.style.borderColor = '#ccc';
    dropArea.style.backgroundColor = 'transparent';
}

function handleDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    handleDragLeave();
    
    const files = e.dataTransfer.files;
    if (files.length) {
        fileInput.files = files;
        handleFileUpload();
    }
}

async function handleFileUpload() {
    const files = fileInput.files;
    if (!files.length) return;
    
    progressContainer.style.display = 'block';
    progressBar.style.width = '0%';
    progressText.textContent = '0%';
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if (file.type !== 'application/pdf') {
            alert('Please upload only PDF files');
            continue;
        }
        
        try {
            // Simulate upload progress
            for (let percent = 0; percent <= 100; percent += 10) {
                await new Promise(resolve => setTimeout(resolve, 100));
                progressBar.style.width = `${percent}%`;
                progressText.textContent = `${percent}%`;
            }
            
            // Process the PDF file
            const resumeData = await processPDF(file);
            uploadedResumes.push(resumeData);
            
            // Update UI
            updateUploadStatus();
        } catch (error) {
            console.error('Error processing PDF:', error);
            alert('Error processing PDF file');
        }
    }
    
    setTimeout(() => {
        progressContainer.style.display = 'none';
        if (uploadedResumes.length > 0) {
            rankBtn.disabled = false;
        }
    }, 500);
}

async function processPDF(file) {
    return new Promise((resolve, reject) => {
        const fileReader = new FileReader();
        
        fileReader.onload = async function() {
            try {
                const typedArray = new Uint8Array(this.result);
                const pdf = await pdfjsLib.getDocument(typedArray).promise;
                const numPages = pdf.numPages;
                let textContent = '';
                
                // Extract text from all pages
                for (let i = 1; i <= numPages; i++) {
                    const page = await pdf.getPage(i);
                    const text = await page.getTextContent();
                    textContent += text.items.map(item => item.str).join(' ');
                }
                
                // Parse resume data (simplified for demo)
                const resumeData = parseResumeText(textContent, file.name);
                resolve(resumeData);
            } catch (error) {
                reject(error);
            }
        };
        
        fileReader.onerror = reject;
        fileReader.readAsArrayBuffer(file);
    });
}

function parseResumeText(text, fileName) {
    // This is a simplified parser. In a real app, you'd use more sophisticated NLP techniques
    
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

function updateUploadStatus() {
    if (uploadedResumes.length > 0) {
        noResults.style.display = 'none';
    } else {
        noResults.style.display = 'block';
    }
}

function rankResumes() {
    if (uploadedResumes.length === 0) return;
    
    // Calculate scores for each resume
    rankedResults = uploadedResumes.map(resume => {
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
    rankedResults.sort((a, b) => b.score - a.score);
    
    // Display results
    displayResults();
}

function displayResults() {
    resultsBody.innerHTML = '';
    
    if (rankedResults.length === 0) {
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    
    rankedResults.forEach((resume, index) => {
        const row = document.createElement('tr');
        if (index < 3) row.classList.add('top-candidate');
        
        // Determine score class for styling
        let scoreClass = 'score-medium';
        if (resume.score >= 80) scoreClass = 'score-high';
        else if (resume.score < 50) scoreClass = 'score-low';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${resume.name}</td>
            <td class="${scoreClass}">${resume.score}</td>
            <td>${resume.experience} ${resume.experience === 1 ? 'year' : 'years'}</td>
            <td>${resume.education}</td>
            <td>${resume.skills.join(', ')}</td>
            <td><button class="view-btn" data-id="${resume.id}">View</button></td>
        `;
        
        resultsBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => viewResume(btn.dataset.id));
    });
}

function viewResume(resumeId) {
    const resume = rankedResults.find(r => r.id === resumeId);
    if (!resume) return;
    
    modalBody.innerHTML = `
        <h4>${resume.name}</h4>
        <p><strong>Email:</strong> ${resume.email || 'Not specified'}</p>
        <p><strong>Phone:</strong> ${resume.phone || 'Not specified'}</p>
        <p><strong>Score:</strong> ${resume.score}</p>
        <p><strong>Experience:</strong> ${resume.experience} ${resume.experience === 1 ? 'year' : 'years'}</p>
        <p><strong>Education:</strong> ${resume.education}</p>
        <p><strong>Skills:</strong> ${resume.skills.join(', ')}</p>
        <div class="resume-preview">
            <h5>Resume Content:</h5>
            <div class="content-preview">${resume.textContent.substring(0, 1000)}...</div>
        </div>
    `;
    
    previewModal.style.display = 'block';
}

function filterResults() {
    const searchTerm = searchInput.value.toLowerCase();
    
    if (!searchTerm) {
        displayResults();
        return;
    }
    
    const filtered = rankedResults.filter(resume => 
        resume.name.toLowerCase().includes(searchTerm) ||
        resume.skills.some(skill => skill.toLowerCase().includes(searchTerm)) ||
        resume.education.toLowerCase().includes(searchTerm)
    );
    
    resultsBody.innerHTML = '';
    
    if (filtered.length === 0) {
        noResults.style.display = 'block';
        noResults.innerHTML = `
            <i class="fas fa-search"></i>
            <p>No results found for "${searchTerm}"</p>
        `;
        return;
    }
    
    noResults.style.display = 'none';
    
    filtered.forEach((resume, index) => {
        const row = document.createElement('tr');
        
        // Determine score class for styling
        let scoreClass = 'score-medium';
        if (resume.score >= 80) scoreClass = 'score-high';
        else if (resume.score < 50) scoreClass = 'score-low';
        
        row.innerHTML = `
            <td>${index + 1}</td>
            <td>${resume.name}</td>
            <td class="${scoreClass}">${resume.score}</td>
            <td>${resume.experience} ${resume.experience === 1 ? 'year' : 'years'}</td>
            <td>${resume.education}</td>
            <td>${resume.skills.join(', ')}</td>
            <td><button class="view-btn" data-id="${resume.id}">View</button></td>
        `;
        
        resultsBody.appendChild(row);
    });
    
    // Add event listeners to view buttons
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => viewResume(btn.dataset.id));
    });
}

function sortResults() {
    const sortBy = sortSelect.value;
    
    if (sortBy === 'experience') {
        rankedResults.sort((a, b) => b.experience - a.experience);
    } else if (sortBy === 'education') {
        // Simple education ranking
        const educationRank = {
            'PhD': 3,
            'Master': 2,
            'Bachelor': 1,
            'Unknown': 0
        };
        
        rankedResults.sort((a, b) => {
            const aRank = educationRank[a.education.split(' ')[0]] || 0;
            const bRank = educationRank[b.education.split(' ')[0]] || 0;
            return bRank - aRank;
        });
    } else {
        // Default sort by score
        rankedResults.sort((a, b) => b.score - a.score);
    }
    
    displayResults();
}

function exportResults() {
    if (rankedResults.length === 0) {
        alert('No results to export');
        return;
    }
    
    // Convert to CSV
    let csv = 'Rank,Name,Score,Experience,Education,Skills\n';
    
    rankedResults.forEach((resume, index) => {
        csv += `"${index + 1}","${resume.name}","${resume.score}","${resume.experience} years","${resume.education}","${resume.skills.join(', ')}"\n`;
    });
    
    // Create download link
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'resume_rankings.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

// Initialize
updateUploadStatus();