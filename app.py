import os
import platform
import mimetypes
import subprocess
import shutil
import json
import socket # For getting local IP
import time # For session timestamps
from flask import Flask, jsonify, request, send_file, abort, session, render_template, Response
from flask_cors import CORS
import mysql.connector
from mysql.connector import Error
import fitz  # PyMuPDF
from io import BytesIO
import tempfile
import psutil # For drive detection
import re # For parsing command output
from werkzeug.utils import secure_filename
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
import os

load_dotenv()

# --- GPIO Hardware Integration (for Raspberry Pi) ---
IS_RASPBERRY_PI = platform.machine() in ("armv7l", "aarch64")
if IS_RASPBERRY_PI:
    try:
        import RPi.GPIO as GPIO
        # --- GPIO Configuration ---
        COIN_PIN = 2
        RELAY_PIN = 27
        SENSOR_PIN = 22
        DEBOUNCE_TIME = 0.05

        # --- GPIO Setup ---
        GPIO.setmode(GPIO.BCM)
        GPIO.setup(COIN_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(SENSOR_PIN, GPIO.IN, pull_up_down=GPIO.PUD_UP)
        GPIO.setup(RELAY_PIN, GPIO.OUT, initial=GPIO.LOW)
    except (ImportError, RuntimeError) as e:
        print(f"Could not initialize GPIO: {e}. Hardware features will be disabled.")
        IS_RASPBERRY_PI = False


# --- Global variable to control the coin listening thread ---
coin_listener_active = False
active_sessions = {} # Tracks active user sessions

# --- Conditional import for Windows-specific libraries ---
if platform.system() == "Windows":
    try:
        import pythoncom
        import win32api
        import win32com.client
        import win32print
    except ImportError:
        print("pywin32 is not installed. DOCX processing and Windows-specific features will be disabled.")
        pythoncom, win32api, win32com, win32print = None, None, None, None
else:
    pythoncom, win32api, win32com, win32print = None, None, None, None

# --- Flask App Initialization ---
app = Flask(__name__, template_folder='templates', static_folder='static')
app.secret_key = os.getenv(
    'FLASK_SECRET_KEY',
    'a-much-stronger-secret-key-that-you-should-change'
)
CORS(app)

# --- System Configuration ---
DB_CONFIG = {
    'host': os.getenv('DB_HOST', 'localhost'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'print_system')
}
UPLOAD_FOLDER = os.path.join(os.getcwd(), 'uploads')
CONVERSION_CACHE_FOLDER = os.path.join(UPLOAD_FOLDER, 'conversion_cache')
ALLOWED_EXTENSIONS = {'pdf', 'docx', 'xlsx'}
SESSION_TIMEOUT_SECONDS = 180 # 3 minutes

# --- Global Settings Cache ---
SYSTEM_SETTINGS = {}

# --- Debugging Switch ---
DEBUG_SHOW_ALL_DRIVES = True

# --- Create necessary folders on startup ---
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)
if not os.path.exists(CONVERSION_CACHE_FOLDER):
    os.makedirs(CONVERSION_CACHE_FOLDER)

# --- Helper Functions ---
def get_db_connection():
    """Establishes a connection to the MySQL database."""
    try:
        conn = mysql.connector.connect(**DB_CONFIG)
        return conn
    except Error as e:
        app.logger.error(f"Error connecting to MySQL database: {e}")
        return None

def load_system_settings():
    """Loads all settings from the database into the global SYSTEM_SETTINGS dictionary."""
    global SYSTEM_SETTINGS
    conn = get_db_connection()
    
    fallback_settings = {
        'kiosk_name': 'Default Print Kiosk',
        'wifi_ssid': 'Default_Print_WiFi',
        'max_wifi_files': 5,
        'max_file_size_mb': 25,
        'default_printer_name': '',
        'sumatra_pdf_path': r"C:\Program Files\SumatraPDF\SumatraPDF.exe"
    }

    if not conn:
        SYSTEM_SETTINGS = fallback_settings
        app.logger.error("CRITICAL: Could not connect to DB, using fallback system settings.")
        return

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT setting_key, setting_value FROM system_settings")
        settings_from_db = {row['setting_key']: row['setting_value'] for row in cursor.fetchall()}
        
        SYSTEM_SETTINGS = fallback_settings.copy()
        SYSTEM_SETTINGS.update(settings_from_db)

        try:
            SYSTEM_SETTINGS['max_wifi_files'] = int(SYSTEM_SETTINGS.get('max_wifi_files'))
        except (ValueError, TypeError):
            SYSTEM_SETTINGS['max_wifi_files'] = fallback_settings['max_wifi_files']
        try:
            SYSTEM_SETTINGS['max_file_size_mb'] = int(SYSTEM_SETTINGS.get('max_file_size_mb'))
        except (ValueError, TypeError):
            SYSTEM_SETTINGS['max_file_size_mb'] = fallback_settings['max_file_size_mb']

        max_size = SYSTEM_SETTINGS['max_wifi_files'] * SYSTEM_SETTINGS['max_file_size_mb'] * 1024 * 1024
        app.config['MAX_CONTENT_LENGTH'] = max_size

        app.logger.info("System settings loaded successfully from database.")
    except Exception as e:
        SYSTEM_SETTINGS = fallback_settings
        app.logger.error(f"Failed to load system settings, using fallbacks. Error: {e}")
    finally:
        cursor.close()
        conn.close()

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_local_ip():
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    try:
        s.connect(('10.255.255.255', 1))
        IP = s.getsockname()[0]
    except Exception:
        IP = '127.0.0.1'
    finally:
        s.close()
    return IP

