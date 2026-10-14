// Global data storage
let halls = [];
let departments = [];
let sessions = [];
let allocations = [];
let currentReportData = null;
let currentUser = null;
let manualRollNumbers = [];

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    // Check authentication first
    if (!checkAuthentication()) {
        window.location.href = 'login.html';
        return;
    }
    
    // Load current user info
    loadCurrentUser();
    
    loadDataFromStorage();
    updateHallsList();
    updateDepartmentsList();
    
    // Setup event listeners
    document.getElementById('hall-form').addEventListener('submit', addHall);
    document.getElementById('department-form').addEventListener('submit', addDepartment);
    document.getElementById('session-form').addEventListener('submit', addSession);
    document.getElementById('run-allocation').addEventListener('click', runAllocation);
    document.getElementById('student-search').addEventListener('submit', searchStudent);
    
    // Setup roll number entry method listeners
    document.querySelectorAll('input[name="roll-entry-method"]').forEach(radio => {
        radio.addEventListener('change', function() {
            toggleRollEntryMethod(this.value);
        });
    });
    
    // Initialize with default selection
    toggleRollEntryMethod('manual');
    
    // Setup manual roll number input listener for Enter key
    document.getElementById('manual-roll-input').addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            addManualRollNumber();
        }
    });
    
    // Initialize session selects
    updateSessionSelects();
});

// Authentication functions
function checkAuthentication() {
    return sessionStorage.getItem('adminLoggedIn') === 'true';
}

// Toggle roll entry method function
function toggleRollEntryMethod(method) {
    const manualEntry = document.getElementById('manual-roll-entry');
    const excelEntry = document.getElementById('excel-roll-entry');
    
    if (method === 'manual') {
        manualEntry.style.display = 'block';
        excelEntry.style.display = 'none';
        updateManualRollNumbersList();
    } else {
        manualEntry.style.display = 'none';
        excelEntry.style.display = 'block';
    }
}

function loadCurrentUser() {
    const userStr = sessionStorage.getItem('adminUser');
    if (userStr) {
        currentUser = JSON.parse(userStr);
        updateAdminInfo();
    }
}

function updateAdminInfo() {
    if (currentUser) {
        const adminInfo = document.getElementById('admin-info');
        const adminName = document.getElementById('admin-name');
        
        adminInfo.style.display = 'flex';
        adminName.textContent = `${currentUser.fullName} (${currentUser.role})`;
    }
}

function logout() {
    if (confirm('Are you sure you want to logout?')) {
        // Clear session storage
        sessionStorage.removeItem('adminLoggedIn');
        sessionStorage.removeItem('adminUser');
        sessionStorage.removeItem('loginTime');
        
        // Clear current user
        currentUser = null;
        
        // Redirect to login page
        window.location.href = 'login.html';
    }
}

// Check session timeout (30 minutes)
function checkSessionTimeout() {
    const loginTime = sessionStorage.getItem('loginTime');
    if (loginTime) {
        const loginDate = new Date(loginTime);
        const now = new Date();
        const diffMs = now - loginDate;
        const diffMinutes = Math.floor(diffMs / 60000);
        
        if (diffMinutes > 30) {
            alert('Your session has expired. Please login again.');
            logout();
            return false;
        }
    }
    return true;
}

// Check session timeout every minute
setInterval(checkSessionTimeout, 60000);

// Navigation functions
function showSection(section) {
    // Hide all sections
    document.querySelectorAll('.content-section').forEach(sec => {
        sec.classList.remove('active');
    });
    
    // Remove active class from all nav buttons
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(section + '-section').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Admin tab functions
function showAdminTab(tab) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tab + '-tab').classList.add('active');
    
    // Add active class to clicked button
    event.target.classList.add('active');
}

// Hall management functions (Admin only)
function addHall(e) {
    e.preventDefault();
    
    if (!hasAdminPermission()) {
        showAccessDenied();
        return;
    }
    
    const name = document.getElementById('hall-name').value.trim();
    const capacity = parseInt(document.getElementById('hall-capacity').value);
    
    if (name && capacity > 0) {
        const hall = {
            id: Date.now(),
            name: name,
            capacity: capacity,
            currentOccupancy: 0
        };
        
        halls.push(hall);
        saveDataToStorage();
        updateHallsList();
        
        // Reset form
        document.getElementById('hall-form').reset();
        
        showStatus('allocation-status', 'Hall added successfully!', 'success');
    }
}

function removeHall(id) {
    if (!hasAdminPermission()) {
        showAccessDenied();
        return;
    }
    
    if (confirm('Are you sure you want to remove this hall?')) {
        halls = halls.filter(hall => hall.id !== id);
        saveDataToStorage();
        updateHallsList();
        showStatus('allocation-status', 'Hall removed successfully!', 'success');
    }
}

// Department management functions (Admin only)
async function addDepartment(e) {
    e.preventDefault();
    
    if (!hasAdminPermission()) {
        showAccessDenied();
        return;
    }
    
    const name = document.getElementById('dept-name').value.trim();
    const rollEntryMethod = document.querySelector('input[name="roll-entry-method"]:checked').value;
    
    let rollNumbers = [];
    
    if (rollEntryMethod === 'manual') {
        rollNumbers = getCurrentManualRollNumbers();
    } else if (rollEntryMethod === 'excel') {
        const fileInput = document.getElementById('excel-file');
        if (fileInput.files.length > 0) {
            try {
                rollNumbers = await parseExcelFile(fileInput.files[0]);
                const skipHeader = document.getElementById('excel-include-header').checked;
                if (skipHeader && rollNumbers.length > 0) {
                    rollNumbers = rollNumbers.slice(1);
                }
            } catch (error) {
                showStatus('dept-status', 'Error parsing Excel file: ' + error.message, 'error');
                return;
            }
        }
    }
    
    if (name && rollNumbers.length > 0) {
        const department = {
            id: Date.now(),
            name: name,
            studentCount: rollNumbers.length,
            rollNumbers: rollNumbers
        };
        
        departments.push(department);
        saveDataToStorage();
        updateDepartmentsList();
        
        // Reset form
        resetDepartmentForm();
        
        showStatus('dept-status', `Department added successfully with ${rollNumbers.length} students!`, 'success');
    } else {
        showStatus('dept-status', 'Please enter department name and at least one roll number', 'error');
    }
}

function removeDepartment(id) {
    if (!hasAdminPermission()) {
        showAccessDenied();
        return;
    }
    
    if (confirm('Are you sure you want to remove this department?')) {
        departments = departments.filter(dept => dept.id !== id);
        saveDataToStorage();
        updateDepartmentsList();
        showStatus('dept-status', 'Department removed successfully!', 'success');
    }
}

