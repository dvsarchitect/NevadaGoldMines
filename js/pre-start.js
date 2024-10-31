let currentCrew = '';
let currentShift = '';
let activeSection = null; // Track the currently active section


function clearOldData() {
    localStorage.removeItem('three-ws-data');
    console.log('Cleared old 3 W\'s data from localStorage');
}

// Call this once, when the script is first loaded
clearOldData();



// Set the current date in the header in the format "Month Day, Year"
function updateDateDisplay() {
    const date = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    const formattedDate = date.toLocaleDateString('en-US', options);
    const crewShiftDisplay = currentCrew === 'Day' ? 'Day Crew - ' : `${currentCrew} Crew ${currentShift} - `;
    document.getElementById('current-date').textContent = crewShiftDisplay + formattedDate;
}



// Automatically save data when switching sections
function saveCurrentSectionData() {
    if (activeSection) {
        const inputElement = document.querySelector(`#${activeSection} textarea, #${activeSection} input[type='text']`);

        if (inputElement) {
            saveData(activeSection, inputElement.id);
        } else if (activeSection === 'three-ws') {
            saveThreeWsData(); // Explicitly call the save function for 3 W's
        } else if (activeSection === 'fatal-risks') {
            saveFatalRisksData(); // Explicitly call the save function for Fatal Risks
        }
        updateButtonStatus();  // Update button status after saving
    }
}

function showSection(sectionId) {
    // Save the data from the currently active section
    saveCurrentSectionData();  // Ensures the active section's data is saved

    // Hide all sections and the default content
    document.querySelectorAll('.section, #default-content').forEach(function(section) {
        section.classList.remove('active');
        section.style.display = 'none'; // Ensure all sections and default content are hidden
    });

    // Show the selected section with a transition
    const selectedSection = document.getElementById(sectionId);
    selectedSection.style.display = 'block';
    setTimeout(function() {
        selectedSection.classList.add('active');
    }, 10); // Timeout for transition to take effect

    // Update the active section
    activeSection = sectionId;
}

function goToMain() {
    // Save the data from the currently active section
    saveCurrentSectionData();

    // Hide all sections
    document.querySelectorAll('.section').forEach(function(section) {
        section.classList.remove('active');
        section.style.display = 'none';
    });

    // Show the default content
    const defaultContent = document.getElementById('default-content');
    defaultContent.style.display = 'block';
    setTimeout(function() {
        defaultContent.classList.add('active');
    }, 10);

    // Clear the active section
    activeSection = null;
}

function saveData(section, inputId) {
    const wasFullScreen = document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement;

    if (inputId) {
        const data = document.getElementById(inputId).value;
        localStorage.setItem(section + '-data', data); // Save as plain text
    }

    updateButtonStatus(); // Update the button labels
}

function saveFatalRisksData() {
    const data = [];
    for (let i = 1; i <= 2; i++) {
        const name = document.getElementById(`name-${i}`).value;
        const task = document.getElementById(`task-${i}`).value || 'No task specified'; // Default value if task is empty
        const risks = Array.from(document.getElementById(`risk-${i}`).selectedOptions).map(option => option.value);

        if (name || task || risks.length > 0) {
            data.push({
                name: name,
                task: task,
                risks: risks.length > 0 ? risks : ['No risks specified'] // Default value for empty risks
            });
        }
    }

    if (data.length > 0) {
        console.log('Saving fatal risks data:', data);  // Add this line to check if it's called
        localStorage.setItem('fatal-risks-data', JSON.stringify(data));
        updateButtonStatus(); 
    }
}

function saveThreeWsData() {
    const threeWsInput = document.getElementById('three-ws-input');
    
    if (threeWsInput) {
        const data = threeWsInput.value || '';  // Get the value from the textarea
        localStorage.setItem('three-ws-data', data);  // Save it in localStorage
    } else {
        console.error("three-ws-input is missing.");
    }
}