def get_drive_label_windows(drive_path_or_letter):
    if not win32api: return None
    try:
        mount_point_for_label = drive_path_or_letter
        if not mount_point_for_label.endswith('\\'):
            mount_point_for_label += '\\'
        label = win32api.GetVolumeInformation(mount_point_for_label)[0]
        return label if label else None
    except Exception as e:
        app.logger.warning(f"Error getting volume label for {drive_path_or_letter}: {e}")
        return None

# --- User Session & Authentication ---
@app.route('/api/session/start', methods=['POST'])
def start_session():
    data = request.get_json()
    student_id = data.get('student_id')
    full_name = data.get('full_name')
    department = data.get('department')
    course = data.get('course')
    
    session_id = data.get('session_id')
    if session_id:
        active_sessions[session_id] = time.time()
        app.logger.info(f"Session {session_id} started.")

    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        if student_id:
            cursor.execute("SELECT * FROM users WHERE student_id = %s", (student_id,))
            user = cursor.fetchone()
            if not user:
                cursor.execute(
                    "INSERT INTO users (student_id, full_name, department, course, role) VALUES (%s, %s, %s, %s, 'user')",
                    (student_id, full_name, department, course)
                )
                user_id = cursor.lastrowid
                conn.commit()
                cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                user = cursor.fetchone()
            return jsonify(user)
        else:
            guest_student_id = "guest_account"
            cursor.execute("SELECT * FROM users WHERE student_id = %s", (guest_student_id,))
            guest_user = cursor.fetchone()
            if not guest_user:
                cursor.execute(
                    "INSERT INTO users (student_id, full_name, role) VALUES (%s, %s, 'user')",
                    (guest_student_id, 'Guest User')
                )
                user_id = cursor.lastrowid
                conn.commit()
                cursor.execute("SELECT * FROM users WHERE id = %s", (user_id,))
                guest_user = cursor.fetchone()
            return jsonify(guest_user)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

# --- Admin Panel & Login ---
@app.route('/api/admin/login', methods=['POST'])
def admin_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT * FROM users WHERE student_id = %s AND role = 'admin'", (username,))
    admin_user = cursor.fetchone()
    cursor.close()
    conn.close()
    if admin_user and admin_user.get('password') and check_password_hash(admin_user['password'], password):
        session['admin_id'] = admin_user['id']
        session['admin_name'] = admin_user['full_name']
        return jsonify({"success": True, "message": "Login successful."})
    return jsonify({"success": False, "error": "Invalid username or password."}), 401

@app.route('/api/admin/logout', methods=['POST'])
def admin_logout():
    session.pop('admin_id', None)
    session.pop('admin_name', None)
    return jsonify({"success": True})

def is_admin_logged_in():
    return 'admin_id' in session

@app.route('/api/admin/dashboard_summary')
def get_dashboard_summary():
    if not is_admin_logged_in(): return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    summary = {}
    try:
        cursor.execute("SELECT SUM(total_cost) as total_revenue FROM transactions WHERE successful = 1")
        revenue = cursor.fetchone()
        summary['total_revenue'] = float(revenue['total_revenue']) if revenue['total_revenue'] else 0.0
        cursor.execute("SELECT COUNT(*) as total_jobs FROM print_jobs")
        jobs = cursor.fetchone()
        summary['total_jobs'] = jobs['total_jobs']
        cursor.execute("SELECT COUNT(*) as unresolved_errors FROM error_reports WHERE status = 'unresolved'")
        errors = cursor.fetchone()
        summary['unresolved_errors'] = errors['unresolved_errors']
        cursor.execute("SELECT COUNT(*) as pending_refunds FROM refund_requests WHERE status = 'pending'")
        refunds = cursor.fetchone()
        summary['pending_refunds'] = refunds['pending_refunds']
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
    return jsonify(summary)

@app.route('/api/admin/data/<resource>')
def get_admin_data(resource):
    if not is_admin_logged_in(): return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    allowed_resources = {
        "users": "users", "printJobs": "print_jobs", "transactions": "transactions",
        "errorReports": "error_reports", "refundRequests": "refund_requests", "adminLogs": "admin_logs"
    }
    if resource not in allowed_resources: return jsonify({"error": "Invalid resource requested"}), 400
    table_name = allowed_resources[resource]
    cursor.execute(f"SELECT * FROM {table_name} ORDER BY id DESC")
    data = cursor.fetchall()
    for row in data:
        for key, value in row.items():
            if hasattr(value, 'isoformat'): row[key] = value.isoformat()
    cursor.close()
    conn.close()
    return jsonify(data)

@app.route('/api/admin/pricing', methods=['GET', 'POST'])
def manage_pricing():
    if not is_admin_logged_in(): return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    if request.method == 'GET':
        cursor.execute("SELECT * FROM pricing ORDER BY id ASC")
        tiers = cursor.fetchall()
        cursor.close()
        conn.close()
        return jsonify(tiers)
    if request.method == 'POST':
        data = request.get_json()
        try:
            for tier in data:
                cursor.execute("UPDATE pricing SET cost = %s WHERE id = %s", (tier['cost'], tier['id']))
            conn.commit()
            message = {"success": True, "message": "Pricing updated successfully."}
        except Error as e:
            conn.rollback()
            message = {"success": False, "error": str(e)}
        finally:
            cursor.close()
            conn.close()
        return jsonify(message)

@app.route('/api/admin/settings', methods=['GET', 'POST'])
def manage_system_settings():
    if not is_admin_logged_in(): 
        return jsonify({"error": "Unauthorized"}), 401
    
    if request.method == 'GET':
        return jsonify(SYSTEM_SETTINGS)

    if request.method == 'POST':
        data = request.get_json()
        conn = get_db_connection()
        if not conn: 
            return jsonify({"error": "Database connection failed"}), 500
        cursor = conn.cursor()
        try:
            for key, value in data.items():
                cursor.execute(
                    "INSERT INTO system_settings (setting_key, setting_value) VALUES (%s, %s) ON DUPLICATE KEY UPDATE setting_value = %s",
                    (key, str(value), str(value))
                )
            conn.commit()
            load_system_settings()
            return jsonify({"success": True, "message": "Settings updated successfully."})
        except Error as e:
            conn.rollback()
            app.logger.error(f"Failed to save system settings: {e}")
            return jsonify({"success": False, "error": "Failed to save settings to the database."}), 500
        finally:
            cursor.close()
            conn.close()

