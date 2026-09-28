# Printables Kiosk System

## Overview

Printables is a full-stack self-service printing kiosk application that allows users to print documents from a USB flash drive or through Wi-Fi file uploads. It provides a simple, touch-friendly interface for end users and a secure, password-protected web administration panel for managing the system.

### Technologies Used

* **Backend:** Python (Flask)
* **Frontend:** Vanilla JavaScript
* **Database:** MySQL / MariaDB
* **Document Conversion:** LibreOffice
* **Printing**

  * Windows: SumatraPDF
  * Raspberry Pi/Linux: CUPS (`lp`)

---

# System Requirements

## Windows

Install the following software before running the application:

* Python 3.8 or later
* XAMPP (Apache & MySQL)
* LibreOffice
* SumatraPDF

## Raspberry Pi / Linux

Install the following software before running the application:

* Python 3.8 or later
* MySQL or MariaDB
* LibreOffice
* CUPS (Common Unix Printing System)
* A printer configured in CUPS

---

# Installation

## Step 1 – Clone the Repository

Clone or download this project into your preferred directory.

---

## Step 2 – Install Python Dependencies

Open a terminal in the project root.

### Windows

```bash
pip install -r requirements-windows.txt
```

### Raspberry Pi / Linux

```bash
pip install -r requirements-raspberrypi.txt
```

---

## Step 3 – Configure Environment Variables

Create a `.env` file in the project root (or copy `.env.example` if provided).

Example:

```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=
DB_NAME=print_system

FLASK_SECRET_KEY=your-secret-key
```

Update the values according to your MySQL or MariaDB configuration.

---

## Step 4 – Set Up the Database

### Windows

1. Open the **XAMPP Control Panel**.
2. Start **Apache** and **MySQL**.
3. Open **phpMyAdmin**.
4. Create a database named:

```
print_system
```

5. Import:

```
database/print_system.sql
```

### Raspberry Pi / Linux

1. Ensure MySQL or MariaDB is running.
2. Create a database named:

```
print_system
```

3. Import:

```
database/print_system.sql
```

---

# Running the Application

Open a terminal in the project directory and run:

```bash
python app.py
```

The Flask server will start automatically.

On the first launch, the application creates the default administrator account.

Open the kiosk in your browser:

```
http://127.0.0.1:5000
```

---

# Admin Panel

### Keyboard Shortcut

While on the kiosk interface, press:

```
Ctrl + Alt + A
```

### Direct URL

```
http://127.0.0.1:5000/admin
```

### Default Administrator Credentials

| Username | Password |
| -------- | -------- |
| admin    | rogie    |

> **Important:** Change the default administrator password after your first login.

---

# Notes

* Configure your database connection by editing the `.env` file.
* Windows deployments require **LibreOffice** and **SumatraPDF** for document conversion and silent printing.
* Raspberry Pi/Linux deployments require **LibreOffice**, **CUPS**, and a properly configured printer.
* Ensure your printer is installed and accessible before starting the kiosk.
* For production deployments, use a dedicated machine connected to the printer for optimal performance.

---

# Project Structure

```text
Printables/
├── app.py
├── .env
├── requirements.txt
├── requirements-windows.txt
├── requirements-raspberrypi.txt
├── database/
│   └── print_system.sql
├── static/
├── templates/
└── README.md
```