function exportData() {
    // Force save for all sections before exporting
    saveCurrentSectionData();  // Save the currently active section
    saveAllSections();         // Save all sections

    // Gather crew, shift, and date information
    const crewShift = currentCrew + ' Crew ' + currentShift;
    const today = new Date();
    const formattedDate = today.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Initialize jsPDF
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Define styles for headers and text
    const headerStyle = { fontSize: 16, fontStyle: 'bold' };
    const subheaderStyle = { fontSize: 14, fontStyle: 'bold' };
    const normalTextStyle = { fontSize: 12 };
    
    let yOffset = 20; // Initial Y-offset for content

    // Add Crew and Date at the top
    doc.setFontSize(18);
    doc.text(`Safety Meeting Report`, 10, yOffset);
    yOffset += 10;

    doc.setFontSize(14);
    doc.text(`Crew Shift: ${crewShift}`, 10, yOffset);
    yOffset += 7;
    doc.text(`Date: ${formattedDate}`, 10, yOffset);
    yOffset += 15;

    const sections = ['dna-share', 'safety', 'production', 'celebrate', 'site-comm', 'three-ws', 'safety-focus', 'fatal-risks'];

    sections.forEach(section => {
        let sectionData = localStorage.getItem(section + '-data') || 'No data';

        // Add section headers with bold styling
        doc.setFontSize(headerStyle.fontSize);
        doc.setFont(undefined, headerStyle.fontStyle);
        doc.text(`--- ${section.toUpperCase().replace('-', ' ')} ---`, 10, yOffset);
        yOffset += 10;

        // Add normal text styling for content
        doc.setFontSize(normalTextStyle.fontSize);
        doc.setFont(undefined, 'normal');
        
        if (section === 'fatal-risks') {
            try {
                sectionData = JSON.parse(sectionData);
                if (Array.isArray(sectionData) && sectionData.length > 0) {
                    // Display fatal risks data in a tabular format
                    sectionData.forEach((item, index) => {
                        doc.text(`Name: ${item.name}`, 10, yOffset);
                        yOffset += 7;
                        doc.text(`Task: ${item.task}`, 10, yOffset);
                        yOffset += 7;
                        doc.text(`Risks: ${item.risks.length > 0 ? item.risks.join(', ') : 'No risks specified'}`, 10, yOffset);
                        yOffset += 12; // Extra space after each entry
                    });
                } else {
                    doc.text(`No fatal risks data available.`, 10, yOffset);
                    yOffset += 10;
                }
            } catch (error) {
                doc.text(`Error processing fatal risks data.`, 10, yOffset);
                yOffset += 10;
            }
        } else {
            // For other sections, output the data directly
            doc.text(`Data: ${sectionData}`, 10, yOffset);
            yOffset += 10;
        }

        yOffset += 5; // Add space between sections
    });

    // Save the PDF with an elegant filename
    const formattedDateForFilename = new Date().toLocaleDateString('en-CA'); // Format as YYYY-MM-DD
    doc.save(`safety_meeting_${formattedDateForFilename}.pdf`);
}



function saveAllSections() {
    // Save DNA Share
    const dnaShareInput = document.getElementById('dna-share-input');
    if (dnaShareInput) {
        localStorage.setItem('dna-share-data', dnaShareInput.value);
    }

    // Save Safety
    const safetyInput = document.getElementById('safety-input');
    if (safetyInput) {
        localStorage.setItem('safety-data', safetyInput.value);
    }

    // Save Production
    const productionInput = document.getElementById('production-input');
    if (productionInput) {
        localStorage.setItem('production-data', productionInput.value);
    }

    // Save Celebrate
    const celebrateInput = document.getElementById('celebrate-input');
    if (celebrateInput) {
        localStorage.setItem('celebrate-data', celebrateInput.value);
    }

    // Save Site Communication
    const siteCommInput = document.getElementById('site-comm-input');
    if (siteCommInput) {
        localStorage.setItem('site-comm-data', siteCommInput.value);
    }

    // Save 3 W's
    saveThreeWsData();  // Call specific function for 3 W's

    // Save Safety Focus
    const safetyFocusInput = document.getElementById('safety-focus-input');
    if (safetyFocusInput) {
        localStorage.setItem('safety-focus-data', safetyFocusInput.value);
    }

    // Save Fatal Risks
    saveFatalRisksData();  // Call specific function for Fatal Risks
}