def clear_directory(directory_path):
    if not os.path.exists(directory_path):
        return 0, []
        
    deleted_items = 0
    errors = []
    for filename in os.listdir(directory_path):
        if filename.lower() in ['.gitkeep', '.gitignore']:
            continue
        file_path = os.path.join(directory_path, filename)
        try:
            if os.path.isfile(file_path) or os.path.islink(file_path):
                os.unlink(file_path)
            elif os.path.isdir(file_path):
                shutil.rmtree(file_path)
            deleted_items += 1
        except Exception as e:
            app.logger.error(f"Failed to delete {file_path}. Reason: {e}")
            errors.append(filename)
    return deleted_items, errors

@app.route('/api/admin/clear_uploads', methods=['POST'])
def clear_uploads_folder():
    if not is_admin_logged_in():
        return jsonify({"error": "Unauthorized"}), 401

    deleted_main, errors_main = clear_directory(UPLOAD_FOLDER)
    deleted_cache, errors_cache = clear_directory(CONVERSION_CACHE_FOLDER)

    total_deleted = deleted_main + deleted_cache
    total_errors = len(errors_main) + len(errors_cache)

    if total_errors > 0:
        return jsonify({
            "success": False, 
            "message": f"Completed with {total_errors} errors. {total_deleted} items were deleted."
        })

    return jsonify({
        "success": True, 
        "message": f"Successfully cleared {total_deleted} items from session and cache folders."
    })

# --- Printer Status Functions ---
def get_printer_status_windows():
    if not win32print:
        return [{"name": "pywin32 library not found", "status": "Error", "is_default": False}]
    printers = []
    try:
        default_printer_name = win32print.GetDefaultPrinter()
        printer_info = win32print.EnumPrinters(win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS)
        for p in printer_info:
            name = p[2]
            printers.append({
                "name": name,
                "status": "Ready", 
                "is_default": name == default_printer_name
            })
    except Exception as e:
        printers.append({"name": f"Error fetching printers: {e}", "status": "Error", "is_default": False})
    return printers

def get_printer_status_linux():
    printers = []
    try:
        result = subprocess.run(['lpstat', '-p', '-d'], capture_output=True, text=True, check=True)
        output = result.stdout
        default_printer_name = None
        default_match = re.search(r"system default destination: ([\w-]+)", output)
        if default_match:
            default_printer_name = default_match.group(1)
        printer_matches = re.findall(r"printer ([\w-]+) is .*\. enabled since .*", output)
        for name in printer_matches:
            printers.append({
                "name": name,
                "status": "Ready",
                "is_default": name == default_printer_name
            })
    except (subprocess.CalledProcessError, FileNotFoundError):
        printers.append({"name": "CUPS not found or error.", "status": "Error", "is_default": False})
    return printers

@app.route('/api/printer_status')
def get_printer_status():
    printers = []
    if platform.system() == "Windows":
        printers = get_printer_status_windows()
    else:
        printers = get_printer_status_linux()
    return jsonify(printers)

# --- Frontend Rendering & API ---
@app.route('/admin')
def admin_panel():
    if is_admin_logged_in(): return render_template('admin.html')
    return render_template('admin_login.html')

@app.route('/')
def index():
    kiosk_name = SYSTEM_SETTINGS.get('kiosk_name', 'Quick Print')
    wifi_ssid = SYSTEM_SETTINGS.get('wifi_ssid', 'QuickPrint_WiFi')
    return render_template('index.html', shop_name=kiosk_name, wifi_ssid=wifi_ssid)

@app.route('/upload', methods=['GET', 'POST'])
def upload_file():
    session_id = request.args.get('sid')
    if not session_id:
        return "Error: Session ID is missing.", 400

    session_start_time = active_sessions.get(session_id)
    if not session_start_time:
        return jsonify({"error": "Session not found or has expired."}), 403

    if (time.time() - session_start_time) > SESSION_TIMEOUT_SECONDS:
        app.logger.warning(f"Upload blocked for expired session {session_id}. Cleaning up.")
        end_session_and_cleanup(session_id)
        return jsonify({"error": "Your upload session has timed out."}), 403

    if request.method == 'POST':
        if 'files' not in request.files:
            return jsonify({"error": "No files were sent."}), 400
        files = request.files.getlist('files')
        if len(files) == 0 or files[0].filename == '':
             return jsonify({"error": "No selected files."}), 400
        
        max_files = SYSTEM_SETTINGS.get('max_wifi_files', 5)
        if len(files) > max_files:
            return jsonify({"error": f"You can only upload up to {max_files} files at a time."}), 400
        
        session_upload_folder = os.path.join(UPLOAD_FOLDER, session_id)
        if not os.path.exists(session_upload_folder):
            os.makedirs(session_upload_folder)
            
        for file in files:
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                file_path = os.path.join(session_upload_folder, filename)
                file.save(file_path)
            else:
                return jsonify({"error": f"File type not allowed for '{file.filename}'."}), 400
        return jsonify({"message": f"{len(files)} file(s) uploaded successfully!"})
    
    kiosk_name = SYSTEM_SETTINGS.get('kiosk_name', 'Quick Print')
    max_files = SYSTEM_SETTINGS.get('max_wifi_files', 5)
    return render_template('upload.html', kiosk_name=kiosk_name, max_files=max_files)