// Session management functions (Admin only)
function addSession(e) {
    e.preventDefault();
    
    if (!hasAdminPermission()) {
        showAccessDenied();
        return;
    }
    
    const name = document.getElementById('session-name').value.trim();
    const date = document.getElementById('exam-date').value;
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const description = document.getElementById('session-description').value.trim();
    
    if (name && date && startTime && endTime) {
        const session = {
            id: Date.now(),
            name: name,
            date: date,
            startTime: startTime,
            endTime: endTime,
            description: description,
            status: 'draft'
        };
        
        sessions.push(session);
        saveDataToStorage();
        updateSessionsList();
        updateSessionSelects();
        
        // Reset form
        document.getElementById('session-form').reset();
        
        showStatus('allocation-status', 'Session added successfully!', 'success');
    }
}

function removeSession(id) {
    if (!hasAdminPermission()) {
        showAccessDenied();
        return;
    }
    
    if (confirm('Are you sure you want to remove this session?')) {
        sessions = sessions.filter(session => session.id !== id);
        saveDataToStorage();
        updateSessionsList();
        updateSessionSelects();
        showStatus('allocation-status', 'Session removed successfully!', 'success');
    }
}

// Permission checking functions
function hasAdminPermission() {
    if (!currentUser) return false;
    return ['super_admin', 'admin'].includes(currentUser.role);
}

function hasOperatorPermission() {
    if (!currentUser) return false;
    return ['super_admin', 'admin', 'operator'].includes(currentUser.role);
}

function showAccessDenied() {
    alert('Access denied! You do not have permission to perform this action.');
    logout();
}

function updateHallsList() {
    const container = document.getElementById('halls-container');
    
    if (halls.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No halls added yet.</p>';
        return;
    }
    
    container.innerHTML = halls.map(hall => `
        <div class="hall-item">
            <div class="item-info">
                <strong>${hall.name}</strong> - Capacity: ${hall.capacity}
                ${hall.currentOccupancy > 0 ? `(Occupied: ${hall.currentOccupancy})` : ''}
            </div>
            <div class="item-actions">
                ${hasAdminPermission() ? `
                    <button class="btn btn-danger btn-small" onclick="removeHall(${hall.id})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function updateDepartmentsList() {
    const container = document.getElementById('departments-container');
    
    if (departments.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No departments added yet.</p>';
        return;
    }
    
    container.innerHTML = departments.map(dept => `
        <div class="department-item">
            <div class="item-info">
                <strong>${dept.name}</strong> - Students: ${dept.studentCount}
            </div>
            <div class="item-actions">
                ${hasAdminPermission() ? `
                    <button class="btn btn-danger btn-small" onclick="removeDepartment(${dept.id})">
                        <i class="fas fa-trash"></i> Remove
                    </button>
                ` : ''}
            </div>
        </div>
    `).join('');
}

function updateSessionsList() {
    const container = document.getElementById('sessions-container');
    
    if (sessions.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No sessions added yet.</p>';
        return;
    }
    
    // Sort sessions by date and time
    const sortedSessions = [...sessions].sort((a, b) => {
        const dateA = new Date(a.date + ' ' + a.startTime);
        const dateB = new Date(b.date + ' ' + b.startTime);
        return dateA - dateB;
    });
    
    container.innerHTML = sortedSessions.map(session => `
        <div class="session-item">
            <div class="session-info">
                <div class="session-title">${session.name}</div>
                <div class="session-details">
                    ${formatDate(session.date)} | ${session.startTime} - ${session.endTime}
                    ${session.description ? '<br>' + session.description : ''}
                </div>
            </div>
            <div class="item-actions">
                <span class="session-status status-${session.status}">${session.status}</span>
                <button class="btn btn-danger btn-small" onclick="removeSession(${session.id})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
}

function removeSession(id) {
    if (confirm('Are you sure you want to remove this session?')) {
        sessions = sessions.filter(session => session.id !== id);
        saveDataToStorage();
        updateSessionsList();
        updateSessionSelects();
        showStatus('allocation-status', 'Session removed successfully!', 'success');
    }
}

function updateSessionSelects() {
    const adminSelect = document.getElementById('session-select');
    const studentSelect = document.getElementById('session-select-student');
    const reportSelect = document.getElementById('report-session-select');
    
    const options = '<option value="">Choose a session...</option>' + 
        sessions.map(session => `<option value="${session.id}">${session.name} - ${formatDate(session.date)}</option>`).join('');
    
    if (adminSelect) adminSelect.innerHTML = options;
    if (studentSelect) studentSelect.innerHTML = options;
    if (reportSelect) {
        reportSelect.innerHTML = '<option value="">All Sessions</option>' + 
            sessions.map(session => `<option value="${session.id}">${session.name} - ${formatDate(session.date)}</option>`).join('');
    }
}

function formatDate(dateString) {
    const options = { year: 'numeric', month: 'short', day: 'numeric' };
    return new Date(dateString).toLocaleDateString(undefined, options);
}

// Roll number management functions

// Add manual roll number
function addManualRollNumber() {
    const input = document.getElementById('manual-roll-input');
    const value = input.value.trim();
    
    if (!value) {
        showStatus('dept-status', 'Please enter a roll number', 'error');
        return;
    }
    
    // Handle multiple roll numbers separated by comma, space, or semicolon
    let newRolls = value.split(/[,\s;]+/).filter(r => r.trim().length > 0);
    
    // Add unique roll numbers
    let addedCount = 0;
    newRolls.forEach(roll => {
        roll = roll.trim().toUpperCase();
        if (roll && !manualRollNumbers.includes(roll)) {
            manualRollNumbers.push(roll);
            addedCount++;
        }
    });
    
    if (addedCount > 0) {
        input.value = '';
        updateManualRollNumbersList();
        showStatus('dept-status', `${addedCount} roll number(s) added successfully!`, 'success');
    } else if (value) {
        showStatus('dept-status', 'All entered roll numbers already exist!', 'warning');
        input.value = '';
    }
}

// Remove manual roll number
function removeManualRollNumber(index) {
    manualRollNumbers.splice(index, 1);
    updateManualRollNumbersList();
    showStatus('dept-status', 'Roll number removed!', 'info');
}

// Get current manual roll numbers
function getCurrentManualRollNumbers() {
    return manualRollNumbers;
}

// Update manualRollNumbersList display
function updateManualRollNumbersList() {
    const listDiv = document.getElementById('roll-numbers-list');
    const countSpan = document.getElementById('total-students-count');
    
    countSpan.textContent = manualRollNumbers.length;
    
    if (manualRollNumbers.length === 0) {
        listDiv.innerHTML = '<p style="color: #999; text-align: center; margin: 20px 0;">No roll numbers added yet</p>';
        return;
    }
    
    let html = '<div style="display: grid; gap: 8px;">';
    manualRollNumbers.forEach((roll, index) => {
        html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px; background: white; border: 1px solid #e0e0e0; border-radius: 3px;">
                <span style="font-family: monospace; font-weight: 500;">${roll}</span>
                <button type="button" class="btn btn-small" onclick="removeManualRollNumber(${index})" style="padding: 4px 8px; font-size: 12px;">
                    <i class="fas fa-trash-alt"></i> Remove
                </button>
            </div>
        `;
    });
    html += '</div>';
    listDiv.innerHTML = html;
}