function resetPage() {
    // Confirm if the user wants to reset the page
    if (confirm('Are you sure you want to reset the page? This will clear all entered data.')) {
        // Clear all local storage items
        localStorage.clear();

        // Clear all preview texts
        document.querySelectorAll('.section-button small').forEach(function(preview) {
            preview.textContent = '';
        });

        // Reload the page to reset the forms
        location.reload();
    }
}

function savePage() {
    if (!currentCrew || (!currentShift && currentCrew !== 'Day')) {
        alert('Please use the New button to start a new session.');
        return;
    }

    // Collect all the data from localStorage
    const data = {};
    const sections = ['dna-share', 'safety', 'production', 'celebrate', 'site-comm', 'three-ws', 'safety-focus', 'fatal-risks'];

    sections.forEach(section => {
        const sectionData = localStorage.getItem(section + '-data');
        data[section] = {
            sectionData: sectionData || ""
        };
    });

    // Trigger a download with the collected data as a JSON file
    const date = new Date();
    const formattedDate = date.toLocaleDateString('en-CA'); // Format as YYYY-MM-DD
    const fileName = `${currentCrew}_Crew_${currentShift}_${formattedDate}.json`;

    const jsonBlob = new Blob([JSON.stringify(data)], { type: "application/json" });
    const url = URL.createObjectURL(jsonBlob);

    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    a.click();
    URL.revokeObjectURL(url);
}

function newPage() {
    // Clear all sections and localStorage
    resetAllSections();

    // Open the modal to select crew and shift
    showCrewShiftModal();
}

// Function to clear all inputs and localStorage
function resetAllSections() {
    // Clear all localStorage data
    localStorage.clear();

    // Reset all input fields (e.g., textareas and text inputs)
    document.querySelectorAll('textarea, input[type="text"]').forEach(input => input.value = '');

    // Optionally, reset other UI components (e.g., selects, checkboxes)
    document.querySelectorAll('select').forEach(select => select.selectedIndex = 0);

    console.log('All sections reset.');
}

// Function to confirm crew and shift selection
function confirmCrewShift() {
    currentCrew = document.getElementById('crewSelect').value;
    if (!currentCrew) {
        alert("Crew is required.");
        return;
    }

    if (["Blue", "Green", "Orange", "Red"].includes(currentCrew)) {
        currentShift = document.getElementById('shiftSelect').value;
        if (!currentShift) {
            alert("Shift is required for the selected Crew.");
            return;
        }
    } else {
        currentShift = ""; // No shift required for Day crew
    }

    closeCrewShiftModal();
    updateDateDisplay(); // Update the date display with crew and shift
}

// Functions to show and close the modal
function showCrewShiftModal() {
    document.getElementById('crewShiftModal').style.display = 'flex';
}

function closeCrewShiftModal() {
    document.getElementById('crewShiftModal').style.display = 'none';
}




// Update button status based on saved data
function updateButtonStatus() {
    const categories = [
        { id: 'dna-share', label: 'DNA SHARE' },
        { id: 'safety', label: 'SAFETY' },
        { id: 'production', label: 'PRODUCTION' },
        { id: 'celebrate', label: 'CELEBRATE SUCCESS' },
        { id: 'site-comm', label: 'SITE COMMUNICATION' },
        { id: 'three-ws', label: '3 W\'S (What, Who, When)' },
        { id: 'safety-focus', label: 'SAFETY FOCUS' }
    ];

    categories.forEach(category => {
        const data = localStorage.getItem(category.id + '-data');
        const previewElement = document.getElementById(category.id + '-preview');

        if (data && data.trim() !== '') {
            previewElement.textContent = data; // Display the plain text for each section
        } else {
            previewElement.textContent = '';
        }
    });
}


// Run this function on page load and after saving data
window.onload = function() {
    updateDateDisplay();
    updateButtonStatus();

    // Attach event listeners after the page has fully loaded
    document.getElementById('fatal-risks-image').addEventListener('click', openFatalRisksSlideshow);

};