def end_session_and_cleanup(session_id):
    """Deletes all files and folders associated with a given session ID."""
    if not session_id:
        return

    session_upload_folder = os.path.join(UPLOAD_FOLDER, session_id)
    if os.path.exists(session_upload_folder):
        try:
            shutil.rmtree(session_upload_folder)
            app.logger.info(f"Successfully deleted session folder: {session_upload_folder}")
        except Exception as e:
            app.logger.error(f"Error deleting session folder {session_upload_folder}: {e}")

    if session_id in active_sessions:
        del active_sessions[session_id]
        app.logger.info(f"Session {session_id} removed from active list.")

@app.route('/api/session/end', methods=['POST'])
def end_session():
    data = request.get_json()
    session_id = data.get('session_id')
    if session_id:
        end_session_and_cleanup(session_id)
        return jsonify({"success": True, "message": "Session ended and files cleaned up."})
    return jsonify({"success": False, "error": "Session ID is missing."}), 400

@app.route('/api/server_info', methods=['GET'])
def get_server_info():
    return jsonify({"local_ip": get_local_ip()})

@app.route('/api/check_uploads', methods=['GET'])
def check_uploads():
    session_id = request.args.get('sid')
    if not session_id:
        return jsonify({"error": "Session ID is missing"}), 400
    session_upload_folder = os.path.join(UPLOAD_FOLDER, session_id)
    uploaded_files = []
    if os.path.exists(session_upload_folder):
        for filename in os.listdir(session_upload_folder):
            path = os.path.join(session_upload_folder, filename)
            if os.path.isfile(path):
                uploaded_files.append({
                    "name": filename,
                    "path": os.path.abspath(path)
                })
    return jsonify(uploaded_files)

# --- MODIFIED: Drive Detection for Raspberry Pi and Windows ---
@app.route('/api/drives', methods=['GET'])
def get_drives():
    drives = []
    current_os = platform.system().lower()

    for part in psutil.disk_partitions(all=False):
        try:
            if part.fstype in ['squashfs', 'tmpfs', 'devtmpfs', 'zfs']:
                continue

            show_this_drive = False

            if DEBUG_SHOW_ALL_DRIVES:
                show_this_drive = True
            else:
                if current_os == "windows":
                    if 'removable' in part.opts or ('fixed' in part.opts and not part.device.upper().startswith('C:')):
                        show_this_drive = True
                else: # Linux/Raspberry Pi
                    if part.mountpoint.startswith(('/media', '/mnt', '/run/media')):
                        show_this_drive = True

            if show_this_drive:
                label = ""
                if current_os == "windows":
                    label = get_drive_label_windows(part.device)
                
                if not label:
                    label = os.path.basename(part.mountpoint)

                drives.append({
                    "path": part.mountpoint,
                    "label": label or part.device,
                })
        except Exception as e:
            app.logger.warning(f"Could not process partition {part.device}: {e}")
            continue

    return jsonify(drives)

@app.route('/api/list_path', methods=['GET'])
def list_path_contents():
    path_param = request.args.get('path')
    if not path_param or not os.path.isdir(path_param):
        return jsonify({"error": "Invalid or missing path"}), 400
    items = []
    supported_extensions = ('.pdf', '.docx', '.xlsx')
    try:
        for item_name in os.listdir(path_param):
            full_path = os.path.join(path_param, item_name)
            item_type = "folder" if os.path.isdir(full_path) else "file"
            if item_type == "folder" or item_name.lower().endswith(supported_extensions):
                size = os.path.getsize(full_path) if item_type == 'file' else None
                mime, _ = mimetypes.guess_type(full_path)
                items.append({
                    "name": item_name, "path": full_path, "type": item_type,
                    "size": size, "mime_type": mime or "application/octet-stream"
                })
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    parent = os.path.dirname(path_param) if path_param != os.path.dirname(path_param) else None
    return jsonify({"current_path": path_param, "parent_path": parent, "items": items})

@app.route('/api/get_file_blob', methods=['GET'])
def get_file_blob():
    path_param = request.args.get('path')
    if not path_param or ".." in path_param or not os.path.isabs(path_param):
        return jsonify({"error": "Invalid file path"}), 400
    if not os.path.exists(path_param) or not os.path.isfile(path_param):
        abort(404, description="File not found.")
    try:
        return send_file(path_param)
    except Exception as e:
        abort(500, description=str(e))

@app.route('/api/analyze', methods=['POST'])
def analyze_file_route():
    if 'file' not in request.files: return jsonify({"error": "No file part"}), 400
    file = request.files['file']
    if file.filename == '': return jsonify({"error": "No selected file"}), 400

    settings_json = request.form.get('settings')
    settings = json.loads(settings_json) if settings_json else None

    if not file.filename.lower().endswith('.pdf'):
        with tempfile.NamedTemporaryFile(delete=False, suffix=os.path.splitext(file.filename)[1]) as temp_file:
            file.save(temp_file.name)
            temp_file_path = temp_file.name
        
        pdf_path, error = convert_to_pdf_internal(temp_file_path)
        os.remove(temp_file_path)

        if error:
            return jsonify({"error": error}), 500
        
        with open(pdf_path, 'rb') as pdf_file_stream:
            analysis_result, error_message = process_pdf_stream(pdf_file_stream, settings)
    else:
        analysis_result, error_message = process_pdf_stream(file, settings)

    if error_message: return jsonify({"error": error_message}), 500
    return jsonify(analysis_result), 200

