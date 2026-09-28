document.addEventListener('DOMContentLoaded', () => {
    // --- Phase Screen Elements ---
    const initialStartScreen = document.getElementById('initialStartScreen');
    const fileSourceScreen = document.getElementById('fileSourceScreen');
    const wifiUploadScreen = document.getElementById('wifiUploadScreen');
    const optionalInfoScreen = document.getElementById('optionalInfoScreen');
    const appContainer = document.getElementById('appContainer');
    const transactionSummaryScreen = document.getElementById('transactionSummaryScreen');

    // --- Buttons for Phase Transitions ---
    const initialStartButton = document.getElementById('initialStartButton');
    const usbSourceButton = document.getElementById('usbSourceButton');
    const wifiSourceButton = document.getElementById('wifiSourceButton');
    const wifiContinueButton = document.getElementById('wifiContinueButton');
    const proceedWithInfoButton = document.getElementById('proceedWithInfoButton');
    const returnToWelcomeButton = document.getElementById('returnToWelcomeButton');
    const returnToFileSourceButton = document.getElementById('returnToFileSourceButton');
    const returnToSourceFromWifi = document.getElementById('returnToSourceFromWifi');
    const returnToSourceFromAppButton = document.getElementById('returnToSourceFromAppButton');
    const resetSessionButton = document.getElementById('resetSessionButton');

    // --- Optional Info Form Elements ---
    const optionalStudentIdInput = document.getElementById('optionalStudentId');
    const optionalFullNameInput = document.getElementById('optionalFullName');
    const optionalDepartmentSelect = document.getElementById('optionalDepartment');
    const optionalCourseSelect = document.getElementById('optionalCourse');
    const optionalInfoMessage = document.getElementById('optionalInfoMessage');

    // --- Main App DOM Elements ---
    const userWelcomeMessage = document.getElementById('userWelcomeMessage');
    const fileBrowserPanel = document.getElementById('fileBrowserPanel');
    const selectedFilesListUl = document.getElementById('selectedFilesList');
    const selectedFileCountSpan = document.getElementById('selectedFileCount');
    const printSelectedButton = document.getElementById('printSelectedButton');
    const uploadUrlDisplay = document.getElementById('uploadUrl');
    const qrCodeContainer = document.getElementById('qrcode');
    const fileListUl = document.getElementById('fileList');
    const currentPathDisplay = document.getElementById('currentPathDisplay');
    const goUpButton = document.getElementById('goUpButton');
    const goBackButton = document.getElementById('goBackButton');
    const emptyFolderMessage = document.getElementById('emptyFolderMessage');
    const pdfPreviewFrame = document.getElementById('pdfPreviewFrame');
    const noFilePreviewMessage = document.getElementById('noFilePreviewMessage');
    const previewWrapper = document.getElementById('preview-wrapper');

    // --- Modals ---
    const paperInstructionModal = document.getElementById('paperInstructionModal');
    const proceedToPaymentButton = document.getElementById('proceedToPaymentButton');
    const cancelInstructionButton = document.getElementById('cancelInstructionButton');
    const coinPaymentModal = document.getElementById('coinPaymentModal');
    const modalFileCount = document.getElementById('modalFileCount');
    const modalPageCount = document.getElementById('modalPageCount');
    const modalTotalCoinsRequired = document.getElementById('modalTotalCoinsRequired');
    const modalCoinsAcceptedDisplay = document.getElementById('modalCoinsAcceptedDisplay');
    const modalChangeDue = document.getElementById('modalChangeDue');
    const paymentModalError = document.getElementById('paymentModalError');
    const confirmPaymentAndPrintButton = document.getElementById('confirmPaymentAndPrintButton');
    const cancelPaymentModalButton = document.getElementById('cancelPaymentModalButton');
    const reportIssueModal = document.getElementById('reportIssueModal');
    const reportIssueForm = document.getElementById('reportIssueForm');
    const cancelReportIssueButton = document.getElementById('cancelReportIssueButton');
    const issueJobIdInput = document.getElementById('issueJobId');
    const issueSessionIdInput = document.getElementById('issueSessionId');
    const reportIssueMessage = document.getElementById('reportIssueMessage');
    const changeModal = document.getElementById('changeModal');
    const changeAmountDue = document.getElementById('changeAmountDue');
    const dispenseChangeButton = document.getElementById('dispenseChangeButton');
    const donateChangeButton = document.getElementById('donateChangeButton');
    const contactDeveloperBtn = document.getElementById('contactDeveloperBtn');
    const contactDeveloperModal = document.getElementById('contactDeveloperModal');
    const closeContactModalButton = document.getElementById('closeContactModalButton');
    const contactQrCodeContainer = document.getElementById('contactQrCode');
    const sessionDetailsForReport = document.getElementById('sessionDetailsForReport');

    // --- Drive Selection Modal Elements ---
    const driveSelectionModal = document.getElementById('driveSelectionModal');
    const driveListUl = document.getElementById('driveListUl');
    const driveScanMessage = document.getElementById('driveScanMessage');
    const selectDriveButton = document.getElementById('selectDriveButton');
    const cancelDriveSelectButton = document.getElementById('cancelDriveSelectButton');

    // --- Transaction Summary Screen Elements ---
    const summaryFileCount = document.getElementById('summaryFileCount');
    const summaryTotalCost = document.getElementById('summaryTotalCost');
    const summaryFinishButton = document.getElementById('summaryFinishButton');
    const summaryReportIssueButton = document.getElementById('summaryReportIssueButton');
    const summaryPrintAnotherButton = document.getElementById('summaryPrintAnotherButton');
    const sessionTimeoutCountdown = document.getElementById('sessionTimeoutCountdown');
    const wifiTimeoutCountdown = document.getElementById('wifiTimeoutCountdown');
    const appTimeoutCountdown = document.getElementById('appTimeoutCountdown');

    // --- UI Feedback ---
    const loadingIndicator = document.getElementById('loadingIndicator');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorDisplay = document.getElementById('errorDisplay');

    // --- API Configuration ---
    const API_BASE_URL = '/api';

    // --- State Variables ---
    let currentUser = null;
    let currentSessionId = null;
    let selectedFilesForPrint = new Map();
    let navigationHistory = [];
    let sessionTimeoutInterval = null;
    let lastJobId = null;
    let uploadCheckInterval = null;
    let currentUploadMethod = null;
    let tempSelectedDrivePath = null;
    let finalSelectedDrivePath = null;
    let eventSource = null;
    let totalCoinsInserted = 0;

    // --- Department and Course Data ---
    const departmentData = {
        "Graduate School": ["Doctor in Business Administration", "Doctor of Public Administration", "Doctor of Education", "Master in Public Administration", "Master in Business Administration", "Master in Management", "Master of Arts in Education", "Master in Information Technology"],
        "College of Business and Public Administration (CBPA)": ["Bachelor in Public Administration", "Bachelor of Science in Hospitality Management", "Bachelor of Science in Accountancy", "Bachelor of Science in Office Administration", "Bachelor of Science in Entrepreneurship", "Bachelor of Science in Business Administration"],
        "College of Arts and Sciences (CAS)": ["Bachelor of Science in Development Communication", "Bachelor of Science in Applied Mathematics", "Bachelor of Science in Biology", "Bachelor of Arts in English Language Studies", "Bachelor of Arts in History", "Bachelor of Arts in Sociology"],
        "College of Engineering (COENG)": ["Bachelor of Science in Civil Engineering", "Bachelor of Science in Electrical Engineering", "Bachelor of Science in Mechanical Engineering"],
        "College of Computing and Multimedia Studies (CCMS)": ["Bachelor of Science in Information Technology", "Bachelor of Science in Information Systems"],
        "College of Education (Abaño Campus)": ["Bachelor of Secondary Education", "Bachelor of Elementary Education", "Bachelor of Technology and Livelihood Education", "Bachelor of Physical Education"],
        "Institute of Fisheries and Marine Sciences (Mercedes Campus)": ["Bachelor of Science in Fisheries"],
        "College of Agriculture & Natural Resources (Labo Campus)": ["Bachelor of Science in Agriculture", "Bachelor of Science in Environmental Science", "Bachelor of Science in Agricultural and Biosystems Engineering", "Bachelor of Agricultural Technology"],
        "College of Trades and Technology (Jose Panganiban Campus)": ["Bachelor of Technical-Vocational Teacher Education", "Bachelor of Science in Industrial Technology"],
        "Ret. Judge Antonio C. Entienza Campus (Sta. Elena Campus)": ["Bachelor of Secondary Education", "Bachelor in Elementary Education", "Bachelor of Science in Entrepreneurship"]
    };

    // --- Keyboard Shortcuts ---
    function enterKioskMode() {
        const elem = document.documentElement;
        if (elem.requestFullscreen) {
            elem.requestFullscreen().catch(err => alert(`Error enabling full-screen mode: ${err.message}`));
        }
    }

    document.addEventListener('keydown', (e) => {
        if ((e.key === "Escape" || e.key === "F11") && document.fullscreenElement) {
            e.preventDefault();
        }
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'k') {
            e.preventDefault();
            enterKioskMode();
        }
        if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'a') {
            e.preventDefault();
            if (document.fullscreenElement) {
                document.exitFullscreen();
            }
            window.open('/admin', '_blank');
        }
    });

    // --- Utility Functions ---
    function showLoading(message = 'Loading...') {
        loadingMessage.textContent = message;
        loadingIndicator.classList.remove('hidden');
    }
    function hideLoading() {
        loadingIndicator.classList.add('hidden');
    }
    function showMessage(element, text, type = 'error', duration = 5000) {
        if (!element) return;
        element.textContent = text;
        element.className = 'message-area';
        element.classList.add(type);
        element.classList.remove('hidden');
        if (duration > 0) {
            setTimeout(() => element.classList.add('hidden'), duration);
        }
    }
    function formatBytes(bytes) {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    function getFileIconClass(fileName) {
        const lowerFileName = fileName.toLowerCase();
        if (lowerFileName.endsWith('.pdf')) return 'fas fa-file-pdf';
        if (lowerFileName.endsWith('.docx')) return 'fas fa-file-word';
        if (lowerFileName.endsWith('.xlsx')) return 'fas fa-file-excel';
        return 'fas fa-file';
    }

    function validatePageRange(rangeStr, maxPage) {
        if (!rangeStr.trim()) return { isValid: true, message: '' };
        if (!/^[0-9,\s-]*$/.test(rangeStr)) {
            return { isValid: false, message: 'Invalid characters. Use numbers, commas, and hyphens.' };
        }
        const parts = rangeStr.split(',');
        for (const part of parts) {
            const trimmedPart = part.trim();
            if (!trimmedPart) continue;
            if (trimmedPart.includes('-')) {
                const rangeParts = trimmedPart.split('-');
                if (rangeParts.length !== 2 || rangeParts[0] === '' || rangeParts[1] === '') {
                    return { isValid: false, message: `Invalid range format: "${trimmedPart}"` };
                }
                const start = parseInt(rangeParts[0], 10);
                const end = parseInt(rangeParts[1], 10);
                if (isNaN(start) || isNaN(end)) {
                    return { isValid: false, message: `Invalid numbers in range: "${trimmedPart}"` };
                }
                if (start > end) {
                    return { isValid: false, message: `Error: Start page (${start}) cannot be larger than end page (${end}).` };
                }
                if (start < 1 || end > maxPage) {
                    return { isValid: false, message: `Pages are out of bounds. Must be between 1 and ${maxPage}.` };
                }
            } else {
                const page = parseInt(trimmedPart, 10);
                if (isNaN(page)) {
                    return { isValid: false, message: `Invalid page number: "${trimmedPart}"` };
                }
                if (page < 1 || page > maxPage) {
                    return { isValid: false, message: `Page is out of bounds. Must be between 1 and ${maxPage}.` };
                }
            }
        }
        return { isValid: true, message: '' };
    }

    // --- Phase Transition and Session Management ---
    function showPhase(phaseToShow) {
        [initialStartScreen, fileSourceScreen, wifiUploadScreen, optionalInfoScreen, appContainer, transactionSummaryScreen].forEach(phase => phase.classList.remove('active'));
        if (phaseToShow) {
            phaseToShow.classList.add('active');
        }
    }

    function resetToWelcomeScreen() {
        if (currentSessionId) {
            fetch(`${API_BASE_URL}/session/end`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: currentSessionId })
            }).catch(err => console.error("Failed to notify server of session end:", err));
        }
        clearInterval(sessionTimeoutInterval);
        clearInterval(uploadCheckInterval);
        showPhase(initialStartScreen);
        currentUser = null;
        currentSessionId = null;
        lastJobId = null;
        selectedFilesForPrint.clear();
        navigationHistory = [];
        updateSelectedFilesList();
        currentPathDisplay.textContent = 'Please start a session.';
        fileListUl.innerHTML = '';
        pdfPreviewFrame.src = 'about:blank';
        pdfPreviewFrame.classList.add('hidden');
        noFilePreviewMessage.classList.remove('hidden');
    }

    function startInactivityTimer(duration, countdownElement, onTimeout) {
        clearInterval(sessionTimeoutInterval);
        let countdown = duration;
        const updateDisplay = () => {
            if (!countdownElement) return;
            if (countdownElement.id === 'sessionTimeoutCountdown') {
                countdownElement.textContent = countdown;
                return;
            }
            const minutes = Math.floor(countdown / 60);
            const seconds = countdown % 60;
            countdownElement.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        };
        updateDisplay();
        sessionTimeoutInterval = setInterval(() => {
            countdown--;
            updateDisplay();
            if (countdown <= 0) {
                clearInterval(sessionTimeoutInterval);
                onTimeout();
            }
        }, 1000);
    }

    initialStartButton.addEventListener('click', () => showPhase(fileSourceScreen));
    returnToWelcomeButton.addEventListener('click', () => showPhase(initialStartScreen));
    returnToFileSourceButton.addEventListener('click', () => showPhase(fileSourceScreen));
    returnToSourceFromWifi.addEventListener('click', () => {
        clearInterval(sessionTimeoutInterval);
        clearInterval(uploadCheckInterval);
        showPhase(fileSourceScreen);
    });
    returnToSourceFromAppButton.addEventListener('click', () => {
        clearInterval(sessionTimeoutInterval);
        showPhase(fileSourceScreen);
        
    });
    resetSessionButton.addEventListener('click', resetToWelcomeScreen);

    // --- File Source Selection Logic ---
    usbSourceButton.addEventListener('click', () => openDriveSelector());
    wifiSourceButton.addEventListener('click', () => {
        currentUploadMethod = 'wifi';
        showPhase(optionalInfoScreen);
        optionalStudentIdInput.focus();
    });

    // --- Drive selection modal functions ---
    async function openDriveSelector() {
        driveListUl.innerHTML = '';
        selectDriveButton.disabled = true;
        tempSelectedDrivePath = null;
        driveScanMessage.textContent = 'Scanning for drives...';
        driveScanMessage.style.display = 'block';
        driveSelectionModal.classList.remove('hidden');
        try {
            const response = await fetch(`${API_BASE_URL}/drives`);
            const drives = await response.json();
            if (drives.length > 0) {
                driveScanMessage.style.display = 'none';
                drives.forEach(drive => {
                    const li = document.createElement('li');
                    li.dataset.path = drive.path;
                    li.innerHTML = `<i class="fas fa-hdd"></i> <span>${drive.label}</span>`;
                    li.addEventListener('click', () => {
                        driveListUl.querySelectorAll('li').forEach(item => item.classList.remove('selected'));
                        li.classList.add('selected');
                        tempSelectedDrivePath = drive.path;
                        selectDriveButton.disabled = false;
                    });
                    driveListUl.appendChild(li);
                });
            } else {
                driveScanMessage.textContent = 'No drives found. Please insert a USB drive and try again.';
            }
        } catch (err) {
            driveScanMessage.textContent = `Error scanning drives: ${err.message}`;
        }
    }

    selectDriveButton.addEventListener('click', () => {
        if (tempSelectedDrivePath) {
            finalSelectedDrivePath = tempSelectedDrivePath;
            driveSelectionModal.classList.add('hidden');
            currentUploadMethod = 'usb';
            showPhase(optionalInfoScreen);
            optionalStudentIdInput.focus();
        }
    });

    cancelDriveSelectButton.addEventListener('click', () => {
        driveSelectionModal.classList.add('hidden');
    });

    // --- Department/Course Dropdown Logic ---
    function populateDepartments() {
        optionalDepartmentSelect.innerHTML = '<option value="">Select a Department...</option>';
        for (const dept in departmentData) {
            optionalDepartmentSelect.add(new Option(dept, dept));
        }
    }

    optionalDepartmentSelect.addEventListener('change', () => {
        const selectedDept = optionalDepartmentSelect.value;
        optionalCourseSelect.innerHTML = '<option value="">Select a Course...</option>';
        if (selectedDept && departmentData[selectedDept]) {
            departmentData[selectedDept].forEach(course => {
                optionalCourseSelect.add(new Option(course, course));
            });
            optionalCourseSelect.disabled = false;
        } else {
            optionalCourseSelect.disabled = true;
        }
    });

    // --- Session Start Logic ---
    proceedWithInfoButton.addEventListener('click', async () => {
        const studentId = optionalStudentIdInput.value.trim() || null;
        const fullName = optionalFullNameInput.value.trim() || null;
        const department = optionalDepartmentSelect.value || null;
        const course = optionalCourseSelect.value || null;
        showLoading("Creating session...");
        try {
            const newSessionId = `sess-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
            const response = await fetch(`${API_BASE_URL}/session/start`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    student_id: studentId,
                    full_name: fullName,
                    department,
                    course,
                    session_id: newSessionId
                })
            });
            const userData = await response.json();
            if (!response.ok) throw new Error(userData.error || "Failed to start session.");
            currentUser = userData;
            currentSessionId = newSessionId;
            userWelcomeMessage.textContent = `Welcome, ${currentUser.full_name}!`;
            if (currentUploadMethod === 'wifi') {
                setupWifiUploadScreen();
            } else if (currentUploadMethod === 'usb') {
                fileBrowserPanel.classList.remove('hidden');
                showPhase(appContainer);
                startInactivityTimer(180, appTimeoutCountdown, resetToWelcomeScreen);
                fetchAndDisplayPathContents(finalSelectedDrivePath);
            }
        } catch (err) {
            showMessage(optionalInfoMessage, err.message, 'error');
        } finally {
            hideLoading();
        }
    });

    async function setupWifiUploadScreen() {
        showLoading("Preparing Wi-Fi upload...");
        try {
            const serverInfoResponse = await fetch(`${API_BASE_URL}/server_info`);
            const serverInfo = await serverInfoResponse.json();
            const uploadURL = `http://${serverInfo.local_ip}:5000/upload?sid=${currentSessionId}`;
            uploadUrlDisplay.textContent = uploadURL;
            qrCodeContainer.innerHTML = '';
            new QRCode(qrCodeContainer, { text: uploadURL, width: 200, height: 200 });
            showPhase(wifiUploadScreen);
            startCheckingForUploads();
            startInactivityTimer(180, wifiTimeoutCountdown, () => showPhase(fileSourceScreen));
        } catch (err) {
            showMessage(errorDisplay, `Error setting up Wi-Fi upload: ${err.message}`);
        } finally {
            hideLoading();
        }
    }

    function startCheckingForUploads() {
        clearInterval(uploadCheckInterval);
        uploadCheckInterval = setInterval(async () => {
            try {
                const response = await fetch(`${API_BASE_URL}/check_uploads?sid=${currentSessionId}`);
                const files = await response.json();
                if (files.length > selectedFilesForPrint.size) {
                    files.forEach(file => {
                        if (!selectedFilesForPrint.has(file.path)) {
                            selectedFilesForPrint.set(file.path, {
                                name: file.name,
                                settings: { colorMode: 'auto', paperSize: 'A4', pageRange: '' }
                            });
                        }
                    });
                    updateSelectedFilesList();
                    wifiContinueButton.disabled = false;
                    startInactivityTimer(180, wifiTimeoutCountdown, () => showPhase(fileSourceScreen));
                }
            } catch (err) {
                console.error("Error checking for uploads:", err);
            }
        }, 3000);
    }

    wifiContinueButton.addEventListener('click', () => {
        clearInterval(sessionTimeoutInterval);
        clearInterval(uploadCheckInterval);
        fileBrowserPanel.classList.add('hidden');
        showPhase(appContainer);
        startInactivityTimer(180, appTimeoutCountdown, resetToWelcomeScreen);
    });

    // --- Drive, File, and Print Logic ---
    async function fetchAndDisplayPathContents(path) {
        if (currentUploadMethod === 'usb') {
            startInactivityTimer(180, appTimeoutCountdown, resetToWelcomeScreen);
        }
        showLoading('Loading files...');
        fileListUl.innerHTML = '';
        navigationHistory.push(path);
        currentPathDisplay.textContent = path;
        try {
            const response = await fetch(`${API_BASE_URL}/list_path?path=${encodeURIComponent(path)}`);
            const data = await response.json();
            if (data.items && data.items.length > 0) {
                emptyFolderMessage.classList.add('hidden');
                fileListUl.innerHTML = '';
                data.items.forEach(item => {
                    const li = document.createElement('li');
                    li.dataset.path = item.path;
                    li.dataset.type = item.type;
                    li.dataset.name = item.name;
                    const iconClass = item.type === 'folder' ? 'fas fa-folder' : getFileIconClass(item.name);
                    let itemHtml = `<i class="${iconClass} file-icon"></i><span class="item-name">${item.name}</span>`;
                    if (item.type === 'file') {
                        itemHtml = `<input type="checkbox" class="file-checkbox">` + itemHtml;
                        itemHtml += `<span class="item-size">${formatBytes(item.size)}</span>`;
                    }
                    li.innerHTML = itemHtml;
                    if (item.type === 'folder') {
                        li.addEventListener('click', () => fetchAndDisplayPathContents(item.path));
                    } else {
                        li.addEventListener('click', (e) => {
                            if (e.target.type !== 'checkbox') {
                                analyzeAndPreviewFile(item.path, item.name);
                            }
                        });
                    }
                    const checkbox = li.querySelector('.file-checkbox');
                    if (checkbox) {
                        if (selectedFilesForPrint.has(item.path)) checkbox.checked = true;
                        checkbox.addEventListener('change', () => handleFileCheckboxChange(checkbox, item));
                    }
                    fileListUl.appendChild(li);
                });
            } else {
                fileListUl.innerHTML = '';
                emptyFolderMessage.classList.remove('hidden');
            }
            if (data.parent_path) {
                goUpButton.classList.remove('hidden');
                goUpButton.dataset.path = data.parent_path;
            } else {
                goUpButton.classList.add('hidden');
            }
            if (navigationHistory.length > 1) {
                goBackButton.classList.remove('hidden');
            } else {
                goBackButton.classList.add('hidden');
            }
        } catch (err) {
            showMessage(errorDisplay, `Failed to list contents: ${err.message}`);
        } finally {
            hideLoading();
        }
    }

    goUpButton.addEventListener('click', () => {
        const rootPath = navigationHistory[0];
        if (rootPath) {
            navigationHistory = [];
            fetchAndDisplayPathContents(rootPath);
        }
    });

    goBackButton.addEventListener('click', () => {
        navigationHistory.pop();
        const previousPath = navigationHistory.pop();
        if (previousPath) {
            fetchAndDisplayPathContents(previousPath);
        }
    });

    function handleFileCheckboxChange(checkbox, item) {
        startInactivityTimer(180, appTimeoutCountdown, resetToWelcomeScreen);
        if (checkbox.checked) {
            selectedFilesForPrint.set(item.path, {
                name: item.name,
                settings: { colorMode: 'auto', paperSize: 'A4', pageRange: '' }
            });
        } else {
            selectedFilesForPrint.delete(item.path);
        }
        updateSelectedFilesList();
    }

    function updateSelectedFilesList() {
        selectedFilesListUl.innerHTML = '';
        if (selectedFilesForPrint.size > 0) {
            selectedFilesForPrint.forEach((fileInfo, path) => {
                const li = document.createElement('li');
                li.dataset.path = path;

                const itemHeader = document.createElement('div');
                itemHeader.className = 'selected-file-item-header';

                const fileNameSpan = document.createElement('span');
                fileNameSpan.className = 'file-name';
                fileNameSpan.textContent = fileInfo.name;
                fileNameSpan.title = path;
                fileNameSpan.addEventListener('click', () => analyzeAndPreviewFile(path, fileInfo.name));

                const removeBtn = document.createElement('button');
                removeBtn.className = 'remove-file-btn';
                removeBtn.innerHTML = '&times;';
                removeBtn.title = 'Remove file';
                removeBtn.addEventListener('click', () => {
                    startInactivityTimer(180, appTimeoutCountdown, resetToWelcomeScreen);
                    selectedFilesForPrint.delete(path);
                    const fileCheckbox = document.querySelector(`#fileList li[data-path="${CSS.escape(path)}"] .file-checkbox`);
                    if (fileCheckbox) fileCheckbox.checked = false;
                    updateSelectedFilesList();
                });

                itemHeader.appendChild(fileNameSpan);
                itemHeader.appendChild(removeBtn);
                li.appendChild(itemHeader);

                const settingsContainer = document.createElement('div');
                settingsContainer.className = 'print-settings-container';

                settingsContainer.innerHTML = `
                    <div class="setting-item">
                        <label>Color Mode</label>
                        <select class="setting-color-mode">
                            <option value="auto" ${fileInfo.settings.colorMode === 'auto' ? 'selected' : ''}>Auto (Color/B&W)</option>
                            <option value="bw" ${fileInfo.settings.colorMode === 'bw' ? 'selected' : ''}>Black & White Only</option>
                        </select>
                    </div>
                    <div class="setting-item">
                        <label>Paper Size</label>
                        <select class="setting-paper-size">
                            <option value="A4" ${fileInfo.settings.paperSize === 'A4' ? 'selected' : ''}>A4</option>
                            <option value="Letter" ${fileInfo.settings.paperSize === 'Letter' ? 'selected' : ''}>Letter</option>
                            <option value="Legal" ${fileInfo.settings.paperSize === 'Legal' ? 'selected' : ''}>Legal</option>
                        </select>
                    </div>
                    <div class="page-range-header" style="display: flex; justify-content: space-between; align-items: center; grid-column: 1 / -1;">
                        <label style="margin: 0; font-weight: 500;">Page Range</label>
                        <a href="#" class="page-range-switch" style="font-size: 0.8em; text-decoration: none;">Use Text Input</a>
                    </div>
                    <div class="setting-item full-width text-input-container">
                        <input type="text" class="setting-page-range" placeholder="All pages (e.g., 1-3, 5)" value="${fileInfo.settings.pageRange}">
                        <div class="page-range-error message-area error hidden" style="padding: 5px; font-size: 0.8em; margin-top: 5px;"></div>
                    </div>
                `;
                li.appendChild(settingsContainer);

                const resetTimer = () => startInactivityTimer(180, appTimeoutCountdown, resetToWelcomeScreen);

                settingsContainer.querySelector('.setting-color-mode').addEventListener('change', (e) => {
                    resetTimer();
                    fileInfo.settings.colorMode = e.target.value;
                    analyzeAndPreviewFile(path, fileInfo.name);
                });
                
                settingsContainer.querySelector('.setting-paper-size').addEventListener('change', (e) => {
                    resetTimer();
                    fileInfo.settings.paperSize = e.target.value;
                });

                if (fileInfo.analysis && fileInfo.analysis.page_costs) {
                    const pageRangeInput = settingsContainer.querySelector('.setting-page-range');
                    const textInputContainer = settingsContainer.querySelector('.text-input-container');
                    const switchLink = settingsContainer.querySelector('.page-range-switch');
                    const errorMessageDiv = settingsContainer.querySelector('.page-range-error');

                    const pageSelectionContainer = document.createElement('div');
                    pageSelectionContainer.className = 'page-selection-container';

                    fileInfo.analysis.page_costs.forEach((cost, index) => {
                        const pageNum = index + 1;
                        const pageId = `page-${path}-${pageNum}`;
                        const pageItem = document.createElement('div');
                        pageItem.className = 'page-item';
                        pageItem.innerHTML = `
                            <input type="checkbox" id="${pageId}" data-page="${pageNum}" checked>
                            <label for="${pageId}">Page ${pageNum}<span class="page-cost">₱${cost.toFixed(2)}</span></label>
                        `;
                        pageSelectionContainer.appendChild(pageItem);
                    });
                    li.appendChild(pageSelectionContainer);

                    textInputContainer.style.display = 'none';
                    pageSelectionContainer.style.display = 'block';

                    switchLink.addEventListener('click', (e) => {
                        e.preventDefault();
                        const isTextHidden = textInputContainer.style.display === 'none';
                        if (isTextHidden) {
                            textInputContainer.style.display = 'block';
                            pageSelectionContainer.style.display = 'none';
                            switchLink.textContent = 'Use Checkbox List';
                        } else {
                            textInputContainer.style.display = 'none';
                            pageSelectionContainer.style.display = 'block';
                            switchLink.textContent = 'Use Text Input';
                        }
                    });

                    pageSelectionContainer.addEventListener('change', () => {
                        resetTimer();
                        const checkedPages = Array.from(pageSelectionContainer.querySelectorAll('input:checked')).map(input => input.dataset.page);
                        const newRangeString = checkedPages.join(', ');
                        pageRangeInput.value = newRangeString;
                        fileInfo.settings.pageRange = newRangeString;
                    });

                    pageRangeInput.addEventListener('input', (e) => {
                        resetTimer();
                        const validation = validatePageRange(e.target.value, fileInfo.analysis.pageCount);

                        if (!validation.isValid) {
                            errorMessageDiv.textContent = validation.message;
                            errorMessageDiv.classList.remove('hidden');
                            pageRangeInput.style.borderColor = 'var(--error-color)';
                            printSelectedButton.disabled = true;
                        } else {
                            errorMessageDiv.classList.add('hidden');
                            pageRangeInput.style.borderColor = '';
                            const hasOtherErrors = document.querySelector('.page-range-error:not(.hidden)');
                            printSelectedButton.disabled = !!hasOtherErrors;
                        }

                        fileInfo.settings.pageRange = e.target.value;
                        const pagesToSelect = parsePageRange(e.target.value, fileInfo.analysis.pageCount);
                        const allCheckboxes = pageSelectionContainer.querySelectorAll('input[type="checkbox"]');
                        allCheckboxes.forEach(checkbox => {
                            const pageNum = parseInt(checkbox.dataset.page, 10);
                            checkbox.checked = pagesToSelect.includes(pageNum);
                        });
                    });
                }

                selectedFilesListUl.appendChild(li);
            });
        } else {
            selectedFilesListUl.innerHTML = '<li>No files selected.</li>';
        }
        selectedFileCountSpan.textContent = selectedFilesForPrint.size;
        printSelectedButton.disabled = selectedFilesForPrint.size === 0;
    }

    async function analyzeAndPreviewFile(filePath, fileName) {
        startInactivityTimer(180, appTimeoutCountdown, resetToWelcomeScreen);
        showLoading('Analyzing file...');
        noFilePreviewMessage.classList.add('hidden');
        pdfPreviewFrame.classList.add('hidden');
        try {
            const fileInfo = selectedFilesForPrint.get(filePath);
            if (!fileInfo) return;
            if (fileInfo.settings.colorMode === 'bw') {
                pdfPreviewFrame.classList.add('bw-preview');
            } else {
                pdfPreviewFrame.classList.remove('bw-preview');
            }
            const analysis = await getPaymentInfoForFile(filePath, fileName, fileInfo.settings);
            if (analysis.error) throw new Error(analysis.error);
            fileInfo.analysis = analysis;
            selectedFilesForPrint.set(filePath, fileInfo);
            updateSelectedFilesList();
            const lowerFileName = fileName.toLowerCase();
            if (lowerFileName.endsWith('.pdf')) {
                const previewUrl = `${API_BASE_URL}/get_file_blob?path=${encodeURIComponent(filePath)}`;
                pdfPreviewFrame.src = previewUrl;
                pdfPreviewFrame.classList.remove('hidden');
            } else if (lowerFileName.endsWith('.docx') || lowerFileName.endsWith('.xlsx')) {
                showLoading('Converting to PDF for preview...');
                const converted = await convertFileToPdf(filePath);
                if (converted.error) throw new Error(converted.error);
                const previewUrl = `${API_BASE_URL}/get_file_blob?path=${encodeURIComponent(converted.pdf_path)}`;
                pdfPreviewFrame.src = previewUrl;
                pdfPreviewFrame.classList.remove('hidden');
            } else {
                noFilePreviewMessage.textContent = 'Preview is not available for this file type.';
                noFilePreviewMessage.classList.remove('hidden');
            }
        } catch (err) {
            showMessage(errorDisplay, `Preview Error: ${err.message}`);
            noFilePreviewMessage.textContent = `Could not generate preview.`;
            noFilePreviewMessage.classList.remove('hidden');
        } finally {
            hideLoading();
        }
    }

    async function convertFileToPdf(originalPath) {
        try {
            const response = await fetch(`${API_BASE_URL}/convert_to_pdf`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: originalPath })
            });
            const result = await response.json();
            if (!response.ok) {
                throw new Error(result.error || 'Conversion failed on the server.');
            }
            return result;
        } catch (err) {
            return { error: err.message };
        }
    }

    function parsePageRange(rangeStr, maxPage) {
        if (!rangeStr || rangeStr.trim() === '') {
            return Array.from({ length: maxPage }, (_, i) => i + 1);
        }
        const pages = new Set();
        const parts = rangeStr.split(',');
        for (const part of parts) {
            if (part.includes('-')) {
                const [start, end] = part.split('-').map(Number);
                if (!isNaN(start) && !isNaN(end) && start <= end) {
                    for (let i = start; i <= end; i++) {
                        if (i > 0 && i <= maxPage) pages.add(i);
                    }
                }
            } else {
                const page = Number(part);
                if (!isNaN(page) && page > 0 && page <= maxPage) {
                    pages.add(page);
                }
            }
        }
        return Array.from(pages).sort((a, b) => a - b);
    }

    function startCoinListener() {
        if (eventSource) {
            eventSource.close();
        }
        totalCoinsInserted = 0;
        updateCoinDisplay();
        eventSource = new EventSource(`${API_BASE_URL}/payment/listen`);
        eventSource.onmessage = function(event) {
            const data = JSON.parse(event.data);
            if (data.coins) {
                totalCoinsInserted += data.coins;
                updateCoinDisplay();
            }
        };
        eventSource.onerror = function() {
            console.error("EventSource failed.");
            showMessage(paymentModalError, 'Coin acceptor connection lost.', 'error', 0);
            eventSource.close();
        };
    }

    function stopCoinListener() {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        fetch(`${API_BASE_URL}/payment/stop`, { method: 'POST' });
    }

    function updateCoinDisplay() {
        const totalRequired = parseFloat(modalTotalCoinsRequired.textContent) || 0;
        modalCoinsAcceptedDisplay.textContent = totalCoinsInserted.toFixed(2);
        if (totalCoinsInserted < totalRequired) {
            confirmPaymentAndPrintButton.disabled = true;
            modalChangeDue.textContent = "0.00";
            showMessage(paymentModalError, `Please insert ₱${(totalRequired - totalCoinsInserted).toFixed(2)} more.`, 'error', 0);
        } else {
            confirmPaymentAndPrintButton.disabled = false;
            const change = totalCoinsInserted - totalRequired;
            modalChangeDue.textContent = change.toFixed(2);
            paymentModalError.classList.add('hidden');
        }
    }

    printSelectedButton.addEventListener('click', () => {
        paperInstructionModal.classList.remove('hidden');
    });

    cancelInstructionButton.addEventListener('click', () => {
        paperInstructionModal.classList.add('hidden');
    });

    proceedToPaymentButton.addEventListener('click', async () => {
        paperInstructionModal.classList.add('hidden');
        clearInterval(sessionTimeoutInterval);
        if (!currentUser || !currentUser.id) {
            showMessage(errorDisplay, "Your session has expired. Please restart the application.", 'error', 0);
            return;
        }
        showLoading('Calculating total cost...');
        let totalCost = 0;
        let totalPagesToPrint = 0;
        const filesToPrintWithCost = [];
        for (const [path, fileInfo] of selectedFilesForPrint.entries()) {
            if (!fileInfo.analysis) {
                const analysis = await getPaymentInfoForFile(path, fileInfo.name, fileInfo.settings);
                if (analysis.error) {
                    showMessage(errorDisplay, `Could not analyze ${fileInfo.name}. It will be skipped.`);
                    continue;
                }
                fileInfo.analysis = analysis;
            }
            const pagesToPrint = parsePageRange(fileInfo.settings.pageRange, fileInfo.analysis.pageCount);
            let fileCost = 0;
            for (const pageNum of pagesToPrint) {
                if (fileInfo.analysis.page_costs[pageNum - 1] !== undefined) {
                    fileCost += fileInfo.analysis.page_costs[pageNum - 1];
                }
            }
            totalPagesToPrint += pagesToPrint.length;
            totalCost += fileCost;
            filesToPrintWithCost.push({
                path: path,
                cost: fileCost,
                settings: fileInfo.settings,
                pages: pagesToPrint.length
            });
        }
        hideLoading();
        if (filesToPrintWithCost.length > 0) {
            modalFileCount.textContent = filesToPrintWithCost.length;
            modalPageCount.textContent = totalPagesToPrint;
            modalTotalCoinsRequired.textContent = totalCost.toFixed(2);
            confirmPaymentAndPrintButton.dataset.filesToPrintJson = JSON.stringify(filesToPrintWithCost);
            coinPaymentModal.classList.remove('hidden');
            startCoinListener();
            updateCoinDisplay();
        } else {
            showMessage(errorDisplay, 'No valid files to print.');
        }
    });

    async function getPaymentInfoForFile(filePath, fileName, settings) {
        try {
            const fileBlobResponse = await fetch(`${API_BASE_URL}/get_file_blob?path=${encodeURIComponent(filePath)}`);
            if (!fileBlobResponse.ok) throw new Error('Could not fetch file data.');
            const fileBlob = await fileBlobResponse.blob();
            const formData = new FormData();
            formData.append('file', fileBlob, fileName);
            if (settings) {
                formData.append('settings', JSON.stringify(settings));
            }
            const analyzeResponse = await fetch(`${API_BASE_URL}/analyze`, { method: 'POST', body: formData });
            if (!analyzeResponse.ok) {
                const err = await analyzeResponse.json();
                throw new Error(err.error || 'Analysis failed.');
            }
            const result = await analyzeResponse.json();
            return result;
        } catch (err) {
            return { error: err.message, fileName };
        }
    }

    function hideCoinPaymentModal() {
        if (coinPaymentModal) {
            coinPaymentModal.classList.add('hidden');
        }
    }

    confirmPaymentAndPrintButton.addEventListener('click', async () => {
        stopCoinListener();
        const filesToPrint = JSON.parse(confirmPaymentAndPrintButton.dataset.filesToPrintJson);
        hideCoinPaymentModal();
        showLoading('Sending to printer...');
        const totalCost = parseFloat(modalTotalCoinsRequired.textContent);
        const amountPaid = totalCoinsInserted;
        const changeDue = parseFloat(modalChangeDue.textContent);
        try {
            const response = await fetch(`${API_BASE_URL}/print`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    files_to_print: filesToPrint,
                    user_id: currentUser.id,
                    session_id: currentSessionId,
                    total_cost: totalCost,
                    amount_paid: amountPaid,
                    change_due: changeDue
                })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Print command failed');
            hideLoading();
            lastJobId = result.last_job_id;
            if (result.status === "CHANGE_DUE") {
                showChangeModal(result.change_due, result.session_id);
            } else {
                showSummaryScreen(result.successful_prints.length, totalCost);
            }
        } catch (err) {
            hideLoading();
            showMessage(errorDisplay, `Print Error: ${err.message}`);
        }
    });

    cancelPaymentModalButton.addEventListener('click', () => {
        stopCoinListener();
        hideCoinPaymentModal();
        if (currentUploadMethod === 'usb' || currentUploadMethod === 'wifi') {
            startInactivityTimer(180, appTimeoutCountdown, resetToWelcomeScreen);
        }
    });

    function showChangeModal(amount, sessionId) {
        changeAmountDue.textContent = `₱${amount.toFixed(2)}`;
        const newDispenseButton = dispenseChangeButton.cloneNode(true);
        dispenseChangeButton.parentNode.replaceChild(newDispenseButton, dispenseChangeButton);
        const newDonateButton = donateChangeButton.cloneNode(true);
        donateChangeButton.parentNode.replaceChild(newDonateButton, donateChangeButton);
        newDispenseButton.addEventListener('click', () => handleUserChangeChoice('dispense', amount, sessionId));
        newDonateButton.addEventListener('click', () => handleUserChangeChoice('donate', amount, sessionId));
        changeModal.classList.remove('hidden');
    }

    async function handleUserChangeChoice(action, amount, sessionId) {
        showLoading(action === 'dispense' ? 'Dispensing change...' : 'Processing donation...');
        try {
            const response = await fetch(`${API_BASE_URL}/handle_change`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, action: action, amount: amount })
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to handle change.');
            changeModal.classList.add('hidden');
            const totalCost = parseFloat(modalTotalCoinsRequired.textContent);
            const successfulPrints = parseInt(modalFileCount.textContent);
            showSummaryScreen(successfulPrints, totalCost);
        } catch (err) {
            showMessage(document.getElementById('changeModalMessage'), err.message, 'error');
        } finally {
            hideLoading();
        }
    }

    function showSummaryScreen(fileCount, totalCost) {
        summaryFileCount.textContent = fileCount;
        summaryTotalCost.textContent = `₱${totalCost.toFixed(2)}`;
        showPhase(transactionSummaryScreen);
        startInactivityTimer(30, sessionTimeoutCountdown, resetToWelcomeScreen);
    }

    summaryFinishButton.addEventListener('click', resetToWelcomeScreen);
    summaryReportIssueButton.addEventListener('click', () => {
        clearInterval(sessionTimeoutInterval);
        document.getElementById('issueJobId').value = lastJobId || '';
        reportIssueModal.classList.remove('hidden');
    });
    cancelReportIssueButton.addEventListener('click', () => {
        reportIssueModal.classList.add('hidden');
        startInactivityTimer(30, sessionTimeoutCountdown, resetToWelcomeScreen);
    });
    reportIssueForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(reportIssueForm);
        const data = Object.fromEntries(formData.entries());
        data.user_id = currentUser ? currentUser.id : null;
        data.session_id = currentSessionId;
        showLoading('Submitting report...');
        try {
            const response = await fetch(`${API_BASE_URL}/report_issue`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (!response.ok) throw new Error(result.error || 'Failed to submit report.');
            alert('Report submitted successfully. Thank you.');
            reportIssueModal.classList.add('hidden');
            reportIssueForm.reset();
            startInactivityTimer(30, sessionTimeoutCountdown, resetToWelcomeScreen);
        } catch (err) {
            alert(`Error: ${err.message}`);
        } finally {
            hideLoading();
        }
    });

    if (contactDeveloperBtn) {
        contactDeveloperBtn.addEventListener('click', () => {
            contactQrCodeContainer.innerHTML = '';
            new QRCode(contactQrCodeContainer, {
                text: "https://m.me/61579102365472",
                width: 128,
                height: 128,
            });
            let detailsText = `Session ID:\n${currentSessionId || 'N/A'}`;
            if (lastJobId) {
                detailsText += `\n\nLast Job ID:\n${lastJobId}`;
            }
            sessionDetailsForReport.textContent = detailsText;
            contactDeveloperModal.classList.remove('hidden');
        });
    }

    if (closeContactModalButton) {
        closeContactModalButton.addEventListener('click', () => {
            contactDeveloperModal.classList.add('hidden');
        });
    }

    populateDepartments();
    showPhase(initialStartScreen);
});