// Reset department form
function resetDepartmentForm() {
    document.getElementById('department-form').reset();
    document.getElementById('manual-roll-input').value = '';
    document.getElementById('excel-file').value = '';
    manualRollNumbers = [];
    updateManualRollNumbersList();
    document.getElementById('excel-preview').style.display = 'none';
    toggleRollEntryMethod('manual');
}

// Excel file parsing function with better error handling
async function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = function(e) {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
                
                // Extract roll numbers from all cells, handling both single column and comma/space separated values
                let rollNumbers = [];
                
                jsonData.forEach(row => {
                    row.forEach(cell => {
                        if (cell) {
                            const cellStr = String(cell).trim();
                            if (cellStr.length > 0) {
                                // Check if cell contains multiple values separated by comma, space, or semicolon
                                const values = cellStr.split(/[,\s;]+/).filter(v => v.length > 0);
                                values.forEach(val => {
                                    if (!rollNumbers.includes(val.toUpperCase())) {
                                        rollNumbers.push(val.toUpperCase());
                                    }
                                });
                            }
                        }
                    });
                });
                
                if (rollNumbers.length === 0) {
                    reject(new Error('No roll numbers found in the uploaded file'));
                    return;
                }
                
                resolve(rollNumbers);
            } catch (error) {
                reject(new Error('Failed to parse uploaded file: ' + error.message));
            }
        };
        
        reader.onerror = function() {
            reject(new Error('Failed to read the selected file'));
        };
        
        reader.readAsArrayBuffer(file);
    });
}

// Preview Excel file with better formatting
async function previewExcelFile() {
    const fileInput = document.getElementById('excel-file');
    if (fileInput.files.length === 0) {
        showStatus('dept-status', 'Please select a file first', 'error');
        return;
    }
    
    try {
        let rollNumbers = await parseExcelFile(fileInput.files[0]);
        const skipHeader = document.getElementById('excel-include-header').checked;
        
        if (skipHeader && rollNumbers.length > 0) {
            rollNumbers = rollNumbers.slice(1);
        }
        
        const previewDiv = document.getElementById('excel-preview');
        const previewContent = document.getElementById('excel-preview-content');
        const countSpan = document.getElementById('excel-roll-count');
        const totalSpan = document.getElementById('excel-total-students-count');
        
        countSpan.textContent = rollNumbers.length;
        totalSpan.textContent = rollNumbers.length;
        
        // Display preview with grid layout
        let html = '<div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 8px;">';
        rollNumbers.slice(0, 50).forEach((roll, index) => {
            html += `<div style="padding: 8px; background: white; border: 1px solid #e0e0e0; border-radius: 3px; font-family: monospace; text-align: center;">${roll}</div>`;
        });
        html += '</div>';
        
        if (rollNumbers.length > 50) {
            html += `<p style="margin-top: 15px; color: #666; font-style: italic;">... and ${rollNumbers.length - 50} more roll numbers</p>`;
        }
        
        previewContent.innerHTML = html;
        previewDiv.style.display = 'block';
        
        showStatus('dept-status', `File loaded! Found ${rollNumbers.length} roll numbers.`, 'success');
    } catch (error) {
        showStatus('dept-status', 'Error: ' + error.message, 'error');
        document.getElementById('excel-preview').style.display = 'none';
    }
}

// Reload/reparse Excel preview
async function reloadExcelPreview() {
    await previewExcelFile();
}

function updateDepartmentsList() {
    const container = document.getElementById('departments-container');
    
    if (departments.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d; font-style: italic;">No departments added yet.</p>';
        return;
    }
    
    container.innerHTML = departments.map(dept => `
        <div class="department-item">
            <div class="item-info">
                <strong>${dept.name}</strong> - Students: ${dept.studentCount}
            </div>
            <div class="item-actions">
                <button class="btn btn-danger btn-small" onclick="removeDepartment(${dept.id})">
                    <i class="fas fa-trash"></i> Remove
                </button>
            </div>
        </div>
    `).join('');
}

function removeDepartment(id) {
    if (confirm('Are you sure you want to remove this department?')) {
        departments = departments.filter(dept => dept.id !== id);
        saveDataToStorage();
        updateDepartmentsList();
        showStatus('allocation-status', 'Department removed successfully!', 'success');
    }
}