def convert_to_pdf_internal(original_path):
    soffice_cmd = "soffice"
    if platform.system() == "Windows" and not shutil.which(soffice_cmd):
        windows_path = r"C:\Program Files\LibreOffice\program\soffice.exe"
        if os.path.exists(windows_path):
            soffice_cmd = windows_path
        else:
            app.logger.error("LibreOffice (soffice) not found in system PATH or default location.")
            return None, "File conversion utility is not available on the server."

    base_name = os.path.basename(original_path)
    pdf_filename = f"{os.path.splitext(base_name)[0]}.pdf"
    converted_pdf_path = os.path.join(CONVERSION_CACHE_FOLDER, pdf_filename)

    if os.path.exists(converted_pdf_path):
        return converted_pdf_path, None

    try:
        command = [
            soffice_cmd, "--headless", "--convert-to", "pdf",
            "--outdir", CONVERSION_CACHE_FOLDER, original_path
        ]
        app.logger.info(f"Running conversion command: {' '.join(command)}")
        subprocess.run(command, check=True, timeout=30)

        if os.path.exists(converted_pdf_path):
            return converted_pdf_path, None
        else:
            return None, "Conversion failed. Output file not found."

    except subprocess.CalledProcessError as e:
        app.logger.error(f"LibreOffice conversion failed with error: {e}")
        return None, "An error occurred during file conversion."
    except subprocess.TimeoutExpired:
        app.logger.error("LibreOffice conversion timed out.")
        return None, "File conversion took too long."

@app.route('/api/convert_to_pdf', methods=['POST'])
def convert_to_pdf_route():
    data = request.get_json()
    original_path = data.get('path')
    if not original_path or not os.path.exists(original_path):
        return jsonify({"error": "File not found at the specified path."}), 404
    
    pdf_path, error = convert_to_pdf_internal(original_path)
    if error:
        return jsonify({"error": error}), 500
    
    return jsonify({"pdf_path": pdf_path})
def parse_page_range_string(range_str, max_pages):
    if not range_str:
        return list(range(max_pages))
    
    pages = set()
    parts = range_str.split(',')
    for part in parts:
        part = part.strip()
        if '-' in part:
            try:
                start, end = map(int, part.split('-'))
                
                # --- KEY CHANGE: Validate the page range order ---
                if start > end:
                    raise ValueError(f"Start page ({start}) cannot be greater than end page ({end}).")
                
                for i in range(start, end + 1):
                    if 1 <= i <= max_pages:
                        pages.add(i - 1)
            except ValueError as e:
                # This makes sure our specific error is passed up
                if "cannot be greater than" in str(e):
                    raise e
                continue # Ignore other errors like '1-a'
        else:
            try:
                page = int(part)
                if 1 <= page <= max_pages:
                    pages.add(page - 1)
            except ValueError:
                continue
    return sorted(list(pages))

def extract_pages_to_new_pdf(source_pdf_path, page_numbers_to_keep):
    source_doc = None
    try:
        source_doc = fitz.open(source_pdf_path)
        
        if not page_numbers_to_keep:
            return None, "Page range is invalid or empty."

        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".pdf", dir=CONVERSION_CACHE_FOLDER)
        temp_file_path = temp_file.name
        temp_file.close()

        source_doc.select(page_numbers_to_keep)
        source_doc.save(temp_file_path, garbage=4, deflate=True)
        
        return temp_file_path, None

    except Exception as e:
        app.logger.error(f"Failed to extract pages from PDF: {e}")
        return None, str(e)
    finally:
        if source_doc:
            source_doc.close()

# --- MODIFIED: Print request handler with safe change dispensing ---
@app.route('/api/print', methods=['POST'])
def handle_print_request():
    data = request.get_json()
    files_to_print = data.get('files_to_print', [])
    user_id = data.get('user_id')
    total_cost = data.get('total_cost')
    amount_paid = data.get('amount_paid')
    change_due = data.get('change_due')
    session_id = data.get('session_id')
    
    if not user_id or total_cost is None or amount_paid is None or change_due is None or not files_to_print:
        return jsonify({"error": "Transaction or file data is missing or invalid."}), 400

    successful_prints, failed_prints = [], []
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed."}), 500
    cursor = conn.cursor()
    last_job_id = None
    temp_files_to_clean = []

    for file_info in files_to_print:
        original_path = file_info.get('path')
        cost = file_info.get('cost')
        settings = file_info.get('settings')
        page_range_str = settings.get('pageRange', '').strip()


        if not os.path.exists(original_path):
            failed_prints.append({"path": original_path, "error": "File not found."})
            continue

        path_to_print = original_path
        
        if not original_path.lower().endswith('.pdf'):
            pdf_path, error = convert_to_pdf_internal(original_path)
            if error:
                failed_prints.append({"path": original_path, "error": f"Conversion failed: {error}"})
                continue
            path_to_print = pdf_path
        
        if page_range_str:
            try:
                with fitz.open(path_to_print) as doc:
                    max_pages = doc.page_count
                page_list = parse_page_range_string(page_range_str, max_pages)
                if page_list:
                    temp_pdf_path, error = extract_pages_to_new_pdf(path_to_print, page_list)
                    if error:
                        failed_prints.append({"path": original_path, "error": f"Page extraction failed: {error}"})
                        continue
                    path_to_print = temp_pdf_path
                    temp_files_to_clean.append(temp_pdf_path)
                else:
                    failed_prints.append({"path": original_path, "error": "Invalid page range specified."})
                    continue
            except Exception as e:
                failed_prints.append({"path": original_path, "error": f"Could not process page range: {e}"})
                continue
        pages_to_print_count = file_info.get('pages') 

        printed = False
        printer_name = SYSTEM_SETTINGS.get('default_printer_name')
        
        if platform.system().lower() == "windows":
            printed = print_file_windows(path_to_print, printer_name, settings)
        else:
            printed = print_file_linux_cups(path_to_print, printer_name, settings)
        
        if printed:
            successful_prints.append(original_path)
            try:
                doc_name = os.path.basename(original_path)
                cursor.execute(
                    "INSERT INTO print_jobs (user_id, session_id, document_name, pages, status, cost) VALUES (%s, %s, %s, %s, %s, %s)",
                    (user_id, session_id, doc_name, pages_to_print_count, 'sent_to_printer', cost)
                )
                last_job_id = cursor.lastrowid
                conn.commit()
            except Error as e:
                conn.rollback()
                app.logger.error(f"DB log error for print job: {e}")
        else:
            failed_prints.append({"path": original_path, "error": "Print command failed."})

    transaction_successful = len(successful_prints) > 0

    if transaction_successful:
        try:
            cursor.execute(
                "INSERT INTO transactions (job_id, session_id, total_cost, amount_paid, change_due, successful) VALUES (%s, %s, %s, %s, %s, %s)",
                (last_job_id, session_id, total_cost, amount_paid, change_due, 1)
            )
            conn.commit()
            app.logger.info(f"Transaction for session {session_id} logged successfully.")
            
            if IS_RASPBERRY_PI and change_due > 0:
                app.logger.info(f"Dispensing {change_due} coin(s) for successful transaction.")
                dispense_change(int(round(change_due)))

        except Error as e:
            conn.rollback()
            app.logger.error(f"CRITICAL: Files printed but transaction failed to save. Error: {e}")
    else:
        app.logger.warning(f"All print jobs failed for session {session_id}. No change will be dispensed.")
        try:
            cursor.execute(
                "INSERT INTO transactions (job_id, session_id, total_cost, amount_paid, change_due, successful) VALUES (%s, %s, %s, %s, %s, %s)",
                (None, session_id, total_cost, amount_paid, 0, 0)
            )
            conn.commit()
        except Error as e:
            conn.rollback()
            app.logger.error(f"Failed to log the FAILED transaction. Error: {e}")

        create_refund_request(
            job_id=None,
            user_id=user_id,
            session_id=session_id,
            amount=amount_paid,
            reason="Automatic refund: All print jobs in the transaction failed."
        )

    cursor.close()
    conn.close()

    for f in temp_files_to_clean:
        try:
            if os.path.exists(f):
                os.remove(f)
        except Exception as e:
            app.logger.error(f"Could not clean up temporary file {f}: {e}")

    return jsonify({"successful_prints": successful_prints, "failed_prints": failed_prints, "last_job_id": last_job_id})