// Fullscreen functionality
function toggleFullscreen() {
    const elem = document.documentElement;
    const icon = document.getElementById('fullscreen-icon');
    
    if (!document.fullscreenElement) {
        if (elem.requestFullscreen) {
            elem.requestFullscreen();
        } else if (elem.mozRequestFullScreen) { // Firefox
            elem.mozRequestFullScreen();
        } else if (elem.webkitRequestFullscreen) { // Chrome, Safari and Opera
            elem.webkitRequestFullscreen();
        } else if (elem.msRequestFullscreen) { // IE/Edge
            elem.msRequestFullscreen();
        }
        icon.src = "file:///S:/AssayLab/LABTEC/LW-LIMS shared files/PreStart/images/normal.svg";
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen();
        }
        icon.src = "file:///S:/AssayLab/LABTEC/LW-LIMS shared files/PreStart/images/full.svg";
    }
}

// Show or hide shift options based on crew selection
document.getElementById('crewSelect').addEventListener('change', function() {
    const shiftSelect = document.getElementById('shiftSelect');
    if (["Blue", "Green", "Orange", "Red"].includes(this.value)) {
        shiftSelect.style.display = 'block';
    } else {
        shiftSelect.style.display = 'none';
        shiftSelect.value = '';
    }
});

// Array of image paths for the slideshow
let fatalRisksImages = [
    'images/fatal-risks/Blasting & Explosives.jpg',
    'images/fatal-risks/Confined Space.jpg',
    'images/fatal-risks/Fall of Ground.jpg',
    'images/fatal-risks/Falling from Heights.jpg',
    'images/fatal-risks/Fire.jpg',
    'images/fatal-risks/Hazardous Substances & Chemicals.jpg',
    'images/fatal-risks/Lifting.jpg',
    'images/fatal-risks/Mobile Equipment.jpg',
    'images/fatal-risks/Rotating Equipment.jpg',
    'images/fatal-risks/Stored Energy.jpg'
];

let currentSlideIndex = 0;

// Function to open the modal slideshow
function openFatalRisksSlideshow() {
    if (fatalRisksImages.length > 0) {
        currentSlideIndex = 0;
        document.getElementById('slideshow-image').src = fatalRisksImages[currentSlideIndex];
        document.getElementById('fatalRisksSlideshowModal').style.display = 'block';
    } else {
        alert('No images found for the Fatal Risks slideshow.');
    }
}

// Function to close the modal
function closeFatalRisksSlideshow() {
    document.getElementById('fatalRisksSlideshowModal').style.display = 'none';
}

// Function to navigate through slides
function navigateSlideshow(direction) {
    currentSlideIndex += direction;

    if (currentSlideIndex < 0) {
        currentSlideIndex = fatalRisksImages.length - 1;
    } else if (currentSlideIndex >= fatalRisksImages.length) {
        currentSlideIndex = 0;
    }

    document.getElementById('slideshow-image').src = fatalRisksImages[currentSlideIndex];
}
window.onload = function() {
    document.getElementById('risk-1').size = 5;  // Set size of dropdown dynamically
};

// Existing code

// List of sections in order (must match IDs in the HTML)
const sections = ['dna-share', 'safety', 'production', 'celebrate', 'site-comm', 'three-ws', 'safety-focus', 'fatal-risks'];

let currentSectionIndex = 0; // Start with DNA Share as the first section

// Function to show the current section based on index
function showSectionByIndex(index) {
    // Hide all sections first
    document.querySelectorAll('.section').forEach(section => section.style.display = 'none');

    // Show the current section
    const currentSection = document.getElementById(sections[index]);
    if (currentSection) {
        currentSection.style.display = 'block';
    } else {
        console.error("Section not found for index: " + index);
    }

    // Enable/Disable navigation buttons
    document.getElementById('back-button').disabled = index === 0;
    document.getElementById('next-button').disabled = index === sections.length - 1;
}

// Navigation logic for back/next buttons
function navigateSection(direction) {
    if (direction === 'next' && currentSectionIndex < sections.length - 1) {
        currentSectionIndex++;
    } else if (direction === 'back' && currentSectionIndex > 0) {
        currentSectionIndex--;
    }
    showSectionByIndex(currentSectionIndex);
}

// Initialize with the DNA Share section when the page loads
window.onload = function() {
    showSectionByIndex(currentSectionIndex); // Show the first section (DNA Share) on page load
};