// Enhanced allocation algorithm with department mixing (Admin/Operator only)
function runAllocation() {
    if (!hasOperatorPermission()) {
        showAccessDenied();
        return;
    }
    
    const sessionId = parseInt(document.getElementById('session-select').value);
    const mixDepartments = document.getElementById('mix-departments').checked;
    const rowsPerHall = parseInt(document.getElementById('rows-per-hall').value);
    
    if (!sessionId) {
        showStatus('allocation-status', 'Please select a session first!', 'error');
        return;
    }
    
    if (halls.length === 0) {
        showStatus('allocation-status', 'Please add at least one hall first!', 'error');
        return;
    }
    
    if (departments.length === 0) {
        showStatus('allocation-status', 'Please add at least one department first!', 'error');
        return;
    }
    
    // Clear previous allocations for this session
    allocations = allocations.filter(a => a.sessionId !== sessionId);
    
    // Generate students from departments using actual roll numbers
    let allStudents = [];
    let studentId = 1001;
    
    departments.forEach(dept => {
        // Use actual roll numbers from department
        if (dept.rollNumbers && dept.rollNumbers.length > 0) {
            dept.rollNumbers.forEach(roll => {
                allStudents.push({
                    id: studentId,
                    rollNumber: roll,
                    department: dept.name,
                    departmentId: dept.id,
                    sessionId: sessionId,
                    hallId: null,
                    seatNumber: null,
                    rowNumber: null,
                    columnNumber: null
                });
                studentId++;
            });
        } else {
            // Fallback for old departments without rollNumbers array
            for (let i = 0; i < dept.studentCount; i++) {
                allStudents.push({
                    id: studentId,
                    rollNumber: `${dept.name.substring(0, 3).toUpperCase()}${String(i + 1).padStart(3, '0')}`,
                    department: dept.name,
                    departmentId: dept.id,
                    sessionId: sessionId,
                    hallId: null,
                    seatNumber: null,
                    rowNumber: null,
                    columnNumber: null
                });
                studentId++;
            }
        }
    });
    
    // Enhanced shuffling with department mixing
    if (mixDepartments) {
        allStudents = mixDepartmentsAdvanced(allStudents);
    } else {
        allStudents = shuffleArray(allStudents);
    }
    
    // Allocate students to halls
    const sortedHalls = [...halls].sort((a, b) => b.capacity - a.capacity);
    let currentHallIndex = 0;
    let seatCounter = 1;
    
    allStudents.forEach(student => {
        // Find available hall
        while (currentHallIndex < sortedHalls.length) {
            const currentHall = sortedHalls[currentHallIndex];
            const currentAllocations = allocations.filter(a => a.hallId === currentHall.id && a.sessionId === sessionId);
            
            if (currentAllocations.length < currentHall.capacity) {
                // Allocate student to current hall
                student.hallId = currentHall.id;
                student.seatNumber = seatCounter;
                student.rowNumber = Math.ceil(seatCounter / rowsPerHall);
                student.columnNumber = ((seatCounter - 1) % rowsPerHall) + 1;
                
                allocations.push(student);
                seatCounter++;
                break;
            } else {
                currentHallIndex++;
                seatCounter = 1; // Reset seat counter for new hall
            }
        }
    });
    
    // Update session status
    const session = sessions.find(s => s.id === sessionId);
    if (session) {
        session.status = 'active';
    }
    
    saveDataToStorage();
    updateSessionsList();
    
    const allocatedCount = allocations.filter(a => a.sessionId === sessionId).length;
    showStatus('allocation-status', 
        `Allocation completed successfully! ${allocatedCount} students allocated to halls for session "${session.name}".`, 
        'success'
    );
}

// Advanced department mixing algorithm
function mixDepartmentsAdvanced(students) {
    const shuffled = [];
    const departments = {};
    
    // Group students by department
    students.forEach(student => {
        if (!departments[student.departmentId]) {
            departments[student.departmentId] = [];
        }
        departments[student.departmentId].push(student);
    });
    
    // Shuffle each department group
    Object.keys(departments).forEach(deptId => {
        departments[deptId] = shuffleArray(departments[deptId]);
    });
    
    // Create mixed arrangement
    const deptIds = Object.keys(departments);
    let currentDeptIndex = 0;
    let sameDeptCount = 0;
    const maxSameDeptAdjacent = 2;
    
    while (Object.values(departments).some(dept => dept.length > 0)) {
        let added = false;
        const originalIndex = currentDeptIndex;
        
        do {
            const currentDeptId = deptIds[currentDeptIndex];
            const currentDept = departments[currentDeptId];
            
            if (currentDept.length > 0) {
                // Check if we can add from this department
                if (sameDeptCount < maxSameDeptAdjacent || shuffled.length === 0) {
                    const student = currentDept.shift();
                    shuffled.push(student);
                    added = true;
                    sameDeptCount++;
                } else {
                    // Try to find a different department
                    const nextDeptIndex = (currentDeptIndex + 1) % deptIds.length;
                    if (nextDeptIndex !== currentDeptIndex && departments[deptIds[nextDeptIndex]].length > 0) {
                        currentDeptIndex = nextDeptIndex;
                        sameDeptCount = 0;
                        continue;
                    }
                }
            }
            
            currentDeptIndex = (currentDeptIndex + 1) % deptIds;
            
            if (currentDeptIndex === originalIndex && !added) {
                // If we've gone full circle and couldn't add, reset counter
                sameDeptCount = 0;
            }
        } while (currentDeptIndex !== originalIndex && !added);
        
        if (!added) {
            // Add from any available department
            for (const deptId of deptIds) {
                if (departments[deptId].length > 0) {
                    const student = departments[deptId].shift();
                    shuffled.push(student);
                    break;
                }
            }
        }
    }
    
    return shuffled;
}

// Fisher-Yates shuffle algorithm
function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// Student search function with session support
function searchStudent(e) {
    e.preventDefault();
    
    const rollNumber = document.getElementById('roll-number').value.trim();
    const sessionId = parseInt(document.getElementById('session-select-student').value);
    const resultContainer = document.getElementById('student-result');
    
    if (!rollNumber) {
        resultContainer.innerHTML = '<div class="status-error">Please enter a valid roll number.</div>';
        resultContainer.style.display = 'block';
        return;
    }
    
    if (!sessionId) {
        resultContainer.innerHTML = '<div class="status-error">Please select a session.</div>';
        resultContainer.style.display = 'block';
        return;
    }
    
    const student = allocations.find(s => 
        s.rollNumber === rollNumber && s.sessionId === sessionId
    );
    
    if (student) {
        const hall = halls.find(h => h.id === student.hallId);
        const session = sessions.find(s => s.id === sessionId);
        resultContainer.innerHTML = `
            <div class="student-result-card">
                <h4><i class="fas fa-check-circle"></i> Allocation Found</h4>
                <div class="student-detail">
                    <span>Roll Number:</span>
                    <strong>${student.rollNumber}</strong>
                </div>
                <div class="student-detail">
                    <span>Department:</span>
                    <strong>${student.department}</strong>
                </div>
                <div class="student-detail">
                    <span>Session:</span>
                    <strong>${session.name} - ${formatDate(session.date)}</strong>
                </div>
                <div class="student-detail">
                    <span>Time:</span>
                    <strong>${session.startTime} - ${session.endTime}</strong>
                </div>
                <div class="student-detail">
                    <span>Exam Hall:</span>
                    <strong>${hall ? hall.name : 'Unknown'}</strong>
                </div>
                <div class="student-detail">
                    <span>Seat Number:</span>
                    <strong>${student.seatNumber}</strong>
                </div>
                <div class="student-detail">
                    <span>Position:</span>
                    <strong>Row ${student.rowNumber}, Column ${student.columnNumber}</strong>
                </div>
            </div>
        `;
    } else {
        resultContainer.innerHTML = `
            <div class="status-error">
                <i class="fas fa-exclamation-circle"></i> No allocation found for roll number ${rollNumber} in selected session
            </div>
        `;
    }
    
    resultContainer.style.display = 'block';
}