@app.route('/api/report_issue', methods=['POST'])
def report_issue():
    data = request.get_json()
    job_id = data.get('job_id')
    error_type = data.get('error_type')
    description = data.get('description')
    user_id = data.get('user_id')
    session_id = data.get('session_id')
    if not description or not error_type:
        return jsonify({"error": "Error type and description are required."}), 400
    conn = get_db_connection()
    if not conn: return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO error_reports (job_id, user_id, session_id, error_type, description, status) VALUES (%s, %s, %s, %s, %s, 'unresolved')",
            (job_id, user_id, session_id, error_type, description)
        )
        conn.commit()
        return jsonify({"success": True, "message": "Issue reported successfully."})
    except Error as e:
        conn.rollback()
        app.logger.error(f"Error reporting issue: {e}")
        return jsonify({"error": "Failed to report issue."}), 500
    finally:
        cursor.close()
        conn.close()

def analyze_color_pixels(pixmap, tolerance=10, sample_rate=4):
    pixels = pixmap.samples
    width, height, channels = pixmap.width, pixmap.height, pixmap.n
    color_pixels_count, total_sampled_pixels = 0, 0
    if channels < 3: return 0.0
    for y in range(0, height, sample_rate):
        for x in range(0, width, sample_rate):
            idx = (y * width + x) * channels
            if idx + 2 >= len(pixels): continue
            r, g, b = pixels[idx], pixels[idx+1], pixels[idx+2]
            is_white = (r > 255 - tolerance*2) and (g > 255 - tolerance*2) and (b > 255 - tolerance*2)
            is_grayscale = abs(r - g) <= tolerance and abs(r - b) <= tolerance and abs(g - b) <= tolerance
            if not (is_grayscale or is_white): color_pixels_count += 1
            total_sampled_pixels += 1
    if total_sampled_pixels == 0: return 0.0
    return round((color_pixels_count / total_sampled_pixels) * 100, 2)

def calculate_payment_from_db(color_percent):
    conn = get_db_connection()
    if not conn:
        return 10.00 if color_percent > 0.1 else 3.00

    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT cost FROM pricing WHERE min_color_percent <= %s AND max_color_percent >= %s",
            (color_percent, color_percent)
        )
        tier = cursor.fetchone()

        if not tier:
            app.logger.warning(f"Pricing tier not found for color_percent: {color_percent}. Using fallback.")
            return 10.00 if color_percent > 0.1 else 3.00
            
        return float(tier['cost'])
    except Error as e:
        app.logger.error(f"Database error while fetching price: {e}")
        return 10.00 if color_percent > 0.1 else 3.00
    finally:
        cursor.close()
        conn.close()

def process_pdf_stream(file_stream, settings=None):
    try:
        pdf_doc = fitz.open(stream=file_stream.read(), filetype="pdf")
    except Exception as e:
        return None, f"Error opening PDF: {e}"
    
    page_costs = []
    
    force_bw = settings and settings.get('colorMode') == 'bw'

    for page in pdf_doc:
        color_percent = 0 if force_bw else analyze_color_pixels(page.get_pixmap())
        page_cost = calculate_payment_from_db(color_percent)
        page_costs.append(page_cost)
        
    return {
        "pageCount": pdf_doc.page_count,
        "page_costs": page_costs
    }, None

