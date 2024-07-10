const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const Papa = require('papaparse');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Serve map.html and index.html from root path
app.get('/map.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'map.html'));
});

app.get('/index.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Setup storage for image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Helper function to read CSV files from the current directory
const readCSV = (fileName) => {
    const filePath = path.join(__dirname, fileName);
    console.log(`Attempting to read file from: ${filePath}`);
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parsedData = Papa.parse(fileContent, { header: true });
    return parsedData.data;
};

// Helper function to write CSV files to the current directory
const writeCSV = (fileName, data) => {
    const filePath = path.join(__dirname, fileName);
    const csv = Papa.unparse(data);
    fs.writeFileSync(filePath, csv, 'utf8');
};

// Endpoint to get all data
app.get('/data', (req, res) => {
    try {
        const projectReconData = readCSV('ProjectRecon.csv');
        const imagesData = readCSV('images.csv');
        const scoreData = readCSV('score.csv');

        res.json({ projectReconData, imagesData, scoreData });
    } catch (error) {
        console.error('Error reading data:', error);
        res.status(500).json({ error: error.toString() });
    }
});

// Endpoint to add a new property
app.post('/addProperty', upload.single('image'), (req, res) => {
    try {
        const newProperty = req.body;
        const image = req.file;

        const projectReconData = readCSV('ProjectRecon.csv');
        const imagesData = readCSV('images.csv');
        const scoreData = readCSV('score.csv');

        // Add new property to projectReconData
        projectReconData.push(newProperty);

        // Add placeholder score to scoreData
        scoreData.push({
            PropertyName: newProperty.PropertyName,
            LandRegistryFound: 'N',
            ContactMade: 'N',
            SiteVisitBooked: 'N',
            ContractQuoted: 'N',
            SignedBuildingAquired: 'N',
            Closed: 'N',
            DateOfFinding: newProperty.DateOfFinding
        });

        // Add image URL to imagesData if an image is provided
        if (image) {
            imagesData.push({
                PropertyName: newProperty.PropertyName,
                ImageURL: `data:${image.mimetype};base64,${image.buffer.toString('base64')}`
            });
        }

        // Write updated data back to CSV files
        writeCSV('ProjectRecon.csv', projectReconData);
        writeCSV('images.csv', imagesData);
        writeCSV('score.csv', scoreData);

        res.json({ message: 'Property added successfully!' });
    } catch (error) {
        console.error('Error adding property:', error);
        res.status(500).json({ error: error.toString() });
    }
});

// Endpoint to update property notes
app.post('/updateProperty', (req, res) => {
    try {
        const updatedProperty = req.body;

        const projectReconData = readCSV('ProjectRecon.csv');

        const property = projectReconData.find(p => p.PropertyName === updatedProperty.PropertyName);
        if (property) {
            property.Notes = updatedProperty.Notes;
        }

        writeCSV('ProjectRecon.csv', projectReconData);

        res.json({ message: 'Notes updated successfully!' });
    } catch (error) {
        console.error('Error updating property notes:', error);
        res.status(500).json({ error: error.toString() });
    }
});

// Endpoint to update score data
app.post('/updateScore', (req, res) => {
    try {
        const updatedScore = req.body;

        const scoreData = readCSV('score.csv');

        const property = scoreData.find(p => p.PropertyName === updatedScore.PropertyName);
        if (property) {
            Object.assign(property, updatedScore);
        }

        writeCSV('score.csv', scoreData);

        res.json({ message: 'Score updated successfully!' });
    } catch (error) {
        console.error('Error updating score:', error);
        res.status(500).json({ error: error.toString() });
    }
});

// Endpoint to delete a property
app.delete('/deleteProperty/:propertyName', (req, res) => {
    try {
        const propertyName = req.params.propertyName;

        const projectReconData = readCSV('ProjectRecon.csv');
        const imagesData = readCSV('images.csv');
        const scoreData = readCSV('score.csv');

        // Filter out the property to delete
        const newProjectReconData = projectReconData.filter(p => p.PropertyName !== propertyName);
        const newImagesData = imagesData.filter(i => i.PropertyName !== propertyName);
        const newScoreData = scoreData.filter(s => s.PropertyName !== propertyName);

        // Write updated data back to CSV files
        writeCSV('ProjectRecon.csv', newProjectReconData);
        writeCSV('images.csv', newImagesData);
        writeCSV('score.csv', newScoreData);

        res.json({ message: 'Property deleted successfully!' });
    } catch (error) {
        console.error('Error deleting property:', error);
        res.status(500).json({ error: error.toString() });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