// Enhanced report generation functions with session support
function generateHallReport() {
    const sessionId = parseInt(document.getElementById('report-session-select').value);
    let filteredAllocations = sessionId ? 
        allocations.filter(a => a.sessionId === sessionId) : 
        allocations;
    
    if (filteredAllocations.length === 0) {
        showReportMessage('No allocations available for the selected session. Please run allocation first.');
        return;
    }
    
    const reportsContainer = document.getElementById('reports-container');
    
    // Group students by hall
    const hallGroups = {};
    halls.forEach(hall => {
        hallGroups[hall.id] = {
            hallName: hall.name,
            capacity: hall.capacity,
            students: []
        };
    });
    
    filteredAllocations.forEach(student => {
        if (hallGroups[student.hallId]) {
            hallGroups[student.hallId].students.push(student);
        }
    });
    
    let html = '<h3><i class="fas fa-building"></i> Hall-wise Allocation Report</h3>';
    if (sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        html += `<p><strong>Session:</strong> ${session.name} - ${formatDate(session.date)}</p>`;
    }
    
    Object.values(hallGroups).forEach(hall => {
        if (hall.students.length > 0) {
            html += `
                <div class="card" style="margin-bottom: 2rem;">
                    <h4>${hall.hallName} (Capacity: ${hall.capacity}, Occupied: ${hall.students.length})</h4>
                    <table class="report-table" id="hall-report-${hall.hallName.replace(/\s+/g, '-')}">
                        <thead>
                            <tr>
                                <th>Seat No.</th>
                                <th>Roll Number</th>
                                <th>Department</th>
                                <th>Row</th>
                                <th>Column</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            hall.students.sort((a, b) => a.seatNumber - b.seatNumber).forEach(student => {
                html += `
                    <tr>
                        <td>${student.seatNumber}</td>
                        <td>${student.rollNumber}</td>
                        <td>${student.department}</td>
                        <td>${student.rowNumber}</td>
                        <td>${student.columnNumber}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }
    });
    
    reportsContainer.innerHTML = html;
    currentReportData = { type: 'hall', data: hallGroups, sessionId };
}