def print_file_windows(filepath, printer_name=None, settings=None):
    sumatra_path = SYSTEM_SETTINGS.get('sumatra_pdf_path')
    if not sumatra_path or not os.path.exists(sumatra_path):
        app.logger.error(f"SumatraPDF not found at configured path: '{sumatra_path}'. Cannot print.")
        return False
    try:
        command = [sumatra_path]
        
        if printer_name:
            command.extend(["-print-to", printer_name])
        else:
            command.append("-print-to-default")

        if settings:
            print_settings = []
            # --- Restored paperSize setting ---
            if settings.get('paperSize'):
                print_settings.append(f"paper={settings['paperSize']}")
            if settings.get('colorMode') == 'bw':
                print_settings.append("monochrome")
            
            if print_settings:
                command.extend(["-print-settings", ",".join(print_settings)])

        command.extend(["-silent", filepath])
        
        app.logger.info(f"Executing print command: {' '.join(command)}")
        subprocess.run(command, check=True, capture_output=True, text=True)
        return True
    except subprocess.CalledProcessError as e:
        app.logger.error(f"SumatraPDF print command failed for '{filepath}'. Return code: {e.returncode}")
        app.logger.error(f"Stdout: {e.stdout}")
        app.logger.error(f"Stderr: {e.stderr}")
        return False
    except Exception as e:
        app.logger.error(f"An unexpected error occurred during printing for '{filepath}': {e}")
        return False


def print_file_linux_cups(filepath, printer_name=None, settings=None):
    try:
        command = ["lp"]
        
        if printer_name:
            command.extend(["-d", printer_name])

        if settings:
            # --- Restored paperSize setting ---
            if settings.get('paperSize'):
                command.extend(["-o", f"media={settings['paperSize']}"])
            if settings.get('colorMode') == 'bw':
                command.extend(["-o", "ColorModel=KGray"])

        command.append(filepath)
        
        app.logger.info(f"Executing print command: {' '.join(command)}")
        subprocess.run(command, check=True)
        return True
    except Exception as e:
        app.logger.error(f"Linux CUPS print error: {e}")
        return False

def coin_event_stream():
    """A generator function that yields coin insertion events."""
    global coin_listener_active
    if not IS_RASPBERRY_PI:
        yield "data: {\"error\": \"Not running on Raspberry Pi\"}\n\n"
        return

    last_state = GPIO.input(COIN_PIN)
    while coin_listener_active:
        current_state = GPIO.input(COIN_PIN)
        if last_state == GPIO.HIGH and current_state == GPIO.LOW:
            yield "data: {\"coins\": 1}\n\n"
            time.sleep(DEBOUNCE_TIME)
        last_state = current_state
        time.sleep(0.01)

@app.route('/api/payment/listen', methods=['GET'])
def listen_for_coins():
    """Starts the coin listener and streams events to the client."""
    global coin_listener_active
    coin_listener_active = True
    return Response(coin_event_stream(), mimetype='text/event-stream')

@app.route('/api/payment/stop', methods=['POST'])
def stop_listening_for_coins():
    """Stops the coin listener."""
    global coin_listener_active
    coin_listener_active = False
    return jsonify({"success": True, "message": "Stopped listening for coins."})

def dispense_change(coins_to_dispense):
    """Activates the coin hopper to dispense a specific number of coins."""
    if not IS_RASPBERRY_PI or coins_to_dispense <= 0:
        return
    
    app.logger.info(f"Dispensing {coins_to_dispense} coin(s)...")
    GPIO.output(RELAY_PIN, GPIO.HIGH) # Turn ON hopper relay
    
    dispensed_count = 0
    last_state = GPIO.input(SENSOR_PIN)
    
    start_time = time.time()
    timeout_seconds = 10 + (coins_to_dispense * 2)

    while dispensed_count < coins_to_dispense:
        if time.time() - start_time > timeout_seconds:
            app.logger.error("Dispense change timed out. Hopper may be empty or jammed.")
            break

        current_state = GPIO.input(SENSOR_PIN)
        if last_state == GPIO.HIGH and current_state == GPIO.LOW:
            dispensed_count += 1
            app.logger.info(f"Dispensed coin #{dispensed_count}")
            time.sleep(DEBOUNCE_TIME)
        last_state = current_state
        time.sleep(0.005)
        
    GPIO.output(RELAY_PIN, GPIO.LOW)
    app.logger.info("Finished dispensing change.")
# This maps database columns to user-friendly names and formats.
REPORT_COLUMNS = {
    'transactions': {
        'id': {'name': 'ID', 'format': 'number'},
        'total_cost': {'name': 'Total Cost', 'format': 'currency'},
        'amount_paid': {'name': 'Amount Paid', 'format': 'currency'},
        'change_due': {'name': 'Change Due', 'format': 'currency'},
        'change_status': {'name': 'Change Status', 'format': 'string'},
        'successful': {'name': 'Successful', 'format': 'boolean'},
        'created_at': {'name': 'Date', 'format': 'datetime'},
        'session_id': {'name': 'Session ID', 'format': 'string'},
    },
    'print_jobs': {
        'id': {'name': 'ID', 'format': 'number'},
        'document_name': {'name': 'Document Name', 'format': 'string'},
        'cost': {'name': 'Cost', 'format': 'currency'},
        'status': {'name': 'Status', 'format': 'string'},
        'submitted_at': {'name': 'Date', 'format': 'datetime'},
        'user_id': {'name': 'User ID', 'format': 'number'},
    },
    'donations': {
        'id': {'name': 'ID', 'format': 'number'},
        'amount': {'name': 'Amount', 'format': 'currency'},
        'donated_at': {'name': 'Date', 'format': 'datetime'},
        'session_id': {'name': 'Session ID', 'format': 'string'},
    },
    'users': {
        'id': {'name': 'ID', 'format': 'number'},
        'student_id': {'name': 'Student ID', 'format': 'string'},
        'full_name': {'name': 'Full Name', 'format': 'string'},
        'department': {'name': 'Department', 'format': 'string'},
        'course': {'name': 'Course', 'format': 'string'},
        'created_at': {'name': 'Registration Date', 'format': 'datetime'},
    }
}

