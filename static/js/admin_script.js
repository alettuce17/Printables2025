document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelectorAll('.admin-nav .nav-link');
    const adminSections = document.querySelectorAll('.admin-section');
    const logoutButton = document.getElementById('logoutButton');
    const refreshPrintersButton = document.getElementById('refreshPrintersButton');
    const showClearUploadsModalButton = document.getElementById('showClearUploadsModalButton');
    const clearUploadsMessage = document.getElementById('clearUploadsMessage');
    const confirmationModal = document.getElementById('confirmationModal');
    const modalConfirmButton = document.getElementById('modalConfirmButton');
    const modalCancelButton = document.getElementById('modalCancelButton');

    const API_BASE_URL = '/api/admin';

    // --- Inactivity Logout Logic ---
    let inactivityTimer;
    const LOGOUT_TIME = 15 * 60 * 1000; // 15 minutes

    async function logoutUser() {
        await fetch('/api/admin/logout', { method: 'POST' });
        alert("You have been automatically logged out due to inactivity.");
        window.location.href = '/admin';
    }

    function resetInactivityTimer() {
        clearTimeout(inactivityTimer);
        inactivityTimer = setTimeout(logoutUser, LOGOUT_TIME);
    }

    document.addEventListener('mousemove', resetInactivityTimer);
    document.addEventListener('keypress', resetInactivityTimer);
    document.addEventListener('click', resetInactivityTimer);

    // --- Navigation ---
    function showSection(targetId) {
        adminSections.forEach(section => section.classList.remove('active-section'));
        navLinks.forEach(nav => nav.classList.remove('active-link'));
        const targetSection = document.getElementById(targetId);
        const targetLink = document.querySelector(`.nav-link[data-target="${targetId}"]`);
        if (targetSection) targetSection.classList.add('active-section');
        if (targetLink) targetLink.classList.add('active-link');
    }

    navLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.dataset.target;
            showSection(targetId);
            loadSectionData(targetId);
        });
    });

    // --- Data Loading Functions ---
    function loadSectionData(sectionId) {
        const tableElement = document.querySelector(`#${sectionId} table`);
        switch (sectionId) {
            case 'dashboardSection':
                loadDashboardData();
                break;
            case 'pricingSection':
                loadPricing();
                break;
            case 'settingsSection':
                loadSystemSettings();
                break;
            case 'reportsSection':
                // This section is loaded on button click, not on navigation
                break;
            default:
                if (sectionId.endsWith('Section') && tableElement) {
                    const resource = sectionId.replace('Section', '');
                    loadTableData(resource, tableElement);
                }
                break;
        }
    }

    async function loadDashboardData() {
        try {
            const response = await fetch(`${API_BASE_URL}/dashboard_summary`);
            if (!response.ok) throw new Error('Failed to fetch dashboard summary');
            const data = await response.json();
            document.getElementById('summaryRevenue').textContent = `₱${data.total_revenue.toFixed(2)}`;
            document.getElementById('summaryPrintJobs').textContent = data.total_jobs;
            document.getElementById('summaryErrors').textContent = data.unresolved_errors;
            document.getElementById('summaryRefunds').textContent = data.pending_refunds;
            loadPrinterStatus();
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    async function loadPrinterStatus() {
        const container = document.getElementById('printerStatusContainer').querySelector('ul');
        container.innerHTML = '<li>Loading printer list...</li>';
        try {
            const response = await fetch('/api/printer_status');
            if (!response.ok) throw new Error('Failed to fetch printer status');
            const printers = await response.json();
            container.innerHTML = '';
            if (printers.length === 0) {
                container.innerHTML = '<li>No printers found.</li>';
                return;
            }
            printers.forEach(printer => {
                const li = document.createElement('li');
                let printerNameHtml = `<span><i class="fas fa-print"></i> ${printer.name}</span>`;
                if (printer.is_default) {
                    printerNameHtml += '<span class="default-badge">Default</span>';
                }
                li.innerHTML = printerNameHtml;
                container.appendChild(li);
            });
        } catch (error) {
            console.error('Error loading printer status:', error);
            container.innerHTML = `<li style="color: red;">Error: ${error.message}</li>`;
        }
    }
    
    refreshPrintersButton.addEventListener('click', loadPrinterStatus);

    async function loadTableData(resource, tableElement) {
        try {
            const response = await fetch(`${API_BASE_URL}/data/${resource}`);
            if (!response.ok) throw new Error(`Failed to fetch ${resource}`);
            const data = await response.json();
            const thead = tableElement.querySelector('thead');
            const tbody = tableElement.querySelector('tbody');
            thead.innerHTML = '';
            tbody.innerHTML = '';
            if (data.length === 0) {
                thead.innerHTML = '<tr><th>Info</th></tr>';
                tbody.innerHTML = `<tr><td colspan="100%">No data available.</td></tr>`;
                return;
            }
            const headers = Object.keys(data[0]);
            thead.innerHTML = `<tr>${headers.map(h => `<th>${h.replace(/_/g, ' ')}</th>`).join('')}</tr>`;
            
            if (resource === 'refundRequests') {
                renderInteractiveTable(tbody, headers, data, 'status', ['pending', 'approved', 'rejected'], updateRefundStatus);
            } else if (resource === 'errorReports') {
                renderInteractiveTable(tbody, headers, data, 'status', ['unresolved', 'resolved'], updateErrorReportStatus);
            } else {
                data.forEach(row => {
                    const tr = document.createElement('tr');
                    tr.innerHTML = headers.map(h => `<td>${row[h] === null ? 'N/A' : row[h]}</td>`).join('');
                    tbody.appendChild(tr);
                });
            }
        } catch (error) {
            console.error(`Error loading ${resource}:`, error);
        }
    }

    function renderInteractiveTable(tbody, headers, data, statusColumn, statusOptions, updateFunction) {
        tbody.innerHTML = ''; // Clear previous content
        data.forEach(row => {
            const tr = document.createElement('tr');
            headers.forEach(header => {
                const td = document.createElement('td');
                if (header === statusColumn) {
                    const select = document.createElement('select');
                    select.className = 'status-select';
                    select.dataset.id = row.id;
                    
                    statusOptions.forEach(status => {
                        const option = document.createElement('option');
                        option.value = status;
                        option.textContent = status.charAt(0).toUpperCase() + status.slice(1);
                        if (row.status === status) {
                            option.selected = true;
                        }
                        select.appendChild(option);
                    });
                    td.appendChild(select);
                } else {
                    td.textContent = row[header] === null ? 'N/A' : row[header];
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });

        tbody.addEventListener('change', (e) => {
            if (e.target.classList.contains('status-select')) {
                const id = e.target.dataset.id;
                const newStatus = e.target.value;
                updateFunction(id, newStatus, e.target);
            }
        });
    }

    async function updateRefundStatus(id, newStatus, selectElement) {
        await updateStatus('refund_requests', id, newStatus, selectElement);
    }

    async function updateErrorReportStatus(id, newStatus, selectElement) {
        await updateStatus('error_reports', id, newStatus, selectElement);
    }

    async function updateStatus(resource, id, newStatus, selectElement) {
        try {
            const response = await fetch(`${API_BASE_URL}/${resource}/${id}/status`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: newStatus })
            });
            if (!response.ok) throw new Error('Failed to update status.');
            
            selectElement.style.backgroundColor = '#d4edda';
            setTimeout(() => {
                selectElement.style.backgroundColor = '';
            }, 1500);
        } catch (error) {
            console.error(`Error updating ${resource} status:`, error);
            alert('Could not update status. Please try again.');
            loadSectionData(`${resource}Section`); 
        }
    }

    async function loadPricing() {
        const container = document.getElementById('pricingTiersContainer');
        try {
            const response = await fetch(`${API_BASE_URL}/pricing`);
            if (!response.ok) throw new Error('Failed to fetch pricing');
            const tiers = await response.json();
            container.innerHTML = '';
            tiers.forEach(tier => {
                const el = document.createElement('div');
                el.className = 'form-group';
                el.innerHTML = `
                    <label for="tier-${tier.id}">${tier.tier_name}</label>
                    <input type="hidden" name="id" value="${tier.id}">
                    <input type="number" name="cost" value="${tier.cost}" step="0.01" required>
                `;
                container.appendChild(el);
            });
        } catch (error) {
            container.innerHTML = `<p style="color:red;">${error.message}</p>`;
        }
    }
    
    async function loadSystemSettings() {
        const form = document.getElementById('systemSettingsForm');
        const printerSelect = document.getElementById('defaultPrinterName');
        const messageEl = document.getElementById('settingsUpdateMessage');
        messageEl.textContent = '';

        try {
            const [settingsRes, printersRes] = await Promise.all([
                fetch(`${API_BASE_URL}/settings`),
                fetch('/api/printer_status')
            ]);

            if (!settingsRes.ok || !printersRes.ok) throw new Error('Failed to load settings or printer list.');

            const settings = await settingsRes.json();
            const printers = await printersRes.json();

            form.querySelector('#kioskName').value = settings.kiosk_name || '';
            form.querySelector('#maxWifiFiles').value = settings.max_wifi_files || 5;
            form.querySelector('#maxFileSizeMb').value = settings.max_file_size_mb || 25;
            form.querySelector('#sumatraPath').value = settings.sumatra_pdf_path || '';

            printerSelect.innerHTML = '<option value="">-- System Default --</option>';
            printers.forEach(printer => {
                if (printer.name) {
                    const option = new Option(printer.name, printer.name);
                    option.selected = (printer.name === settings.default_printer_name);
                    printerSelect.add(option);
                }
            });

        } catch (error) {
            messageEl.textContent = `Error loading settings: ${error.message}`;
            messageEl.style.color = 'red';
        }
    }
    
    // --- Form Submissions ---
    document.getElementById('pricingForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageEl = document.getElementById('pricingUpdateMessage');
        const tiers = Array.from(document.querySelectorAll('#pricingTiersContainer .form-group')).map(el => ({
            id: el.querySelector('[name="id"]').value,
            cost: el.querySelector('[name="cost"]').value
        }));
        
        try {
            const response = await fetch(`${API_BASE_URL}/pricing`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(tiers)
            });
            const result = await response.json();
            messageEl.textContent = result.message || result.error;
            messageEl.style.color = result.success ? 'green' : 'red';
        } catch (error) {
            messageEl.textContent = 'An error occurred.';
            messageEl.style.color = 'red';
        }
    });

    document.getElementById('systemSettingsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const messageEl = document.getElementById('settingsUpdateMessage');
        const form = e.target;
        const data = Object.fromEntries(new FormData(form));

        messageEl.textContent = 'Saving...';
        messageEl.style.color = '#333';

        try {
            const response = await fetch(`${API_BASE_URL}/settings`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            const result = await response.json();
            if (result.success) {
                messageEl.textContent = 'Settings saved successfully!';
                messageEl.style.color = 'green';
            } else {
                throw new Error(result.error || 'Failed to save settings.');
            }
        } catch (error) {
            messageEl.textContent = `Error: ${error.message}`;
            messageEl.style.color = 'red';
        }
    });

    // --- Report Generation Logic ---
    const generateReportButton = document.getElementById('generateReportButton');
    const reportOutput = document.getElementById('report-output');
    const reportTable = document.getElementById('reportTable');
    const summaryTitle = document.getElementById('summaryTitle');
    const summaryValue = document.getElementById('summaryValue');
    const contactDeveloperLink = document.getElementById('contactDeveloperLink');
    const reportTypeSelect = document.getElementById('reportType');
    const departmentFilterContainer = document.getElementById('departmentFilterContainer');
    const departmentSelect = document.getElementById('departmentSelect');

    const today = new Date().toISOString().split('T')[0];
    document.getElementById('startDate').value = today;
    document.getElementById('endDate').value = today;

    async function loadDepartments() {
        try {
            const response = await fetch(`${API_BASE_URL}/departments`);
            if (!response.ok) throw new Error('Failed to load departments');
            const departments = await response.json();
            departments.forEach(dept => {
                const option = new Option(dept, dept);
                departmentSelect.add(option);
            });
        } catch (error) {
            console.error('Error loading departments:', error);
        }
    }

    reportTypeSelect.addEventListener('change', () => {
        if (reportTypeSelect.value === 'users') {
            departmentFilterContainer.style.display = 'block';
        } else {
            departmentFilterContainer.style.display = 'none';
        }
    });

    generateReportButton.addEventListener('click', async () => {
        const reportType = document.getElementById('reportType').value;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        const department = document.getElementById('departmentSelect').value;

        if (!startDate || !endDate) {
            alert('Please select a start and end date.');
            return;
        }

        try {
            const response = await fetch('/api/admin/reports', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    report_type: reportType, 
                    start_date: startDate, 
                    end_date: endDate,
                    department: department
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Failed to generate report.');
            }

            const result = await response.json();
            displayReport(result);

        } catch (error) {
            console.error('Report generation error:', error);
            alert(error.message);
        }
    });

    function displayReport(result) {
        reportTable.querySelector('thead').innerHTML = '';
        reportTable.querySelector('tbody').innerHTML = '';

        if (result.data.length === 0) {
            reportOutput.classList.remove('hidden');
            summaryTitle.textContent = 'No Data Found';
            summaryValue.textContent = 'There is no data for the selected criteria.';
            if(contactDeveloperLink) updateContactLink(true);
            return;
        }

        summaryTitle.textContent = result.summary.title;
        summaryValue.textContent = result.summary.value;

        const thead = reportTable.querySelector('thead');
        const headerRow = document.createElement('tr');
        result.headers.forEach(headerText => {
            const th = document.createElement('th');
            th.textContent = headerText;
            headerRow.appendChild(th);
        });
        thead.appendChild(headerRow);

        const tbody = reportTable.querySelector('tbody');
        result.data.forEach(rowData => {
            const row = document.createElement('tr');
            result.headers.forEach(header => {
                const td = document.createElement('td');
                td.textContent = rowData[header] !== null ? rowData[header] : 'N/A';
                row.appendChild(td);
            });
            tbody.appendChild(row);
        });

        reportOutput.classList.remove('hidden');
        if(contactDeveloperLink) updateContactLink(false, result);
    }

    function updateContactLink(noData, result = null) {
        if (!contactDeveloperLink) return;
        const reportTypeEl = document.getElementById('reportType');
        const reportName = reportTypeEl.options[reportTypeEl.selectedIndex].text;
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;
        
        let message;
        if (noData) {
            message = `Hello! I generated a "${reportName}" from ${startDate} to ${endDate}, but it returned no data. Can you please check if this is correct?`;
        } else {
            message = `Hello! I have a question about a report. Details:
- Report Type: ${reportName}
- Date Range: ${startDate} to ${endDate}
- ${result.summary.title}: ${result.summary.value}
My question is: [Please type your question here]`;
        }

        const messengerLink = `https://m.me/61579102365472?text=${encodeURIComponent(message)}`;
        contactDeveloperLink.href = messengerLink;
    }

    // --- Maintenance Modal Logic ---
    showClearUploadsModalButton.addEventListener('click', () => confirmationModal.classList.remove('hidden'));
    modalCancelButton.addEventListener('click', () => confirmationModal.classList.add('hidden'));

    modalConfirmButton.addEventListener('click', async () => {
        confirmationModal.classList.add('hidden');
        clearUploadsMessage.textContent = 'Deleting...';
        clearUploadsMessage.style.color = '#333';
        
        try {
            const response = await fetch(`${API_BASE_URL}/clear_uploads`, { method: 'POST' });
            const result = await response.json();
            if (response.ok && result.success) {
                clearUploadsMessage.textContent = result.message;
                clearUploadsMessage.style.color = 'green';
            } else {
                throw new Error(result.error || result.message || 'An unknown error occurred.');
            }
        } catch (error) {
            clearUploadsMessage.textContent = `Error: ${error.message}`;
            clearUploadsMessage.style.color = 'red';
        }
    });

    // --- Logout ---
    logoutButton.addEventListener('click', async () => {
        await fetch('/api/admin/logout', { method: 'POST' });
        window.location.href = '/admin';
    });

    // --- Initial Load ---
    showSection('dashboardSection');
    loadDashboardData();
    loadDepartments();
    resetInactivityTimer();
});