function generateDepartmentReport() {
    const sessionId = parseInt(document.getElementById('report-session-select').value);
    let filteredAllocations = sessionId ? 
        allocations.filter(a => a.sessionId === sessionId) : 
        allocations;
    
    if (filteredAllocations.length === 0) {
        showReportMessage('No allocations available for the selected session. Please run allocation first.');
        return;
    }
    
    const reportsContainer = document.getElementById('reports-container');
    
    // Group students by department
    const deptGroups = {};
    filteredAllocations.forEach(student => {
        if (!deptGroups[student.department]) {
            deptGroups[student.department] = [];
        }
        deptGroups[student.department].push(student);
    });
    
    let html = '<h3><i class="fas fa-users"></i> Department-wise Allocation Report</h3>';
    if (sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        html += `<p><strong>Session:</strong> ${session.name} - ${formatDate(session.date)}</p>`;
    }
    
    Object.entries(deptGroups).forEach(([deptName, students]) => {
        html += `
            <div class="card" style="margin-bottom: 2rem;">
                <h4>${deptName} (Total Students: ${students.length})</h4>
                <table class="report-table" id="dept-report-${deptName.replace(/\s+/g, '-')}">
                    <thead>
                        <tr>
                            <th>Roll Number</th>
                            <th>Hall</th>
                            <th>Seat Number</th>
                            <th>Row</th>
                            <th>Column</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        students.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)).forEach(student => {
            const hall = halls.find(h => h.id === student.hallId);
            html += `
                <tr>
                    <td>${student.rollNumber}</td>
                    <td>${hall ? hall.name : 'Unknown'}</td>
                    <td>${student.seatNumber}</td>
                    <td>${student.rowNumber}</td>
                    <td>${student.columnNumber}</td>
                </tr>
            `;
        });
        
        html += `
                    </tbody>
                </table>
            </div>
        `;
    });
    
    reportsContainer.innerHTML = html;
    currentReportData = { type: 'department', data: deptGroups, sessionId };
}

function generateAttendanceSheet() {
    const sessionId = parseInt(document.getElementById('report-session-select').value);
    let filteredAllocations = sessionId ? 
        allocations.filter(a => a.sessionId === sessionId) : 
        allocations;
    
    if (filteredAllocations.length === 0) {
        showReportMessage('No allocations available for the selected session. Please run allocation first.');
        return;
    }
    
    const reportsContainer = document.getElementById('reports-container');
    
    let html = '<h3><i class="fas fa-clipboard-check"></i> Attendance Sheet</h3>';
    if (sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        html += `<p><strong>Session:</strong> ${session.name} - ${formatDate(session.date)} (${session.startTime} - ${session.endTime})</p>`;
    }
    
    html += '<div class="card">';
    html += '<table class="report-table" id="attendance-sheet">';
    html += `
        <thead>
            <tr>
                <th>Roll Number</th>
                <th>Department</th>
                <th>Hall</th>
                <th>Seat Number</th>
                <th>Row</th>
                <th>Column</th>
                <th>Signature</th>
            </tr>
        </thead>
        <tbody>
    `;
    
    filteredAllocations.sort((a, b) => {
        const hallA = halls.find(h => h.id === a.hallId);
        const hallB = halls.find(h => h.id === b.hallId);
        return hallA.name.localeCompare(hallB.name) || a.seatNumber - b.seatNumber;
    }).forEach(student => {
        const hall = halls.find(h => h.id === student.hallId);
        html += `
            <tr>
                <td>${student.rollNumber}</td>
                <td>${student.department}</td>
                <td>${hall ? hall.name : 'Unknown'}</td>
                <td>${student.seatNumber}</td>
                <td>${student.rowNumber}</td>
                <td>${student.columnNumber}</td>
                <td></td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    
    reportsContainer.innerHTML = html;
    currentReportData = { type: 'attendance', data: filteredAllocations, sessionId };
}

function generateHallTickets() {
    const sessionId = parseInt(document.getElementById('report-session-select').value);
    let filteredAllocations = sessionId ? 
        allocations.filter(a => a.sessionId === sessionId) : 
        allocations;
    
    if (filteredAllocations.length === 0) {
        showReportMessage('No allocations available for the selected session. Please run allocation first.');
        return;
    }
    
    const reportsContainer = document.getElementById('reports-container');
    
    let html = '<h3><i class="fas fa-ticket-alt"></i> Hall Tickets</h3>';
    if (sessionId) {
        const session = sessions.find(s => s.id === sessionId);
        html += `<p><strong>Session:</strong> ${session.name} - ${formatDate(session.date)}</p>`;
    }
    
    html += '<div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 1rem;" id="hall-tickets">';
    
    filteredAllocations.forEach(student => {
        const hall = halls.find(h => h.id === student.hallId);
        const session = sessions.find(s => s.id === student.sessionId);
        html += `
            <div class="card" style="text-align: center; border: 2px solid #667eea; page-break-inside: avoid;">
                <h4 style="color: #667eea; margin-bottom: 1rem;">Exam Hall Ticket</h4>
                <div style="background: #f8f9fa; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <p><strong>Roll Number:</strong> ${student.rollNumber}</p>
                    <p><strong>Department:</strong> ${student.department}</p>
                    <p><strong>Session:</strong> ${session.name}</p>
                    <p><strong>Date:</strong> ${formatDate(session.date)}</p>
                    <p><strong>Time:</strong> ${session.startTime} - ${session.endTime}</p>
                    <p><strong>Hall:</strong> ${hall ? hall.name : 'Unknown'}</p>
                    <p><strong>Seat Number:</strong> ${student.seatNumber}</p>
                    <p><strong>Position:</strong> Row ${student.rowNumber}, Column ${student.columnNumber}</p>
                </div>
                <small style="color: #7f8c8d;">Please bring this ticket on exam day</small>
            </div>
        `;
    });
    
    html += '</div>';
    
    reportsContainer.innerHTML = html;
    currentReportData = { type: 'tickets', data: filteredAllocations, sessionId };
}

function showReportMessage(message) {
    const reportsContainer = document.getElementById('reports-container');
    reportsContainer.innerHTML = `
        <div class="status-info">
            <i class="fas fa-info-circle"></i> ${message}
        </div>
    `;
}

// Visual Seating Arrangement PDF Export
function exportVisualSeatingArrangement() {
    if (!currentReportData || currentReportData.type !== 'hall') {
        showReportMessage('Please generate a hall report first before exporting visual arrangement.');
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF('landscape', 'mm', 'a4');
    
    // Add title
    const session = sessions.find(s => s.id === currentReportData.sessionId);
    let title = 'Visual Seating Arrangement';
    if (session) {
        title += ` - ${session.name}`;
    }
    
    doc.setFontSize(20);
    doc.text(title, 148, 20, { align: 'center' });
    
    if (session) {
        doc.setFontSize(12);
        doc.text(`Date: ${formatDate(session.date)} | Time: ${session.startTime} - ${session.endTime}`, 148, 30, { align: 'center' });
    }
    
    let yPosition = 50;
    
    // Generate visual layout for each hall
    Object.values(currentReportData.data).forEach((hall, index) => {
        if (hall.students.length === 0) return;
        
        if (index > 0) {
            doc.addPage();
            yPosition = 50;
        }
        
        // Hall title
        doc.setFontSize(16);
        doc.text(`${hall.hallName} (${hall.students.length} students)`, 20, yPosition);
        yPosition += 20;
        
        // Calculate grid dimensions
        const rowsPerHall = parseInt(document.getElementById('rows-per-hall').value) || 4;
        const colsPerHall = Math.ceil(hall.capacity / rowsPerHall);
        
        // Generate visual seating layout
        yPosition = generateVisualHallLayout(doc, hall.students, rowsPerHall, colsPerHall, yPosition);
    });
    
    // Save the PDF
    const fileName = `visual-seating-arrangement-${Date.now()}.pdf`;
    doc.save(fileName);
}

function generateVisualHallLayout(doc, students, rows, cols, startY) {
    const seatWidth = 25;
    const seatHeight = 15;
    const seatSpacing = 5;
    const rowSpacing = 8;
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    
    // Center the layout
    const totalWidth = cols * seatWidth + (cols - 1) * seatSpacing;
    const startX = (pageWidth - totalWidth) / 2;
    
    let currentY = startY;
    
    // Create seat grid
    for (let row = 0; row < rows; row++) {
        let currentX = startX;
        
        for (let col = 0; col < cols; col++) {
            const seatNumber = row * cols + col + 1;
            const student = students.find(s => s.seatNumber === seatNumber);
            
            if (student) {
                // Get department color
                const deptColor = getDepartmentColor(student.department);
                
                // Draw seat block
                doc.setFillColor(deptColor.r, deptColor.g, deptColor.b);
                doc.rect(currentX, currentY, seatWidth, seatHeight, 'F');
                
                // Add border
                doc.setDrawColor(0, 0, 0);
                doc.rect(currentX, currentY, seatWidth, seatHeight, 'S');
                
                // Add seat number
                doc.setFontSize(8);
                doc.setTextColor(0, 0, 0);
                doc.text(student.rollNumber, currentX + seatWidth/2, currentY + 5, { align: 'center' });
                
                // Add department code
                doc.setFontSize(10);
                const deptCode = student.department.substring(0, 2).toUpperCase();
                doc.text(deptCode, currentX + seatWidth/2, currentY + 12, { align: 'center' });
            } else {
                // Draw empty seat
                doc.setFillColor(240, 240, 240);
                doc.rect(currentX, currentY, seatWidth, seatHeight, 'F');
                doc.setDrawColor(200, 200, 200);
                doc.rect(currentX, currentY, seatWidth, seatHeight, 'S');
                
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(seatNumber.toString(), currentX + seatWidth/2, currentY + 10, { align: 'center' });
            }
            
            currentX += seatWidth + seatSpacing;
        }
        
        currentY += seatHeight + rowSpacing;
        
        // Check if we need a new page
        if (currentY > doc.internal.pageSize.height - 30) {
            doc.addPage();
            currentY = 50;
        }
    }
    
    // Add legend
    currentY += 20;
    doc.setFontSize(12);
    doc.text('Department Legend:', margin, currentY);
    currentY += 10;
    
    const departments = [...new Set(students.map(s => s.department))];
    let legendX = margin;
    
    departments.forEach(dept => {
        const color = getDepartmentColor(dept);
        doc.setFillColor(color.r, color.g, color.b);
        doc.rect(legendX, currentY, 15, 10, 'F');
        doc.setDrawColor(0, 0, 0);
        doc.rect(legendX, currentY, 15, 10, 'S');
        
        doc.setFontSize(10);
        doc.setTextColor(0, 0, 0);
        doc.text(dept, legendX + 20, currentY + 7);
        
        legendX += 80;
        if (legendX > pageWidth - 100) {
            currentY += 15;
            legendX = margin;
        }
    });
    
    return currentY + 30;
}

function getDepartmentColor(department) {
    // Generate consistent colors for departments
    const colors = [
        { r: 144, g: 238, b: 144 }, // Light green
        { r: 255, g: 218, b: 185 }, // Light orange
        { r: 173, g: 216, b: 230 }, // Light blue
        { r: 221, g: 160, b: 221 }, // Light purple
        { r: 255, g: 255, b: 224 }, // Light yellow
        { r: 255, g: 192, b: 203 }, // Light pink
        { r: 152, g: 251, b: 152 }, // Pale green
        { r: 255, g: 228, b: 196 }, // Light peach
    ];
    
    // Use department name to generate consistent color
    let hash = 0;
    for (let i = 0; i < department.length; i++) {
        hash = department.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const colorIndex = Math.abs(hash) % colors.length;
    return colors[colorIndex];
}

// Enhanced PDF Export Function with Visual Option
function exportToPDF() {
    if (!currentReportData) {
        showReportMessage('Please generate a report first before exporting.');
        return;
    }
    
    // Check if visual export is requested
    const visualExport = document.getElementById('visual-export-checkbox')?.checked;
    
    if (visualExport && currentReportData.type === 'hall') {
        exportVisualSeatingArrangement();
        return;
    }
    
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Add title
    const session = sessions.find(s => s.id === currentReportData.sessionId);
    let title = 'Exam Hall Allocation Report';
    if (session) {
        title += ` - ${session.name}`;
    }
    
    doc.setFontSize(18);
    doc.text(title, 14, 20);
    
    if (session) {
        doc.setFontSize(12);
        doc.text(`Date: ${formatDate(session.date)} | Time: ${session.startTime} - ${session.endTime}`, 14, 30);
    }
    
    let yPosition = 45;
    
    switch (currentReportData.type) {
        case 'hall':
            exportHallReportToPDF(doc, currentReportData.data, yPosition);
            break;
        case 'department':
            exportDepartmentReportToPDF(doc, currentReportData.data, yPosition);
            break;
        case 'attendance':
            exportAttendanceSheetToPDF(doc, currentReportData.data, yPosition);
            break;
        case 'tickets':
            exportHallTicketsToPDF(doc, currentReportData.data, yPosition);
            break;
    }
    
    // Save the PDF
    const fileName = `exam-allocation-${currentReportData.type}-${Date.now()}.pdf`;
    doc.save(fileName);
}

function exportHallReportToPDF(doc, hallGroups, yPosition) {
    Object.values(hallGroups).forEach((hall, index) => {
        if (hall.students.length === 0) return;
        
        if (index > 0) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text(`${hall.hallName} (Capacity: ${hall.capacity}, Occupied: ${hall.students.length})`, 14, yPosition);
        yPosition += 10;
        
        // Prepare table data
        const tableData = hall.students.sort((a, b) => a.seatNumber - b.seatNumber).map(student => [
            student.seatNumber.toString(),
            student.rollNumber,
            student.department,
            `Row ${student.rowNumber}`,
            `Col ${student.columnNumber}`
        ]);
        
        // Add table using autoTable
        doc.autoTable({
            head: [['Seat No.', 'Roll Number', 'Department', 'Row', 'Column']],
            body: tableData,
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [102, 126, 234] }
        });
    });
}

function exportDepartmentReportToPDF(doc, deptGroups, yPosition) {
    Object.entries(deptGroups).forEach(([deptName, students], index) => {
        if (index > 0) {
            doc.addPage();
            yPosition = 20;
        }
        
        doc.setFontSize(14);
        doc.text(`${deptName} (Total Students: ${students.length})`, 14, yPosition);
        yPosition += 10;
        
        // Prepare table data
        const tableData = students.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)).map(student => {
            const hall = halls.find(h => h.id === student.hallId);
            return [
                student.rollNumber,
                hall ? hall.name : 'Unknown',
                student.seatNumber.toString(),
                `Row ${student.rowNumber}`,
                `Col ${student.columnNumber}`
            ];
        });
        
        // Add table using autoTable
        doc.autoTable({
            head: [['Roll Number', 'Hall', 'Seat Number', 'Row', 'Column']],
            body: tableData,
            startY: yPosition,
            theme: 'grid',
            styles: { fontSize: 10 },
            headStyles: { fillColor: [102, 126, 234] }
        });
    });
}

function exportAttendanceSheetToPDF(doc, students, yPosition) {
    // Sort students by hall then seat number
    const sortedStudents = students.sort((a, b) => {
        const hallA = halls.find(h => h.id === a.hallId);
        const hallB = halls.find(h => h.id === b.hallId);
        return hallA.name.localeCompare(hallB.name) || a.seatNumber - b.seatNumber;
    });
    
    // Prepare table data
    const tableData = sortedStudents.map(student => {
        const hall = halls.find(h => h.id === student.hallId);
        return [
            student.rollNumber,
            student.department,
            hall ? hall.name : 'Unknown',
            student.seatNumber.toString(),
            `Row ${student.rowNumber}`,
            `Col ${student.columnNumber}`,
            '' // Signature column
        ];
    });
    
    // Add table using autoTable
    doc.autoTable({
        head: [['Roll Number', 'Department', 'Hall', 'Seat Number', 'Row', 'Column', 'Signature']],
        body: tableData,
        startY: yPosition,
        theme: 'grid',
        styles: { fontSize: 9 },
        headStyles: { fillColor: [102, 126, 234] },
        columnStyles: {
            6: { cellWidth: 40 } // Signature column wider
        }
    });
}

function exportHallTicketsToPDF(doc, students) {
    students.forEach((student, index) => {
        if (index > 0) {
            doc.addPage();
        }
        
        const hall = halls.find(h => h.id === student.hallId);
        const session = sessions.find(s => s.id === student.sessionId);
        
        // Center the ticket
        const pageWidth = doc.internal.pageSize.width;
        const centerX = pageWidth / 2;
        
        doc.setFontSize(16);
        doc.text('Exam Hall Ticket', centerX, 30, { align: 'center' });
        
        doc.setFontSize(12);
        const ticketData = [
            `Roll Number: ${student.rollNumber}`,
            `Department: ${student.department}`,
            `Session: ${session.name}`,
            `Date: ${formatDate(session.date)}`,
            `Time: ${session.startTime} - ${session.endTime}`,
            `Hall: ${hall ? hall.name : 'Unknown'}`,
            `Seat Number: ${student.seatNumber}`,
            `Position: Row ${student.rowNumber}, Column ${student.columnNumber}`
        ];
        
        let yPosition = 60;
        ticketData.forEach(line => {
            doc.text(line, centerX, yPosition, { align: 'center' });
            yPosition += 12;
        });
        
        doc.setFontSize(10);
        doc.text('Please bring this ticket on exam day', centerX, yPosition + 10, { align: 'center' });
        
        // Add border
        doc.setDrawColor(102, 126, 234);
        doc.rect(20, 20, pageWidth - 40, doc.internal.pageSize.height - 40);
    });
}

// Excel Export Function
function exportToExcel() {
    if (!currentReportData) {
        showReportMessage('Please generate a report first before exporting.');
        return;
    }
    
    let workbook = XLSX.utils.book_new();
    let worksheet;
    
    const session = sessions.find(s => s.id === currentReportData.sessionId);
    const sessionInfo = session ? `${session.name} - ${formatDate(session.date)}` : 'All Sessions';
    
    switch (currentReportData.type) {
        case 'hall':
            worksheet = createHallWorksheet(currentReportData.data, sessionInfo);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Hall Report');
            break;
        case 'department':
            worksheet = createDepartmentWorksheet(currentReportData.data, sessionInfo);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Department Report');
            break;
        case 'attendance':
            worksheet = createAttendanceWorksheet(currentReportData.data, sessionInfo);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Attendance Sheet');
            break;
        case 'tickets':
            worksheet = createTicketsWorksheet(currentReportData.data, sessionInfo);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Hall Tickets');
            break;
    }
    
    // Save the Excel file
    const fileName = `exam-allocation-${currentReportData.type}-${Date.now()}.xlsx`;
    XLSX.writeFile(workbook, fileName);
}

function createHallWorksheet(hallGroups, sessionInfo) {
    const data = [
        ['Exam Hall Allocation Report', sessionInfo],
        [],
        ['Hall Name', 'Capacity', 'Occupied', 'Seat No.', 'Roll Number', 'Department', 'Row', 'Column']
    ];
    
    Object.values(hallGroups).forEach(hall => {
        if (hall.students.length === 0) return;
        
        hall.students.sort((a, b) => a.seatNumber - b.seatNumber).forEach((student, index) => {
            if (index === 0) {
                data.push([hall.hallName, hall.capacity, hall.students.length, student.seatNumber, student.rollNumber, student.department, student.rowNumber, student.columnNumber]);
            } else {
                data.push(['', '', '', student.seatNumber, student.rollNumber, student.department, student.rowNumber, student.columnNumber]);
            }
        });
        data.push([]); // Empty row between halls
    });
    
    return XLSX.utils.aoa_to_sheet(data);
}

function createDepartmentWorksheet(deptGroups, sessionInfo) {
    const data = [
        ['Department-wise Allocation Report', sessionInfo],
        [],
        ['Department', 'Roll Number', 'Hall', 'Seat Number', 'Row', 'Column']
    ];
    
    Object.entries(deptGroups).forEach(([deptName, students]) => {
        students.sort((a, b) => a.rollNumber.localeCompare(b.rollNumber)).forEach((student, index) => {
            const hall = halls.find(h => h.id === student.hallId);
            if (index === 0) {
                data.push([deptName, student.rollNumber, hall ? hall.name : 'Unknown', student.seatNumber, student.rowNumber, student.columnNumber]);
            } else {
                data.push(['', student.rollNumber, hall ? hall.name : 'Unknown', student.seatNumber, student.rowNumber, student.columnNumber]);
            }
        });
        data.push([]); // Empty row between departments
    });
    
    return XLSX.utils.aoa_to_sheet(data);
}

function createAttendanceWorksheet(students, sessionInfo) {
    const data = [
        ['Attendance Sheet', sessionInfo],
        [],
        ['Roll Number', 'Department', 'Hall', 'Seat Number', 'Row', 'Column', 'Signature']
    ];
    
    const sortedStudents = students.sort((a, b) => {
        const hallA = halls.find(h => h.id === a.hallId);
        const hallB = halls.find(h => h.id === b.hallId);
        return hallA.name.localeCompare(hallB.name) || a.seatNumber - b.seatNumber;
    });
    
    sortedStudents.forEach(student => {
        const hall = halls.find(h => h.id === student.hallId);
        data.push([
            student.rollNumber,
            student.department,
            hall ? hall.name : 'Unknown',
            student.seatNumber,
            student.rowNumber,
            student.columnNumber,
            '' // Signature column
        ]);
    });
    
    return XLSX.utils.aoa_to_sheet(data);
}

function createTicketsWorksheet(students, sessionInfo) {
    const data = [
        ['Hall Tickets', sessionInfo],
        [],
        ['Roll Number', 'Department', 'Session', 'Date', 'Time', 'Hall', 'Seat Number', 'Row', 'Column']
    ];
    
    students.forEach(student => {
        const hall = halls.find(h => h.id === student.hallId);
        const session = sessions.find(s => s.id === student.sessionId);
        data.push([
            student.rollNumber,
            student.department,
            session.name,
            formatDate(session.date),
            `${session.startTime} - ${session.endTime}`,
            hall ? hall.name : 'Unknown',
            student.seatNumber,
            student.rowNumber,
            student.columnNumber
        ]);
    });
    
    return XLSX.utils.aoa_to_sheet(data);
}

// Utility functions
function showStatus(elementId, message, type) {
    const statusElement = document.getElementById(elementId);
    statusElement.innerHTML = `
        <div class="status-${type}">
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
            ${message}
        </div>
    `;
    statusElement.style.display = 'block';
    
    // Auto hide after 5 seconds
    setTimeout(() => {
        statusElement.style.display = 'none';
    }, 5000);
}

// Local storage functions
function saveDataToStorage() {
    localStorage.setItem('examHalls', JSON.stringify(halls));
    localStorage.setItem('examDepartments', JSON.stringify(departments));
    localStorage.setItem('examSessions', JSON.stringify(sessions));
    localStorage.setItem('examAllocations', JSON.stringify(allocations));
}

function loadDataFromStorage() {
    const storedHalls = localStorage.getItem('examHalls');
    const storedDepartments = localStorage.getItem('examDepartments');
    const storedSessions = localStorage.getItem('examSessions');
    const storedAllocations = localStorage.getItem('examAllocations');
    
    if (storedHalls) {
        halls = JSON.parse(storedHalls);
    }
    
    if (storedDepartments) {
        departments = JSON.parse(storedDepartments);
    }
    
    if (storedSessions) {
        sessions = JSON.parse(storedSessions);
    }
    
    if (storedAllocations) {
        allocations = JSON.parse(storedAllocations);
    }
    
    // Update UI components after loading
    updateSessionsList();
    updateSessionSelects();
}