def format_report_data(rows, table_name):
    """Formats raw database rows into a user-friendly structure."""
    formatted_rows = []
    column_map = REPORT_COLUMNS.get(table_name, {})
    
    for row in rows:
        formatted_row = {}
        for key, value in row.items():
            col_info = column_map.get(key)
            if col_info:
                new_key = col_info['name']
                format_type = col_info['format']
                
                if format_type == 'currency' and value is not None:
                    formatted_row[new_key] = f"₱{value:.2f}"
                elif format_type == 'boolean':
                    formatted_row[new_key] = "Yes" if value else "No"
                elif format_type == 'datetime' and value is not None:
                    formatted_row[new_key] = value.strftime('%b %d, %Y %I:%M %p')
                else:
                    formatted_row[new_key] = value
        formatted_rows.append(formatted_row)
    return formatted_rows

# --- NEW: Report Generation Endpoint ---
@app.route('/api/admin/reports', methods=['POST'])
def generate_report():
    if not is_admin_logged_in():
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    report_type = data.get('report_type')
    start_date = data.get('start_date')
    end_date = data.get('end_date')
    department = data.get('department') # Get the new department filter

    if not all([report_type, start_date, end_date]):
        return jsonify({"error": "Missing report parameters"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor(dictionary=True)
    
    # Base query parts
    query = ""
    summary_query = ""
    summary_title = ""
    table_name = ""
    date_column = "created_at"

    if report_type == 'sales':
        table_name = 'transactions'
        query = "SELECT * FROM transactions WHERE successful = 1 AND created_at BETWEEN %s AND %s ORDER BY created_at DESC"
        summary_query = "SELECT SUM(total_cost) as total FROM transactions WHERE successful = 1 AND created_at BETWEEN %s AND %s"
        summary_title = "Total Revenue"
    elif report_type == 'donations':
        table_name = 'donations'
        date_column = 'donated_at'
        query = f"SELECT * FROM donations WHERE {date_column} BETWEEN %s AND %s ORDER BY {date_column} DESC"
        summary_query = f"SELECT SUM(amount) as total FROM donations WHERE {date_column} BETWEEN %s AND %s"
        summary_title = "Total Donations"
    elif report_type == 'print_jobs':
        table_name = 'print_jobs'
        date_column = 'submitted_at'
        query = f"SELECT * FROM print_jobs WHERE {date_column} BETWEEN %s AND %s ORDER BY {date_column} DESC"
        summary_query = f"SELECT COUNT(*) as total FROM print_jobs WHERE {date_column} BETWEEN %s AND %s"
        summary_title = "Total Print Jobs"
    elif report_type == 'users':
        table_name = 'users'
        params = [start_date, f"{end_date} 23:59:59"]

        query = "SELECT id, student_id, full_name, department, course, created_at FROM users WHERE role = 'user' AND created_at BETWEEN %s AND %s"
        summary_query = "SELECT COUNT(*) as total FROM users WHERE role = 'user' AND created_at BETWEEN %s AND %s"

        if department and department != 'all':
            query += " AND department = %s"
            summary_query += " AND department = %s"
            params.append(department)

        query += " ORDER BY created_at DESC"
        summary_title = "Total Users Found"
    # --- END NEW BLOCK ---
    else:
        return jsonify({"error": "Invalid report type"}), 400
  

    try:
        # Fetch main data
        cursor.execute(query, (start_date, f"{end_date} 23:59:59"))
        rows = cursor.fetchall()
        
        # Fetch summary data
        cursor.execute(summary_query, (start_date, f"{end_date} 23:59:59"))
        summary_result = cursor.fetchone()
        total = summary_result.get('total', 0) if summary_result else 0
        
        # Format the data for the frontend
        formatted_data = format_report_data(rows, table_name)
        headers = [col['name'] for col in REPORT_COLUMNS[table_name].values()] if formatted_data else []

        summary = {
            "title": summary_title,
            "value": f"₱{total:.2f}" if 'Cost' in summary_title or 'Revenue' in summary_title or 'Donations' in summary_title else int(total)
        }

        return jsonify({
            "headers": headers,
            "data": formatted_data,
            "summary": summary
        })

    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/admin/refund_requests/<int:request_id>/status', methods=['POST'])
def update_refund_status(request_id):
    if not is_admin_logged_in():
        return jsonify({"error": "Unauthorized"}), 401

    data = request.get_json()
    new_status = data.get('status')

    if not new_status or new_status not in ['pending', 'approved', 'rejected']:
        return jsonify({"error": "Invalid status provided"}), 400

    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE refund_requests SET status = %s WHERE id = %s",
            (new_status, request_id)
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"error": "Refund request not found"}), 404
        
        return jsonify({"success": True, "message": "Status updated successfully."})

    except Error as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
    
@app.route('/api/admin/departments', methods=['GET'])
def get_departments():
    if not is_admin_logged_in():
        return jsonify({"error": "Unauthorized"}), 401
    conn = get_db_connection()
    if not conn:
        return jsonify({"error": "Database connection failed"}), 500
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch unique, non-empty department names
        cursor.execute("SELECT DISTINCT department FROM users WHERE department IS NOT NULL AND department != '' ORDER BY department ASC")
        departments = [row['department'] for row in cursor.fetchall()]
        return jsonify(departments)
    except Error as e:
        return jsonify({"error": str(e)}), 500
    finally:
        cursor.close()
        conn.close()
        
# --- Main Execution Block ---
if __name__ == '__main__':
    with app.app_context():
        load_system_settings()
    
    app.run(host='0.0.0.0', port=5000, debug=True)
